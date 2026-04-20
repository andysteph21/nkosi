# Deployment — Hostinger VPS (Docker + Caddy)

Self-hosted deployment of the Next.js + Supabase app on a Hostinger VPS, using Docker Compose and Caddy as reverse proxy with automatic HTTPS (Let's Encrypt).

## Architecture

```
Internet ──► :80 / :443  Caddy (TLS, HTTP/3, gzip)  ──►  app:3000  (Next.js standalone)
                                                            │
                                                            └──►  Supabase (hosted)
```

Two containers on a private Docker network:
- `caddy` — public-facing, terminates TLS, reverse-proxies to `app`
- `app` — Next.js runtime (standalone output), not exposed to the host

## 1. Provision the VPS

On your Hostinger VPS, pick the **Ubuntu 24.04 with Docker** template (or install Docker manually on any Linux template):

```bash
# If Docker is not preinstalled:
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

Open the firewall for HTTP/HTTPS:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp   # HTTP/3 (QUIC)
sudo ufw enable
```

## 2. DNS

In Hostinger's DNS panel, create an `A` record:

```
Type: A     Name: @ (or app)     Value: <VPS public IPv4>     TTL: 300
```

Optionally an `AAAA` for IPv6. Wait until `dig +short app.example.com` returns the VPS IP before starting Caddy (otherwise ACME will rate-limit you).

## 3. Get the code on the VPS

```bash
git clone <your-repo-url> nkosi
cd nkosi
cp .env.production.example .env.production
nano .env.production   # fill in DOMAIN, ACME_EMAIL, Supabase keys, super admin
```

## 4. Build and start

```bash
docker compose --env-file .env.production up -d --build
```

Follow logs:

```bash
docker compose logs -f caddy app
```

Caddy will obtain a Let's Encrypt certificate on first request. Once healthy, the app is live at `https://<DOMAIN>`.

## 5. Updates

```bash
cd ~/nkosi
git pull
docker compose --env-file .env.production up -d --build
docker image prune -f
```

Zero-downtime-ish: Compose recreates the `app` container only; Caddy keeps running and reconnects.

## 6. Operations cheatsheet

```bash
# Status
docker compose ps

# Restart app only
docker compose restart app

# Shell into the app container
docker compose exec app sh

# Tail app logs
docker compose logs -f --tail=200 app

# Stop everything (keeps volumes/certs)
docker compose down

# Full reset (⚠️ drops Caddy certs — you'll re-issue)
docker compose down -v
```

## Notes

- **`NEXT_PUBLIC_*` variables are baked into the client bundle at build time.** Changing them requires a rebuild (`--build` flag above already handles it).
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only — never ship it to the client.
- The `Caddyfile/` empty directory at the repo root was created by mistake (owned by root). Remove it with `sudo rmdir Caddyfile` — the real config lives in `caddy/Caddyfile`.
- Health check inside the app container hits `http://127.0.0.1:3000/`. If your homepage returns non-2xx, adjust the `HEALTHCHECK` in the `Dockerfile`.
- For a staging test without a domain, replace the site block in `caddy/Caddyfile` with `:80 { reverse_proxy app:3000 }` and browse to the VPS IP.
