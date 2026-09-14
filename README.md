# Meal Maker

Weekly meal planner that scores recipes against local grocery deals. Two parts:

- `backend/` — Express API (recipe optimizer, Flipp/OpenStreetMap deal scraper). Runs in a Docker container.
- `frontend/` — React/Vite UI, shipped three ways: as a web app (dev) and as native iOS and Android apps via Capacitor.

## Run the backend (Docker)

```bash
docker compose up -d --build        # builds backend/Dockerfile, starts on :3001
curl http://localhost:3001/api/health
docker compose logs -f api
docker compose down
```

Scraped sales are cached in the `sales_cache` named volume (`/data` inside the container), so restarts don't re-scrape. Configuration is by environment variable, all documented in `backend/.env.example`:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` / `HOST` | `3001` / `0.0.0.0` | Listen address |
| `CACHE_DIR` | `/data` in the image | Where sales/store lookups are cached |
| `DEFAULT_ZIP` | `64683` | ZIP used when a request omits one |
| `CORS_ORIGIN` | unset (allow all) | Comma-separated allowlist |
| `APP_VERSION` | `dev` | Echoed by `/api/health` |

The iOS and Android apps reach the container over HTTP on your LAN, so the container must be reachable from the phone. On a Mac, find the address with `ipconfig getifaddr en0`.

On OrbStack the container also gets automatic local domains, usable from the Mac only: `http://meal-maker-api.orb.local:3001` and `http://api.meal-plan-app.orb.local:3001`. Phones and tablets on the LAN still use the Mac's IP. For the API to survive a reboot, OrbStack must launch at login: `orb config set app.start_at_login true`.

To run the API without Docker: `cd backend && npm install && npm run dev`.

## Deploy the backend to AWS (App Runner)

One script builds the image for linux/amd64, pushes it to ECR, and creates or updates an App Runner service with an HTTPS URL. Needs the AWS CLI configured (`aws configure` or `aws sso login`) and Docker running.

```bash
API_KEY=$(openssl rand -hex 24) npm run deploy:aws     # first deploy — save the key
API_KEY=<same key> npm run deploy:aws                  # every later deploy
```

The service runs on the smallest instance (0.25 vCPU, 0.5 GB), health-checks `/api/health`, and requires the `X-Api-Key` header on every other route because the URL is public. The sales cache is per-instance and rebuilt after a deploy, which is fine for a 12-hour TTL. Files: `infra/aws/deploy.sh`, `infra/aws/apprunner-ecr-trust.json`.

To point the phone apps at it, set `VITE_API_URL` to the service URL and `VITE_API_KEY` to the key in `frontend/.env.native.local`, then `npm run ios:sync` and/or `npm run android:sync`. HTTPS to App Runner passes iOS App Transport Security and Android's network security config without any native change.

## Run the web UI (dev)

```bash
cd frontend && npm install && npm run dev      # http://localhost:5173, proxies /api → :3001
```

## Build the phone apps (Capacitor)

Both apps wrap the same web bundle. One env file tells that bundle where the backend lives: copy `frontend/.env.native.example` to `frontend/.env.native.local` (gitignored) and set `VITE_API_URL`. The file is only read by `vite build --mode native` (which `ios:sync` and `android:sync` run), so the web dev server keeps using the `/api` proxy. The URL is baked into the bundle at build time, so re-run the sync after any web change or after changing the URL.

| Where the app runs | `VITE_API_URL` |
|---|---|
| iOS Simulator | `http://localhost:3001` (shares the Mac's network) |
| Android Emulator | `http://10.0.2.2:3001` (the emulator's alias for the host Mac) |
| Physical phone, LAN container | `http://<LAN-IP-of-the-container-host>:3001` |
| Hosted backend | `https://...awsapprunner.com` plus `VITE_API_KEY` |

### iOS

Requirements: Xcode 15+ on macOS. CocoaPods is not needed; the project uses Swift Package Manager.

```bash
cd frontend && npm run ios:sync      # vite build --mode native + cap sync ios
npm run ios:open                     # opens ios/App/App.xcodeproj in Xcode
```

In Xcode pick a simulator or your iPhone and press Run. For a physical device, set your Team under Signing & Capabilities the first time.

### Android

Requirements: Android Studio (bundles the SDK and a JDK). `compileSdk`/`targetSdk` are 36 and `minSdk` is 24 (Android 7.0), set in `frontend/android/variables.gradle`. Gradle needs to know where the SDK is: Android Studio writes `frontend/android/local.properties` on first open, or set `ANDROID_HOME` (usually `~/Library/Android/sdk`).

```bash
cd frontend && npm run android:sync  # vite build --mode native + network config + cap sync android
npm run android:open                 # opens frontend/android in Android Studio
npm run android:run                  # or: sync, then build + install on a connected device/emulator
npm run android:apk                  # or: sync, then a sideloadable android/app/build/outputs/apk/debug/app-debug.apk
```

In Android Studio pick an emulator or your phone (USB debugging on) and press Run. Release builds need a signing key: Build → Generate Signed App Bundle in Android Studio.

### What the native wrappers change

- `frontend/capacitor.config.json` — app id `com.mealmakerpro.app`, web dir `dist`, dark background on both platforms, no automatic content inset on iOS (the header extends under the status bar and uses `env(safe-area-inset-top)`), and light status-bar icons on Android (`SystemBars.style`).
- `frontend/ios/App/App/Info.plist` — `NSAllowsLocalNetworking` so the app may call the container over plain HTTP on the LAN (everything else stays HTTPS-only), `NSLocalNetworkUsageDescription` for the iOS local-network prompt, and a light status-bar style.
- `frontend/scripts/android-network-config.mjs` — the Android counterpart: generates `network_security_config.xml` at sync time that permits plain HTTP only to `localhost`, `10.0.2.2` and the host in `VITE_API_URL`; everything else stays HTTPS-only. The generated file is gitignored, so always go through `android:sync`.
- `frontend/android/app/src/main/res/values/styles.xml` + `colors.xml` — the window behind the WebView is the app's dark brown, so the status-bar strip (which Capacitor pads the WebView below on Android 15+) and the launch splash match the header instead of AppCompat's default indigo.
- `frontend/assets/` — icon and splash sources (copied from the iOS artwork). `npx @capacitor/assets generate --android --iconBackgroundColor '#2a1a0e'` regenerates the launcher icons and splash drawables.
- `frontend/src/App.jsx` — API base URL from `VITE_API_URL`; header and toast respect safe-area insets; Android hardware back button closes the open modal, returns to the mode's home tab, then backgrounds the app instead of exiting it (`@capacitor/app`).
- `frontend/src/index.css` — safe-area padding, tap-highlight and text-size-adjust fixes, and a fixed pseudo-element background photo on touch devices because neither iOS WebKit nor Android WebView honours `background-attachment: fixed`.

## Repo scripts (root `package.json`)

```bash
npm run docker:up | docker:down | docker:logs | docker:build
npm run ios:sync | ios:open
npm run android:sync | android:open | android:run | android:apk
npm run dev            # backend + frontend web dev servers together
```
