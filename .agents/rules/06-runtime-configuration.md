# DX - Runtime, configuration and bilingual startup docs

## Scope and purpose

Apply to Dockerfiles, Compose, Vite/proxy, dependency manifests/lockfiles,
environment examples, CORS and startup documentation. Keep development
configuration distinct from deployment guarantees. Implements R18-R21 and R23.

## Repository facts and rationale

- [Compose](../../docker-compose.yml) publishes frontend 5173, HTTP API 8000
  and Debugpy 5678. [Vite](../../frontend/vite.config.ts) proxies /api to the
  Compose hostname backend:8000, not to the host's localhost.
- [Backend Dockerfile](../../backend/Dockerfile) runs Debugpy and Uvicorn
  reload; [frontend Dockerfile](../../frontend/Dockerfile) runs Vite dev and
  npm install although a package-lock is tracked.
- [main.py](../../backend/app/main.py) configures wildcard CORS and
  credentials. This is not a production approval.
- [README.md](../../README.md), [README.es.md](../../README.es.md) and
  [.env.example](../../frontend/.env.example) explain startup/API override;
  [.gitignore](../../.gitignore) excludes real environment files.

## Instructions

1. Read the actual Compose/Vite/Dockerfile settings before documenting or
   changing ports and origins. Distinguish HTTP 8000 from debugger 5678.
   Do not present the default Compose proxy as equivalent to separate host
   startup or Vite dev as a production build.
2. Update both README languages together when startup, ports, API override or
   rule discovery changes. Place the client environment example at frontend,
   and keep the .env location unambiguous.
3. Do not put credentials in code, prompts, examples or VITE_* variables:
   client Vite variables are public to the browser. Review tracked files too;
   ignore rules do not remove already committed secrets.
4. Keep package.json and its lockfile consistent. Use npm ci in a new/changed
   reproducible build/CI workflow; do not replace the current Dockerfile's
   installation flow or reinstall dependencies in a documentation-only task.
5. Do not expand permissive CORS or publish Debugpy as a production recipe.
   An authorized deployment change requires explicit allowed origins,
   appropriate credential handling and allowed/disallowed preflight checks.
6. Configuration inspection is not runtime verification. Do not start/stop
   shared services, change ports, install tools or claim a deployment passed
   just to make a documentation exercise appear successful.

## Checks and limits

For docs-only work, compare both languages and the referenced source settings,
check relative links and diff. For changed configuration, validate the
affected configuration and HTTP flow in an authorized environment. A lockfile
check does not prove reproducible Docker builds; a CORS warning does not fix
the policy. Record unexercised deployment conditions as such.
