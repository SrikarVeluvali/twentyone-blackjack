# Twentyone

Multiplayer blackjack, made by **Srikar Veluvali**. Built with Next.js App Router, React, TypeScript, and Motion. All chips are virtual.

## Play

Create a private table, share its invite link or six-character code, configure the rules, and start. Each player begins with 5,000 chips. Play against the house or take turns as the dealer; bankrupt players are eliminated.

- Up to six seats, with zero to three computer opponents.
- Hit, stand, double down, and split (up to four hands). Natural blackjack pays 3:2; split 21 pays 1:1. Split aces receive one card each. The dealer stands on all 17s.
- Player dealers fund payouts. Wager limits reserve enough funds to cover wins and keep balances nonnegative.
- Turn timers, automatic minimum bets and stands, host transfer, and reconnection in the same browser tab.
- Responsive casino table, light/dark themes, readable controls, animated cards and chips, optional sound, and reduced-motion support. Crowded mobile tables and compact menus use pages and tabs.

The host advances rounds and can return to the lobby between hands. Disconnected seats remain available to reconnect; their turns time out automatically. Rooms are private by code, without accounts. Never use this app for real-money play.

## Local development

Use Node.js 22 and npm.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. Use another tab for a second player; each tab has its own seat credential. Friends on the same network can use your computer's LAN address if its firewall allows the port.

Without Redis credentials, a local development store writes to `.data/rooms/`. This fallback supports one Node.js process. To use shared storage locally, copy `.env.example` to `.env.local` and fill in the Redis REST URL and write token. Never commit credentials.

## Deploy on Vercel

1. Import the GitHub repository into Vercel. The included configuration selects Next.js, Node.js 22, and the Mumbai (`bom1`) function region.
2. In Vercel Storage, create or connect an Upstash Redis database near that region. Attach it to Production, Preview, and Development. The free plan works for small private games; keep paid auto-upgrades disabled if you want a fixed free tier.
3. Provide `KV_REST_API_URL` and `KV_REST_API_TOKEN` through the integration, or set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` manually. Use the write token. A raw `REDIS_URL` alone is insufficient.
4. Deploy. Git pushes trigger Vercel deployments once the Git integration is connected. Redeploy after changing environment variables.

Vercel deployments require Redis and fail clearly if it is missing. Production, preview, and development use separate key prefixes. Preview deployments share the preview namespace; set `ROOM_STORE_PREFIX` to a unique value if you need stronger isolation between individual previews.

To pull configured development credentials with the Vercel CLI:

```sh
npx vercel link
npx vercel env pull .env.local
```

## Architecture

`app/api/rooms/route.ts` authenticates seat credentials and accepts game actions. `lib/game.ts` owns the rules; clients poll room snapshots roughly once per second. Cryptographic randomness shuffles the shoe, and public snapshots exclude credentials, the shoe, and the unrevealed dealer card. Credentials live in browser session storage.

`lib/store.ts` applies actions through an optimistic transaction. Redis stores each room as one expiring JSON snapshot. A Lua compare-and-set commits only if the original snapshot is still current; conflicts reread and reapply the action. This prevents lost moves and duplicate wagers across Vercel instances. Native Redis REST requests preserve exact snapshot bytes without SDK auto-serialization. Unchanged polls do not rewrite the room. Rooms expire after 24 hours without game activity.

The database is the only external runtime service; the UI and game API run entirely in Next.js. Keep Redis credentials server-side. Polling and game actions consume the provider's request allowance, so monitor usage as traffic grows.

## Checks

```sh
npm test                    # Game rules and concurrent storage transactions
npm run build
npm run typecheck
npm run format:check
npm start                   # In a separate terminal before the API test
npm run test:integration     # Two player sessions, both dealer modes, three rounds
npm run test:redis           # Optional live Redis checks using .env.local
```

Set `TEST_URL` to test a deployed site. The smoke test creates temporary private rooms, plays with virtual chips, and leaves both seats. Redis tests use unique test keys and delete them afterward. GitHub Actions runs formatting, game/storage tests, a production build, type checking, and the local multiplayer API smoke test.

Use `npm run format` before committing. Generated builds, local rooms, credentials, screenshots, and deployment metadata are excluded from Git.

Fonts are self-hosted DM Sans under the SIL Open Font License, included in `public/fonts/OFL.txt`. Source code is proprietary (`UNLICENSED`).
