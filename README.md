# Meal Maker

Weekly meal planner that scores recipes against local grocery deals. Two parts:

- `backend/` — Express API (recipe optimizer, Flipp/OpenStreetMap deal scraper). Runs in a Docker container.
- `frontend/` — React/Vite UI, shipped two ways: as a web app (dev) and as a native iOS app via Capacitor.

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

The iOS app reaches the container over HTTP on your LAN, so the container must be reachable from the phone. On a Mac, find the address with `ipconfig getifaddr en0`.

On OrbStack the container also gets automatic local domains, usable from the Mac only: `http://meal-maker-api.orb.local:3001` and `http://api.meal-plan-app.orb.local:3001`. Phones and tablets on the LAN still use the Mac's IP. For the API to survive a reboot, OrbStack must launch at login: `orb config set app.start_at_login true`.

To run the API without Docker: `cd backend && npm install && npm run dev`.

## Run the web UI (dev)

```bash
cd frontend && npm install && npm run dev      # http://localhost:5173, proxies /api → :3001
```

## Build the iOS app (Capacitor)

Requirements: Xcode 15+ on macOS. CocoaPods is not needed; the project uses Swift Package Manager.

1. Tell the web bundle where the backend lives. Copy `frontend/.env.ios.example` to `frontend/.env.ios.local` (gitignored) and set:
   ```
   VITE_API_URL=http://<LAN-IP-of-the-container-host>:3001
   ```
   For the iOS Simulator, `http://localhost:3001` works because the simulator shares your Mac's network. This file is only read by `vite build --mode ios`, so the web dev server keeps using the `/api` proxy.
2. Build the bundle and copy it into the native project:
   ```bash
   cd frontend && npm run ios:sync      # vite build --mode ios + cap sync ios
   npm run ios:open                     # opens ios/App/App.xcodeproj in Xcode
   ```
3. In Xcode pick a simulator or your iPhone and press Run. For a physical device, set your Team under Signing & Capabilities the first time.

Re-run `npm run ios:sync` after any web change or after changing `VITE_API_URL`. The URL is baked into the bundle at build time.

### What the iOS wrapper changes

- `frontend/capacitor.config.json` — app id `com.mealmaker.app`, web dir `dist`, dark background, no automatic content inset (the header extends under the status bar and uses `env(safe-area-inset-top)`).
- `frontend/ios/App/App/Info.plist` — `NSAllowsLocalNetworking` so the app may call the container over plain HTTP on the LAN (everything else stays HTTPS-only), `NSLocalNetworkUsageDescription` for the iOS local-network prompt, and a light status-bar style.
- `frontend/src/index.css` — safe-area padding, tap-highlight and text-size-adjust fixes, and a fixed pseudo-element background photo because iOS WebKit ignores `background-attachment: fixed`.
- `frontend/src/App.jsx` — API base URL from `VITE_API_URL` (set per build mode, see above); header and toast respect safe-area insets.

## Repo scripts (root `package.json`)

```bash
npm run docker:up | docker:down | docker:logs | docker:build
npm run ios:sync | ios:open
npm run dev            # backend + frontend web dev servers together
```
