# Stack

Revision: 2026-11-17, cierre del proyecto 4. Fuentes: [requirements.txt](../backend/requirements.txt),
[package.json](../frontend/package.json), [package-lock.json](../frontend/package-lock.json),
[docker-compose.yml](../docker-compose.yml), ambos Dockerfiles.

## Backend

- Python 3.13 (imagen `python:3.13-slim` en [Dockerfile](../backend/Dockerfile)).
- FastAPI + Uvicorn[standard], Debugpy para depuracion remota, httpx/pytest/pytest-cov
  para tests. [requirements.txt](../backend/requirements.txt) no fija versiones
  y no hay lockfile Python en este repositorio; las versiones resueltas dependen
  del entorno de instalacion.
- Arranque en contenedor: `debugpy --listen 0.0.0.0:5678` envolviendo
  `uvicorn app.main:app --reload` en el puerto 8000 (ver
  [Dockerfile](../backend/Dockerfile)). Recarga y Debugpy son de desarrollo,
  no una configuracion de despliegue.
- CORS en [main.py](../backend/app/main.py): `allow_origins=["*"]` con
  `allow_credentials=True`. No se ha revisado ni aprobado para datos reales.

## Frontend

- Node 24 (imagen `node:24-alpine` en [Dockerfile](../frontend/Dockerfile)).
- React 19.2.4 + TypeScript ~6.0.2, Vite ^8.0.4 (resuelto 8.0.8 en el build
  comprobado), Tailwind CSS 4.2.2, Recharts 3.8.1, lucide-react, clsx +
  tailwind-merge. ESLint 9.39.4, Vitest 4.1.4 con `@vitest/coverage-v8` y
  `jsdom` 31.0.1 (proyecto 4, para tests de componentes con
  `// @vitest-environment jsdom` por archivo; sin `vitest.config`).
  Versiones declaradas en [package.json](../frontend/package.json);
  [package-lock.json](../frontend/package-lock.json) esta versionado, por lo
  que `npm ci` produce una instalacion reproducible (el Dockerfile actual usa
  `npm install`, no `npm ci`).
- Alias `@` -> `src` configurado igual en [vite.config.ts](../frontend/vite.config.ts)
  y [tsconfig.app.json](../frontend/tsconfig.app.json).

## Infraestructura y entorno

- [docker-compose.yml](../docker-compose.yml) define `frontend` (5173) y
  `backend` (8000 HTTP + 5678 Debugpy, no HTTP); `frontend` depende de
  `backend`. Monta las fuentes como volumen y usa un volumen anonimo para
  `node_modules`; sin volumen de datos persistentes ni healthcheck.
- El proxy `/api` de Vite apunta a `http://backend:8000` (hostname de Compose),
  no a `localhost:8000` del host; ver
  [vite.config.ts](../frontend/vite.config.ts) y la aclaracion anadida en
  fase 3 a ambos README.
- Override opcional `VITE_API_BASE_URL` documentado en
  [README.md](../README.md), [README.es.md](../README.es.md) y
  [frontend/.env.example](../frontend/.env.example).
  [.gitignore](../.gitignore) excluye `.env` y conserva el ejemplo.
- Trampas observadas al verificar cambios (proyecto 4): Vite en Docker puede
  seguir sirviendo un modulo viejo tras editarlo (comprobar con
  `curl -s http://localhost:5173/src/<archivo>`; si falta el cambio,
  `docker compose restart frontend`); parar `vite preview` como tarea en
  segundo plano no mata el `node` hijo y el puerto 4173 sigue ocupado. La
  skill [verify-frontend-change](../.skills/verify-frontend-change/SKILL.md)
  recoge el procedimiento.

## Agent skills

- Comunitarias en `.agents/skills/` (fijadas en `skills-lock.json`), instaladas
  con `npx -y skills add <owner/repo> --skill <nombre> -a claude-code codex -y`:
  `accessibility`, `vercel-react-best-practices`, `vitest`. La CLI crea ademas
  enlaces locales en `.claude/skills/` (ignorado por git).
- Del proyecto en `.skills/`: `verify-frontend-change`. Rutas y disparador en
  [AGENTS.md](../AGENTS.md).

## Comandos ya comprobados (con evidencia)

- Backend: `uv run --no-project --python 3.13 --with-requirements backend/requirements.txt pytest backend/tests/test_routes.py -q`
  -> 15 passed (BACKEND-TEST-01; reconfirmado en fase 3, API-01).
- Frontend tests: `npm --prefix frontend test` -> 2 archivos, 8 passed
  (2026-11-17): `financial-utils.test.ts` (6, incluido el caso de frontera de
  mes FIN-CAL-01) y `App.test.tsx` (2, estados de carga y error).
- Lint: `npm --prefix frontend run lint` -> sin errores/avisos
  (FRONTEND-LINT-01; reconfirmado en el proyecto 4).
- Build: `npm --prefix frontend run build` (`tsc -b && vite build`) -> exitoso
  y **sin avisos** desde el proyecto 4: chunk principal 187.77 kB (antes
  584 kB con aviso de chunk > 500 kB); Recharts en `LineChart-*.js` 342.30 kB,
  cargado en diferido.
- Medicion de produccion (proyecto 4): build con
  `VITE_API_BASE_URL=http://localhost:8000 npx vite build --outDir <tmp>`,
  `npx vite preview --outDir <tmp> --port 4173 --strictPort` y
  `npx -y lighthouse@12 http://localhost:4173 --only-categories=<cat>`.
  Rendimiento 80-89 entre pasadas, LCP 2.7-2.9 s, CLS 0-0.014.
- Specs (proyecto 3, desde `frontend/`): `npx tsc --noEmit` -> exit 0, pero
  **no compila `specs/`** (`tsconfig.app.json` solo incluye `src`). La
  comprobacion real es
  `npx tsc --ignoreConfig --noEmit --strict --target es2023 --module esnext --moduleResolution bundler --verbatimModuleSyntax --skipLibCheck specs/api-types.ts specs/param-types.ts`
  -> exit 0 (2026-11-16, ver [verification.md](../frontend/specs/verification.md)).

Detalle completo de estas comprobaciones y sus limites en
[02-handover-checks.md](../docs/validations/02-handover-checks.md),
[05-rules-checks.md](../docs/validations/05-rules-checks.md) y
[07-agent-skills-checks.md](../docs/validations/07-agent-skills-checks.md).
