# Basin AI

Standalone Nuxt 3 chat workspace for the Basin AI product. Identity is
delegated to **Edafy Seek** (Keycloak); this repo never owns user
records or login forms.

## Architecture (in two lines)

- Browser hits a same-origin Nitro proxy at `/api/basin-ai/*`, which
  forwards to the FSM Assistant Azure container.
- After Phase 2: tokens arrive from Seek via a URL fragment hand-off
  (`/auth/handoff#access_token=…`); refresh goes back to Seek's Go API.

Canonical docs live in **Edafy Seek** (read-only). Open these under your local `<seek-repo>/docs/basin-ai/` checkout:

- `OVERVIEW.md` — decisions + two-repo split.
- `SETUP_AND_ARCHITECTURE.md` — bootstrap order, `/login` cold-start UX, Phase 2 checklist.
- `SPEC.md` — handoff contract, CORS, FSM JWT expectations.
- `SCAFFOLD.md` — reference snippets for auth files.

## Quick start (Phase 1 — standalone)

```bash
cp .env.example .env
npm install
npm run dev
```

The dev server listens on **http://localhost:3100**.

`NUXT_PUBLIC_AUTH_BYPASS=true` is on by default in `.env.example` so the
chat is reachable without a Seek session. Disable it as soon as Phase 2
hand-off is wired:

```bash
NUXT_PUBLIC_AUTH_BYPASS=false
```

The bypass only takes effect when `import.meta.dev` is true — production
builds always require a real session.

### Cold start (`/login`)

With bypass **off**, visiting `/` without tokens redirects to **`/login`**
(Basin-branded copy + **Sign in on Seek**). After Seek login, use the
dashboard sidebar **Basin AI** link so `/auth/handoff` receives the JWT
fragment (`SETUP_AND_ARCHITECTURE.md` §2.4).

Hand-off stores tokens in `sessionStorage` and decodes the access JWT
client-side to populate `useAuth().user` for `X-User-Id` / body fields
until the FSM API derives identity from `Authorization` only (`SPEC.md` §7).

## Smoke test

1. Open <http://localhost:3100>.
2. The chat shell renders ("Hi, I am Basin AI…").
3. Send a message — Network tab should show
   `POST /api/basin-ai/chat` returning `200` with a JSON body
   (no CORS error in the console).

If the FSM API rejects the request with `401`/`403` because no user is
attached, set `NUXT_PUBLIC_DEV_USER_ID` in `.env` to a Keycloak user id
the FSM API recognises.

## Project layout

```
app/
├── components/features/basin-ai/   chat UI (copied from Seek)
├── composables/                    useBasinAi, useAuth, useDarkMode
├── layouts/default.vue             Basin AI shell (copied)
├── middleware/auth.global.ts       gate routes; allowlist /auth/handoff, /login
├── pages/login.vue                 Seek sign-in entry (no password UI)
├── pages/index.vue                 chat workspace
├── pages/auth/handoff.vue          token hand-off from Seek
├── plugins/api.ts                  $fetch w/ Bearer + refresh
└── services/basinAi.ts             FSM Assistant client
server/api/basin-ai/[...path].ts    Nitro proxy → FSM container
nuxt.config.ts                      runtime config + Tailwind v4 plugin
```

## Phase 2 (link to Seek)

When you are ready to wire the hand-off, follow
`<seek-repo>/docs/basin-ai/SETUP_AND_ARCHITECTURE.md` §4. In short:

1. Allow this app's origin on Seek's `POST /auth/refresh` CORS list.
2. Set `NUXT_PUBLIC_BASIN_AI_APP_URL=http://localhost:3100` in Seek so
   its "Open Basin AI" button targets the new app.
3. Flip `NUXT_PUBLIC_AUTH_BYPASS=false` here.
