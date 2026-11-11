# 0010: Private satellite relay backend for the household

## Status
Superseded by 0011 (2026-11-11). The user replaced the archive and private-relay plan with a multi-environment player for official YouTube embeds; see `0011-environment-player.md`. Nothing in this ADR was built. Kept for the record.

Previously: Accepted (2026-11-11). Implementation starts after the `v1.0` tag, on the v2 branch (ADR 0009). Package versions are chosen at implementation time from current releases, not from this document.

## Context
The user decided that the household gets a private, login-only backend:
- it runs on the user's own always-on machine, next to an existing SAT>IP box or PC tuner;
- it relays DD Free Dish (India) free-to-air channels as HLS, for personal viewing only;
- it is reachable only on the home network or over a private VPN, and never from the public internet.

The public build must contain no relay code, and the private build is a separate deployment target.

Constraints that shape the design:

| Constraint | Detail |
|---|---|
| Browsers | Cannot play raw MPEG-TS, MPEG-2 video or MP2 audio. Free-to-air SD channels are commonly MPEG-2 or H.264, 576i interlaced, with MP2 or AC-3 audio (to be confirmed by the user's channel scan). So the relay must deinterlace, transcode or remux to H.264 and AAC, and package HLS |
| Tuners | A tuner receives one transponder at a time, so concurrent viewers on different transponders compete for tuners |
| Secure context | Secure cookies and a trusted HTTPS certificate are needed on a private network |
| Public repo | The repo (`Patlu29/transmission-pending-tv`) is public. Relay source code may be public; addresses, hostnames, credentials and keys must never be. Security must not depend on the code being secret |
| v1 facts | The strict fact pipeline and the v1 intro must stay unaffected (ADR 0009, section 8) |
| Rights | Personal viewing only: no recording (V2-FR-19), no public exposure, no decryption of encrypted services |

## Decision

### 1. Topology

```text
household device (browser with Tailscale)
   |  HTTPS  https://<box-name>.<tailnet>.ts.net   (Tailscale-issued certificate)
   v
tailscale serve (on the box, tailnet only; Funnel is never enabled)
   |  http://127.0.0.1:8080
   v
relay (Node + Fastify)  ---------------------------------------------.
   |- /            private frontend build (dist-relay/)               |
   |- /api/*       auth, sessions, channel list, tune, admin          |
   '- /hls/*       session check, then proxy to MediaMTX              |
                       |  http://127.0.0.1:8888 (HLS, loopback only)   |
                       v                                              |
                MediaMTX  -- runOnDemand -->  ffmpeg                  |
                                               |  pulls MPEG-TS        |
                                               v                      |
                                  Tvheadend 127.0.0.1:9981  <--- relay calls its API for the channel list
                                       |
                    SAT>IP client (RTSP/RTP to the box on the LAN)  or  /dev/dvb (USB/PCIe tuner)
```

Every service listens on `127.0.0.1` only. The single way in is `tailscale serve` on the tailnet interface. There is no router port forwarding, no Funnel and no LAN listener.

### 2. Backend stack

| Component | Choice | Why | Rejected |
|---|---|---|---|
| Tuner manager | **Tvheadend** | One interface for both tuner kinds (SAT>IP client or a local DVB device), channel scan, tuner arbitration and an HTTP MPEG-TS stream per channel. Its DVR is disabled | Talking SAT>IP RTSP directly: two code paths, and our own tuner arbitration |
| Packager | **MediaMTX** | Starts and stops ffmpeg per channel path when the first viewer arrives or the last leaves, freeing the tuner. Muxes low-latency HLS. Stays internal | ffmpeg writing HLS on its own: we would own lifecycle, cleanup and concurrency |
| Transcoder | **ffmpeg** (launched by MediaMTX) | Deinterlace (`yadif` or hardware); MPEG-2 to H.264 (hardware VAAPI or Quick Sync through `/dev/dri` if present, otherwise software `libx264 -preset veryfast` at SD); H.264 sources remux the video; audio to AAC 96 kbps. Segments in RAM (`tmpfs`), rolling window under 60 s, no recording | |
| API, auth, proxy | **Node (version from `.nvmrc`) + Fastify (current major)**, TypeScript run with Node type stripping like `scripts/` | Team default backend (3d-tech-stack skill); same language, linting and types as the frontend; shares the channel types | Go: a second toolchain for a small service |
| Fastify plugins | `@fastify/cookie`, `@fastify/rate-limit`, `@fastify/static`, `@fastify/reply-from` (HLS proxy), `@fastify/helmet` (headers) | Maintained, official plugins. Each is recorded in `docs/api.md` with the reason, per the dependency rule | |
| Storage | SQLite file in a named volume (`server/data/`, gitignored): users and sessions | One household, a few rows; no database server. Prefer the built-in `node:sqlite` if it is stable on the pinned Node, otherwise `better-sqlite3` (backend-developer checks) | Postgres: needless operations work |
| Password hashing | Argon2id: Node's built-in `crypto.argon2` if available on the pinned Node, otherwise `@node-rs/argon2` (prebuilt, no compiler) | auth-patterns skill | bcrypt (fallback only) |

Latency targets: about 2 to 5 s from tuning to picture with low-latency HLS; a channel change takes 2 to 6 s (retune, lock, first keyframe, first segment). The frontend shows `TUNING...` throughout (ADR 0009, section 7).

### 3. Authentication and authorisation (auth-patterns conventions)
- **Provider:** a managed identity provider was considered and rejected. The service runs only on a private network, a cloud provider would add internet callbacks and a third party, and the household is a handful of people. Accounts are local and **admin-provisioned only**: no sign-up, no email, no self-service reset, so there are no recovery flows to own. The admin resets passwords with a CLI inside the container (`npm run user:reset`). Tailscale identity headers are a possible later single sign-on; not in v2.
- **Roles:**

  | Role | Can |
  |---|---|
  | viewer | Sign in, list channels, tune, watch live and archive channels |
  | admin | Everything a viewer can, plus manage accounts, revoke sessions, hide channels |

  Every `/api` and `/hls` route checks authorisation on the server. There is no ownership dimension: accounts own nothing but their sessions, and a viewer can list and revoke only their own sessions.
- **Passwords:**
  - Argon2id with at least OWASP's baseline (19 MiB memory, 2 iterations, parallelism 1).
  - Minimum 12 characters, checked against an offline breached-password list whose licence is recorded (no internet lookups from the box).
  - The same response and timing for an unknown user and a wrong password (always verify against a dummy hash).
  - Plain passwords are never logged or stored.
- **Sessions:**
  - Server-side. A random 256-bit id, stored only as a SHA-256 hash in SQLite.
  - Cookie `__Host-tp_session`: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, no `Domain`.
  - Rotated at sign-in. Idle expiry 14 days, absolute expiry 60 days.
  - Sign-out deletes the session; a password change deletes all of that user's sessions; an admin can revoke any session.
  - Nothing is stored in `localStorage` or `sessionStorage`.
  - HLS playlists and segments are same-origin, so the cookie travels with hls.js and Safari's native HLS requests with no token in the URL.
- **CSRF:** `SameSite=Strict`, plus a rejection of any non-GET request whose `Origin` (or `Sec-Fetch-Site`) is not the relay's own origin, plus JSON-only request bodies.
- **Rate limits (`@fastify/rate-limit`):**
  - Sign-in: 5 per minute per IP, and 10 per 15 minutes per username, with growing delays.
  - API: 120 per minute per session.
  - HLS segments have no per-request limit, but are capped at 2 concurrent channels per account and by tuner capacity. A busy tuner returns `409` and the UI shows the `busy` state.
- **Headers (`@fastify/helmet`):**
  - CSP `default-src 'self'; media-src 'self' blob:; worker-src 'self' blob:; frame-ancestors 'none'`.
  - HSTS.
  - `Referrer-Policy: no-referrer`.
- **Logging:** never log cookies, passwords, session ids or auth request bodies. Access logs redact the `Cookie` and `Authorization` headers.
- **Tests (backend-developer; QA extends them):** signed-out access to every `/api` and `/hls` route is refused; a viewer is refused every admin route; one viewer cannot revoke another's session; rate limits trigger; idle and absolute expiry work; a cross-origin POST is rejected.

### 4. HTTPS on the private network
- **Default:**
  - `tailscale serve` on the box proxies `https://<box-name>.<tailnet>.ts.net` to `127.0.0.1:8080`. Tailscale provisions and renews a publicly trusted certificate, so no local CA is needed and every browser trusts it.
  - Household devices install Tailscale, at home and away, so there is one name, one certificate and one access path.
  - Tailscale access rules allow only household devices to reach the box, and only on port 443.
- **Never:** Tailscale Funnel, router port forwarding, or binding any service to a LAN or public interface. `infra/relay/doctor.sh` checks these on the box (serve status, Funnel off, listening sockets loopback-only), and the runbook requires it after each update.
- **Naming:** certificate transparency logs publish `.ts.net` names, so the box and tailnet names must not identify the household.
- **Fallback (off by default, admin-enabled):** for a device that cannot run Tailscale (for example a smart TV), a LAN listener on `tv.home.arpa` behind Caddy's internal CA. Each such device must install and trust the root certificate. This widens exposure to the LAN, so it is an explicit opt-in documented in `docs/deployment.md`. A plain WireGuard setup uses the same local-CA route.

### 5. Private frontend build
- **One codebase, one flag:** `VITE_RELAY=1 npm run build:relay` (devops adds the script), writing to `dist-relay/` (gitignored).
  - The only entry is `if (import.meta.env.VITE_RELAY === '1') await import('@/relay')`.
  - Vite replaces the condition at build time, so in the public build the branch is dead code and the chunk is never emitted.
  - `src/relay/` holds the sign-in screen, the live-channel source adapter, the lazy hls.js loader and the session-expiry handling.
  - `src/relay/index.ts` exports a sentinel constant, `TP_RELAY_BUILD`, for the CI check.
- **No relay address anywhere:** the private frontend is served by the relay itself, so the API and streams are same-origin relative paths (`./api/`, `./hls/`), consistent with ADR 0007's relative base. No URL is supplied at build time, none is committed, and none is configured at run time. The live channel list comes from `GET ./api/channels` at run time.
- **Facts:** the relay build runs the same strict fact pipeline, so channel 0 is truthful in both builds. It is built from a full git clone of a tag.
- **hls.js:** a dependency of the root package, imported only from `src/relay/`, so it is absent from the public bundle. Safari uses native HLS. It is never added to `STACK_PACKAGES` (ADR 0009, section 8).

### 6. Repo layout and ownership

| Path | Owner | Contents |
|---|---|---|
| `server/` | backend-developer | Separate npm project, not a workspace: `package.json`, `package-lock.json`, `tsconfig.json`, `.env.example` (names only) |
| `server/src/` | backend-developer | `main.ts`, `config.ts` (environment parsing, fails on missing values), `auth/`, `routes/`, `relay/` (Tvheadend client, tuner arbitration, HLS proxy), `db/` (schema and migrations) |
| `server/cli/` | backend-developer | `user:add`, `user:reset`, `user:list`, `sessions:revoke` |
| `server/test/` | backend-developer | Server unit and integration tests (the auth matrix) |
| `docs/api.md` | backend-developer | API contract and the dependency reasons |
| `src/relay/` | frontend-developer | Private-only UI (section 5) |
| `src/state/channelStore.ts` | frontend-developer | ADR 0009, section 7 |
| `infra/relay/` | devops-engineer | `docker-compose.yml`, `Dockerfile.relay`, `mediamtx.yml`, `.env.example`, `doctor.sh`, `update.sh`, runbook |
| `scripts/check-private-data.ts`, `scripts/check-public-bundle.ts` | architect | The CI checks in section 8 |
| `docs/deployment.md` | devops-engineer | Both targets, the box runbook, every secret by name |

**API outline** (the contract belongs in `docs/api.md`):

| Route | Purpose |
|---|---|
| `POST /api/session`, `DELETE /api/session` | Sign in, sign out |
| `GET /api/me` | Current user |
| `GET /api/channels` | Live lineup, numbered from 10 |
| `POST /api/tune` | Returns `{ playlist }`, or `409` when busy |
| `GET /hls/:channel/*` | Proxied stream, auth required |
| `GET`, `POST`, `DELETE /api/admin/users`, `/api/admin/sessions` | Admin management |
| `GET /healthz` | Minimal health check, no data |

### 7. Docker Compose on the relay box (devops-engineer)
- **Host:** Linux with Docker Engine. Tailscale is installed on the host, not in a container, so `serve` and `doctor.sh` see the real interfaces.
- **Services**, all `network_mode: host` and each bound to `127.0.0.1`. Host networking is needed for SAT>IP discovery and RTP over UDP, and loopback binding keeps it closed:

  | Service | Image and notes |
  |---|---|
  | `tvheadend` | Maintained Tvheadend image; config volume. For a USB or PCIe tuner, pass `/dev/dvb`. HTTP and HTSP bound to loopback. Admin password set at first run. DVR off; no descrambler configured, so encrypted services are skipped |
  | `mediamtx` | MediaMTX image that includes ffmpeg. `/dev/dri` if present. `tmpfs` for segments. Only HLS on loopback (RTSP for the internal ffmpeg publish, also loopback). Recording off |
  | `relay` | Built from `infra/relay/Dockerfile.relay`. A multi-stage build: stage 1 runs `npm ci` and `npm run build:relay` with the full `.git` in the build context (strict facts); stage 2 has Node, `server/` and `dist-relay/` only (no `.git`, no dev dependencies). SQLite in a named volume. Runs as a non-root user with a read-only root filesystem |

- **Secrets** live only in `infra/relay/.env` on the box (gitignored, mode 600): the Tvheadend API user and password, and the session pepper. `.env.example` lists the names only.
- **Updates:** `infra/relay/update.sh` fetches tags, checks out a release tag, rebuilds and restarts, then runs `doctor.sh`. There is no image registry (no tokens on the box, no cost) and no automatic updates.

### 8. CI checks (devops wires them in; architect owns the scripts)

| Check | Runs on | Fails when |
|---|---|---|
| Secret scanning | Every push and PR: gitleaks, plus GitHub secret scanning with push protection (free on public repos) | Any credential pattern, including Tailscale auth keys (`tskey-`) and private keys |
| `check-private-data` | Every push and PR, over tracked text files and over `dist/` | Private IPv4 (RFC 1918), CGNAT `100.64.0.0/10` (Tailscale), IPv6 ULA and link-local addresses; `.ts.net`, `.home.arpa` or `.local` host names; MAC addresses; URLs with credentials (`scheme://user:pass@`). Allow-list: documentation ranges (RFC 5737, RFC 3849), `127.0.0.1`, `localhost`, Compose service names. Docs use `192.0.2.x` examples only |
| Public bundle check | After `npm run build` with `build.manifest` on | `VITE_RELAY` is set in the job; any module under `src/relay/` or `server/` appears in the manifest; `dist/` contains `TP_RELAY_BUILD`, `/api/`, `/hls/` or hls.js code |
| Private build check | `npm run build:relay` (output not uploaded or deployed) | The sentinel is *missing*, which proves the public check can detect it; the build fails |
| Server checks | `server/`: lint, typecheck, tests, `npm audit`, Docker build of `Dockerfile.relay` (no push) | Any failure, including the auth matrix |
| Deploy guard | Pages deploy job | The artefact is not the output of the public build job, or the bundle check did not pass |
| v1 regression | The full v1 suite on the v2 branch | Any v1 test fails |

`.gitignore` additions (architect, at implementation): `dist-relay/`, `server/data/`, `server/.env`, `infra/relay/.env`, `*.sqlite`.

## Consequences
- The household gets live free-to-air channels on the same CRT set, privately, with a managed trusted certificate and no exposed ports.
- The public site keeps no backend and no relay code, and CI proves it on every build. Publishing the relay's source in the public repo is safe, because only names, never values, are committed.
- New operational duties fall on the user: keep the box, Tailscale and the images updated, and run `doctor.sh`. A tuner shortage shows up as `busy`.
- Hardware transcoding depends on the box: software transcoding at SD is fine for one or two channels on a modern x86 CPU, but not on a Raspberry Pi 5.
- The live channels do not meet WCAG 2.2 AA live captions (1.2.4). They are a private household feature outside the public site's conformance claim.
- Two build targets double the release checks; CI runs both on every push.
