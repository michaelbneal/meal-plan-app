#!/usr/bin/env bash
# Build the backend image, push it to ECR, and create or update the App Runner
# service. Idempotent: re-run it to ship a new version.
#
#   API_KEY=<secret> ./infra/aws/deploy.sh
#
# Env knobs: AWS_REGION (default: CLI config), APP_NAME (meal-maker-api),
#            TAG (git short sha), DEFAULT_ZIP (64683), CPU ("0.25 vCPU"), MEMORY ("0.5 GB")
set -euo pipefail
cd "$(dirname "$0")/../.."

# Local secrets (API_KEY, optional AWS_REGION). Created on first deploy; gitignored.
[ -f infra/aws/.env.local ] && set -a && . infra/aws/.env.local && set +a

APP_NAME=${APP_NAME:-meal-maker-api}
AWS_REGION=${AWS_REGION:-$(aws configure get region 2>/dev/null || true)}
: "${AWS_REGION:?AWS_REGION is not set and no default region is configured (aws configure)}"
: "${API_KEY:?API_KEY is required — the shared secret the iOS app sends as X-Api-Key}"
TAG=${TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)}
DEFAULT_ZIP=${DEFAULT_ZIP:-64683}
CPU=${CPU:-"0.25 vCPU"}
MEMORY=${MEMORY:-"0.5 GB"}

ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ECR="$ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com"
IMAGE="$ECR/$APP_NAME:$TAG"
export AWS_REGION

log() { printf '\n\033[1;33m▶ %s\033[0m\n' "$*"; }

log "1/5  ECR repository $APP_NAME"
aws ecr describe-repositories --repository-names "$APP_NAME" >/dev/null 2>&1 \
  || aws ecr create-repository --repository-name "$APP_NAME" --image-scanning-configuration scanOnPush=true >/dev/null
aws ecr get-login-password | docker login --username AWS --password-stdin "$ECR" >/dev/null

log "2/5  Build linux/amd64 image and push $IMAGE"
docker buildx build --platform linux/amd64 --load -t "$IMAGE" -t "$ECR/$APP_NAME:latest" backend
docker push "$IMAGE" >/dev/null
docker push "$ECR/$APP_NAME:latest" >/dev/null

log "3/5  IAM role so App Runner can pull from ECR"
ROLE="AppRunnerECRAccess-$APP_NAME"
if ! ROLE_ARN=$(aws iam get-role --role-name "$ROLE" --query Role.Arn --output text 2>/dev/null); then
  ROLE_ARN=$(aws iam create-role --role-name "$ROLE" \
    --assume-role-policy-document file://infra/aws/apprunner-ecr-trust.json \
    --query Role.Arn --output text)
  aws iam attach-role-policy --role-name "$ROLE" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess
  echo "   created $ROLE — waiting 12s for IAM propagation"; sleep 12
fi

log "4/5  App Runner service $APP_NAME"
SOURCE_CFG=$(mktemp)
cat > "$SOURCE_CFG" <<JSON
{
  "ImageRepository": {
    "ImageIdentifier": "$IMAGE",
    "ImageRepositoryType": "ECR",
    "ImageConfiguration": {
      "Port": "3001",
      "RuntimeEnvironmentVariables": {
        "PORT": "3001",
        "HOST": "0.0.0.0",
        "CACHE_DIR": "/data",
        "DEFAULT_ZIP": "$DEFAULT_ZIP",
        "API_KEY": "$API_KEY",
        "APP_VERSION": "$TAG"
      }
    }
  },
  "AutoDeploymentsEnabled": false,
  "AuthenticationConfiguration": { "AccessRoleArn": "$ROLE_ARN" }
}
JSON
SVC_ARN=$(aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='$APP_NAME'].ServiceArn | [0]" --output text)
if [ -z "$SVC_ARN" ] || [ "$SVC_ARN" = "None" ]; then
  SVC_ARN=$(aws apprunner create-service --service-name "$APP_NAME" \
    --source-configuration "file://$SOURCE_CFG" \
    --instance-configuration "Cpu=$CPU,Memory=$MEMORY" \
    --health-check-configuration Protocol=HTTP,Path=/api/health,Interval=10,Timeout=5,HealthyThreshold=1,UnhealthyThreshold=5 \
    --query Service.ServiceArn --output text)
  echo "   creating service"
else
  aws apprunner update-service --service-arn "$SVC_ARN" --source-configuration "file://$SOURCE_CFG" >/dev/null
  echo "   updating service"
fi
rm -f "$SOURCE_CFG"

log "5/5  Waiting for RUNNING"
for _ in $(seq 1 60); do
  STATUS=$(aws apprunner describe-service --service-arn "$SVC_ARN" --query Service.Status --output text)
  printf '   %s\r' "$STATUS"
  case "$STATUS" in
    RUNNING) break ;;
    CREATE_FAILED|DELETE_FAILED|DELETED) echo; echo "service ended in $STATUS"; exit 1 ;;
  esac
  sleep 10
done
URL="https://$(aws apprunner describe-service --service-arn "$SVC_ARN" --query Service.ServiceUrl --output text)"
echo
echo "Deployed $IMAGE"
echo "URL:     $URL"
echo "Health:  curl $URL/api/health"
echo "Auth:    curl -H 'x-api-key: \$API_KEY' \"$URL/api/ingredients\" | head -c 200"
echo
echo "iOS build: set VITE_API_URL=$URL and VITE_API_KEY in frontend/.env.ios.local, then npm run ios:sync"
