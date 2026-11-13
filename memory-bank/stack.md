# Stack

Revision: 2026-11-13, fase 4. Fuentes: [requirements.txt](../backend/requirements.txt),
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
  tailwind-merge. ESLint 9.39.4, Vitest 4.1.4 con `@vitest/coverage-v8`.
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

## Comandos ya comprobados (con evidencia)

- Backend: `uv run --no-project --python 3.13 --with-requirements backend/requirements.txt pytest backend/tests/test_routes.py -q`
  -> 15 passed (BACKEND-TEST-01; reconfirmado en fase 3, API-01).
- Frontend tests: `npm --prefix frontend test -- src/lib/financial-utils.test.ts`
  -> 6 passed tras fase 3 (5 previos + 1 caso de frontera de mes nuevo,
  FIN-CAL-01).
- Lint: `npm --prefix frontend run lint` -> sin errores/avisos
  (FRONTEND-LINT-01; reconfirmado en fase 3, FE-01).
- Build: `npm --prefix frontend run build` (`tsc -b && vite build`) -> exitoso;
  aviso persistente de chunk JS superior a 500 kB, no resuelto
  (FRONTEND-BUILD-01).

Detalle completo de estas comprobaciones y sus limites en
[02-handover-checks.md](../docs/validations/02-handover-checks.md) y
[05-rules-checks.md](../docs/validations/05-rules-checks.md).
