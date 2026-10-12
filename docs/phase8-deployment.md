# Phase 8 Implementation — Production Deployment on the Homelab

This document describes everything done in Phase 8. The goal was to run a production-ready copy of the app on the homelab, publicly reachable at **https://panaceia.gabrielcf.com**, following the homelab's infrastructure-as-code standard (`gCarvalhoF/homelab-iac`).

---

## Table of Contents

1. [Overview](#overview)
2. [Single-Origin Production Image](#single-origin-production-image)
3. [Host Authorization](#host-authorization)
4. [Production Boot Fixes](#production-boot-fixes)
5. [Frontend Type Checking](#frontend-type-checking)
6. [Homelab Infrastructure](#homelab-infrastructure)
7. [First Boot and Data Import](#first-boot-and-data-import)
8. [Operations](#operations)
9. [Key Decisions and Gotchas](#key-decisions-and-gotchas)

---

## Overview

Until Phase 7 the app only ever ran in development: Rails on `:3001` and the Vite dev server on `:5173`, with Vite proxying `/api`. Phase 8 makes the existing `Dockerfile` produce a single production image that serves both the API and the built React app, then deploys it to a dedicated LXC through Terraform + Ansible.

**Files changed (this repo):**

| File | Nature of change |
|---|---|
| `Dockerfile` | New `frontend` (Node 20) stage; build output copied into the image |
| `.dockerignore` | Excludes `frontend/node_modules` and `frontend/dist` from the build context |
| `app/controllers/spa_controller.rb` | New — serves the built `index.html` at `/` |
| `config/routes.rb` | `root "spa#index"` |
| `config/application.rb` | `config.x.spa_index_path` (defaults to `frontend/dist/index.html`) |
| `config/environments/production.rb` | `config.hosts` from `RAILS_HOSTS`; `/up` excluded from host checks |
| `app/services/cidacs/api.rb` | Deleted (unused; broke production eager loading) |
| `frontend/src/components/Dashboard/Charts/*.tsx` | Recharts 3 click handlers typed via `data.payload` |
| `frontend/src/components/Map/EstablishmentMarkers.tsx` | Mutable `useRef` types |
| `frontend/src/**/*.test.ts(x)` | `global` → `globalThis` |
| `frontend/package.json`, `.github/workflows/ci.yml` | New `typecheck` script, run in the `lint_frontend` job |
| `spec/requests/spa_spec.rb`, `spec/config/production_hosts_spec.rb` | New specs |

---

## Single-Origin Production Image

The frontend calls relative URLs (`fetch("/api/v1/...")`), so serving the SPA and the API from the same origin needs no CORS configuration and no build-time API URL.

```
Dockerfile
  frontend stage (node:20-slim)   npm ci && npm run build  →  /frontend/dist
  build stage                     COPY dist/ → public/
                                  mv public/index.html → frontend/dist/index.html
  final stage                     Thruster :80 → Puma
```

- **Hashed bundles and images** (`public/assets/*`, `public/images/*`) are served by Rails' static file server with the existing one-year `cache-control`. Safe because Vite content-hashes bundle filenames.
- **`index.html`** is deliberately kept *out* of `public/`. If it were there, the static file server would serve it for `/` with the one-year cache header, and browsers/Cloudflare would keep old bundle references after a deploy. `SpaController#index` serves it with `Cache-Control: no-cache` instead, and returns `404` if the frontend was never built (e.g. in development and test).
- The app has no client-side router, so `/` is the only SPA route.

---

## Host Authorization

```ruby
config.hosts = ENV.fetch("RAILS_HOSTS", "").split(",").map(&:strip).reject(&:empty?)
config.host_authorization = { exclude: ->(request) { request.path == "/up" } }
```

- `RAILS_HOSTS` is a comma-separated allowlist. On the homelab it is `panaceia.gabrielcf.com,192.168.68.210`.
- Unset/empty means any host is allowed, which keeps ad-hoc `docker run` usable.
- `/up` is excluded so container and Ansible health checks work with any `Host` header.
- `assume_ssl`/`force_ssl` stay on: Cloudflare terminates TLS and the tunnel forwards plain HTTP, so `assume_ssl` prevents redirect loops.

`spec/config/production_hosts_spec.rb` boots the app with `RAILS_ENV=production` in a subprocess (`bin/rails runner`, no DB access), so it tests the real `production.rb` — and doubles as a guard that production eager loading works at all.

---

## Production Boot Fixes

The first production boot surfaced a bug that development never hits, because development lazy-loads:

- `app/services/cidacs/api.rb` declared `Services::Cidacs::Api` (Zeitwerk expects `Cidacs::Api`) and `include`d `HTTParty`, which is not in the `Gemfile`. Nothing referenced it. Production eager-loads every file, so the app crashed on boot. The file was deleted; it remains in git history for the CIDACS research item in `tasks.md`.

---

## Frontend Type Checking

`npm run build` is `tsc && vite build`, and it had never passed: 12 type errors had accumulated because nothing ran `tsc`.

| Error | Fix |
|---|---|
| Recharts 3 `Bar`/`Pie` `onClick` handlers typed as `(entry: {neighborhood: string}) => void` | Use the library's event type and read the original row from `data.payload` (Recharts sets `payload: entry` on both bar and pie items) |
| `useRef<T>(null)` then assigning `.current` | `useRef<T \| null>(null)` (mutable ref) |
| `vi.spyOn(global, "fetch")` in tests | `globalThis` (no `@types/node` in the frontend) |

A `typecheck` script (`tsc --noEmit`) now runs in the `lint_frontend` CI job so the production build cannot silently break again.

---

## Homelab Infrastructure

All infrastructure lives in `gCarvalhoF/homelab-iac` (see its README, section *panaceia*):

| Piece | Value |
|---|---|
| LXC | `panaceia.homelab`, VMID 108, 192.168.68.210/22, Ubuntu 24.04, 2 cores, 3 GB RAM + 1 GB swap, 30 GB disk, `nesting` only |
| Public URL | `panaceia.gabrielcf.com` — ingress rule on the shared `homelab` Cloudflare tunnel + proxied CNAME |
| Ansible role | `panaceia` — clones this repo at `panaceia_git_ref`, builds the image on the LXC, runs `/srv/panaceia/docker-compose.yml` |
| Compose services | `db` (`postgis/postgis:16-3.5-alpine`, named volume) and `web` (this image, port 80, `aux-data` mounted read-only) |
| Secrets | `group_vars/panaceia.yml` on `iac-control` (gitignored): `panaceia_secret_key_base`, `panaceia_db_password` |

There is no `RAILS_MASTER_KEY`: the app has no secrets in `credentials.yml.enc`, so production uses a `SECRET_KEY_BASE` environment variable instead.

---

## First Boot and Data Import

`bin/docker-entrypoint` runs `db:prepare` before the server starts. On a **fresh** database `db:prepare` creates all four databases (primary, cache, queue, cable), loads the schemas and then runs `db/seeds.rb`, which calls every importer. That means a first boot without `aux-data` fails, and a first boot with it blocks on the full import.

The Ansible role therefore handles first boot explicitly:

1. Start `db` only and check whether `dados_acesso_saude_salvador_production` exists.
2. If not, fail early unless `/srv/panaceia/aux-data/cnes-database` exists (it must be rsynced from a dev machine — the CSVs are not in git).
3. Run `docker compose run --rm web ./bin/rails db:prepare` (async, up to 2 h) — this is the import.
4. Start the stack and health-check `/up`.

Later runs find the database and skip straight to `up -d`, where `db:prepare` only migrates.

---

## Operations

```bash
# Deploy a new version (from iac-control, /root/homelab-iac/ansible)
ansible-playbook playbooks/site.yml --limit panaceia -e panaceia_git_ref=<branch|tag|sha>

# Re-run the import (on the LXC)
cd /srv/panaceia && docker compose run --rm web ./bin/rails data:import:all
```

No backups are configured: the database is fully reproducible from `aux-data`.

---

## Key Decisions and Gotchas

| Decision | Rationale |
|---|---|
| Rails serves the SPA (single image) instead of a separate nginx container | One container, same origin, no CORS, no build-time API URL |
| `index.html` served by a controller, not `public/` | Avoids the one-year static cache header on the one file that must change on every deploy |
| Image built on the LXC from a git clone, not pushed to a registry | Simplest path for a single host; GHCR + CD can be added later like life-tracking |
| `POSTGRES_DB=postgres` in production compose | The `postgis/postgis` image's init script installs `postgis_tiger_geocoder`/`topology` into `$POSTGRES_DB`. Rails creates its own databases from `template1`, so they only get `postgis` |
| Local `db/schema.rb` showing `tiger`/`topology` tables | Same root cause in development: the dev compose sets `POSTGRES_DB` to the app database, so the init script pollutes it and `schema:dump` picks the extra tables up. Don't commit those dumps |
| No backups | Data is reproducible from source files; avoids the R2/restore-drill setup life-tracking needs |
| Brakeman bumped to 8.1.0; Rails 8.0 EOL warning in `config/brakeman.ignore` | `bin/brakeman` runs with `--ensure-latest`, so `scan_ruby` failed on every run once 8.1.0 shipped. 8.1.0 flags that Rails 8.0 support ends **2026-11-07**; the warning is ignored temporarily and the Rails 8.1 upgrade is tracked as separate work — remove the ignore entry when upgrading |
