# 01. Estructura, servicios y entry points

Fecha de revision: 2026-11-12. Alcance: mapa del codigo, configuracion y pruebas del repositorio. La inspeccion estatica no demuestra que los servicios esten ejecutandose ni que las pruebas pasen. Los directorios generados o ignorados no forman parte del mapa de fuentes.

## 1. Resumen del sistema

Panel de metricas financieras con frontend React/TypeScript y API FastAPI. Presenta ingresos, gastos, beneficio, margen y dos graficos mensuales. La API genera 360 movimientos sinteticos por solicitud, los filtra y agrega en memoria. No hay base de datos, autenticacion, endpoints de escritura ni integraciones financieras externas implementadas en las fuentes inspeccionadas.

Fuentes: [App.tsx](../../frontend/src/App.tsx), [financial-utils.ts](../../frontend/src/lib/financial-utils.ts), [routes.py](../../backend/app/routes.py), [docker-compose.yml](../../docker-compose.yml).

## 2. Arbol de fuentes y documentos

```text
/
|-- AGENTS.md
|-- .gitignore
|-- README.md
|-- README.es.md
|-- docker-compose.yml
|-- docs/
|   |-- ROADMAP.md                  # Documento de planificacion de esta tarea
|   `-- validations/
|       |-- verification - resume.md # Informe canonico consolidado
|       `-- 01-structure.md         # Este mapa
|-- backend/
|   |-- Dockerfile
|   |-- requirements.txt
|   |-- app/
|   |   |-- __init__.py
|   |   |-- main.py
|   |   `-- routes.py
|   `-- tests/
|       |-- conftest.py
|       `-- test_routes.py
`-- frontend/
    |-- .env.example
    |-- .gitignore
    |-- Dockerfile
    |-- package.json
    |-- package-lock.json
    |-- components.json
    |-- eslint.config.js
    |-- index.html
    |-- tsconfig.json
    |-- tsconfig.app.json
    |-- tsconfig.node.json
    |-- vite.config.ts
    |-- public/
    |   `-- favicon.svg
    `-- src/
        |-- main.tsx
        |-- App.tsx
        |-- index.css
        |-- assets/
        |   `-- hero.png
        |-- components/
        |   |-- dashboard/
        |   |   |-- dashboard-header.tsx
        |   |   |-- kpi-card.tsx
        |   |   |-- kpi-row.tsx
        |   |   |-- income-outcome-chart.tsx
        |   |   `-- profit-percent-chart.tsx
        |   `-- ui/
        |       |-- card.tsx
        |       `-- skeleton.tsx
        `-- lib/
            |-- financial-types.ts
            |-- financial-utils.ts
            |-- financial-utils.test.ts
            |-- mock-data.ts
            `-- utils.ts
```

No existen actualmente `.agents/rules`, `.agents/skills` ni `memory-bank`, aunque [AGENTS.md](../../AGENTS.md) exige consultarlos y [README.md](../../README.md) propone la estructura de agentes. Su creacion pertenece a las fases posteriores, no al estado actual.

## 3. Servicios y arranque

| Servicio | Configuracion y entry point | Puertos publicados | Funcion |
| --- | --- | --- | --- |
| `frontend` | [Compose](../../docker-compose.yml), [Dockerfile](../../frontend/Dockerfile); servidor Vite | `5173:5173` | Sirve la aplicacion y hace proxy de `/api` |
| `backend` | [Compose](../../docker-compose.yml), [Dockerfile](../../backend/Dockerfile); Uvicorn carga `app.main:app` bajo Debugpy | `8000:8000`, `5678:5678` | API HTTP y puerto de depuracion Python |

Compose monta las fuentes de cada servicio en `/app`. El frontend usa ademas un volumen anonimo `/app/node_modules` y declara `depends_on: backend`; no hay healthcheck ni condicion de disponibilidad de la API. `5678` es Debugpy, no un servicio HTTP. La configuracion usa servidores de desarrollo, recarga y montaje de fuentes, no una distribucion de produccion.

Procedimiento documentado desde la raiz, segun [README.md](../../README.md) y [README.es.md](../../README.es.md):

```sh
docker compose up --build
docker compose down
```

URLs previstas: frontend `http://localhost:5173`, backend `http://localhost:8000`, Swagger `http://localhost:8000/docs`. Son direcciones declaradas, no accesibilidad comprobada durante esta revision.

## 4. Entry points y flujo de datos

1. [index.html](../../frontend/index.html) carga `/src/main.tsx` y contiene `#root`.
2. [main.tsx](../../frontend/src/main.tsx) monta React con `StrictMode`, importa estilos y renderiza `App`.
3. [App.tsx](../../frontend/src/App.tsx), mediante `fetchFinancialData`, solicita `${VITE_API_BASE_URL}/api/metrics` desde un efecto de montaje. No envia filtros ni consume las otras rutas. `StrictMode` puede repetir el efecto en desarrollo; no se garantiza una sola peticion de red.
4. Con la base vacia, [vite.config.ts](../../frontend/vite.config.ts) hace proxy de `/api` hacia `http://backend:8000`. Ese hostname es el servicio Compose; no es un hostname del host Windows. `/health` no tiene proxy declarado.
5. [main.py](../../backend/app/main.py) crea `app`, configura CORS y registra `router`.
6. [routes.py](../../backend/app/routes.py) genera movimientos con `seed=42`, aplica filtros inclusivos de fecha y devuelve modelos Pydantic serializados.
7. [financial-utils.ts](../../frontend/src/lib/financial-utils.ts) calcula KPIs y agrupa por ano/mes. Los componentes del dashboard reciben los resultados, no hacen peticiones propias.

`VITE_API_BASE_URL` se documenta en [.env.example](../../frontend/.env.example). Una base absoluta evita el proxy y requiere que el navegador pueda llegar a la API. Las variables `VITE_*` se incorporan al cliente: no son un lugar para secretos. El proxy declarado pertenece al servidor de desarrollo; no configura por si solo el despliegue de los archivos compilados.

## 5. API HTTP

Todas las rutas propias son `GET` y viven en [routes.py](../../backend/app/routes.py), sin prefijo adicional al registrar el router. Los parametros son de query. Fechas: `YYYY-MM-DD`; operacion: `income | outcome`; negocio: `B2B | B2C`; categoria: `suppliers | sales | operational | administrative | others`; agrupacion: `day | week | month`.

| Ruta | Handler / modelo de respuesta | Parametros |
| --- | --- | --- |
| `/health` | `health`; `{status: "ok"}` | Ninguno |
| `/api/metrics` | `get_metrics`; `FinancialMovement[]` | `start_date`, `end_date`, `category`, `operation_type`, opcionales |
| `/api/metrics/facets` | `get_metrics_facets`; `MetricsFacets` | Ninguno |
| `/api/metrics/summary` | `get_metrics_summary`; `MetricsSummaryItem[]` | `group_by=month`, fechas, categoria, operacion, negocio |
| `/api/metrics/categories/top` | `get_top_categories`; `TopCategoryItem[]` | `operation_type=outcome`, `limit=5` (1-20), fechas, negocio |
| `/api/metrics/comparison` | `get_metrics_comparison`; `MetricsComparison` | Fechas obligatorias; negocio opcional |
| `/api/metrics/alerts` | `get_metrics_alerts`; `MetricsAlert[]` | `threshold=0.3` (>=0), `group_by=month`, fechas, negocio |
| `/api/metrics/b2b` | `get_b2b_metrics`; `FinancialMovement[]` | Fechas, categoria, operacion; negocio fijado a B2B |
| `/api/metrics/b2c` | `get_b2c_metrics`; `FinancialMovement[]` | Fechas, categoria, operacion; negocio fijado a B2C |

Modelos: movimiento `{create_date, amount, operation_type, category, business_type}`; facets contiene opciones y fechas minima/maxima; resumen `{period, income, outcome, net}`; top `{category, operation_type, total_amount}`; comparacion `{current_period, previous_period, delta_abs, delta_pct}`; alerta `{period, outcome_total, baseline_average, increase_ratio}`.

Resumen: neto = ingresos - gastos, redondeado a dos decimales; orden por periodo. Comparacion: rango anterior inmediatamente contiguo, con igual numero de dias incluidos; porcentaje `null` si el neto anterior es cero. Alertas: gasto superior al promedio de periodos anteriores por mas del umbral; omite el primer periodo y bases no positivas. Las opciones y restricciones de FastAPI permiten rechazar parametros invalidos; no se valida explicitamente `start_date <= end_date`.

FastAPI aporta tambien sus rutas de documentacion por defecto (`/docs`, `/redoc`, `/openapi.json`); no son endpoints de negocio adicionales escritos en el router.

## 6. Responsabilidad de los archivos

| Area | Archivos y responsabilidad |
| --- | --- |
| Guia y orquestacion | [AGENTS.md](../../AGENTS.md): instrucciones; [README.md](../../README.md) y [README.es.md](../../README.es.md): contexto y arranque; [docker-compose.yml](../../docker-compose.yml): servicios; [.gitignore](../../.gitignore): exclusiones |
| Evidencia de handover | [verification - resume.md](verification%20-%20resume.md): informe canonico consolidado por solicitud del mantenedor, con la estructura del antiguo informe de la raiz y los detalles relevantes del segundo |
| Backend | [Dockerfile](../../backend/Dockerfile): Python 3.13-slim, instalacion y arranque; [requirements.txt](../../backend/requirements.txt): dependencias; [__init__.py](../../backend/app/__init__.py): paquete; [main.py](../../backend/app/main.py): app y middleware; [routes.py](../../backend/app/routes.py): modelos, generador, filtros, agregaciones y rutas |
| Tests API | [conftest.py](../../backend/tests/conftest.py): incorpora la raiz de backend a `sys.path`; [test_routes.py](../../backend/tests/test_routes.py): TestClient, generacion, filtros y endpoints |
| Herramientas frontend | [package.json](../../frontend/package.json): dependencias/scripts; [package-lock.json](../../frontend/package-lock.json): versiones resueltas; [Dockerfile](../../frontend/Dockerfile): instalacion/arranque; [.gitignore](../../frontend/.gitignore): exclusiones; [.env.example](../../frontend/.env.example): base API |
| Configuracion frontend | [vite.config.ts](../../frontend/vite.config.ts): React, Tailwind, proxy, alias `@`; [components.json](../../frontend/components.json): configuracion del generador de componentes; [eslint.config.js](../../frontend/eslint.config.js): reglas TS/TSX; [tsconfig.json](../../frontend/tsconfig.json): referencias; [tsconfig.app.json](../../frontend/tsconfig.app.json): app; [tsconfig.node.json](../../frontend/tsconfig.node.json): tooling |
| Entrada y estilos | [index.html](../../frontend/index.html): shell; [main.tsx](../../frontend/src/main.tsx): montaje; [App.tsx](../../frontend/src/App.tsx): carga/error y composicion; [index.css](../../frontend/src/index.css): Tailwind, tema y estilos globales |
| Dashboard | [dashboard-header.tsx](../../frontend/src/components/dashboard/dashboard-header.tsx): titulo/periodo; [kpi-row.tsx](../../frontend/src/components/dashboard/kpi-row.tsx): KPIs; [kpi-card.tsx](../../frontend/src/components/dashboard/kpi-card.tsx): tarjeta individual; [income-outcome-chart.tsx](../../frontend/src/components/dashboard/income-outcome-chart.tsx): ingresos/gastos; [profit-percent-chart.tsx](../../frontend/src/components/dashboard/profit-percent-chart.tsx): margen mensual |
| Primitivas UI | [card.tsx](../../frontend/src/components/ui/card.tsx): piezas reutilizables de tarjeta; [skeleton.tsx](../../frontend/src/components/ui/skeleton.tsx): carga visual |
| Dominio cliente | [financial-types.ts](../../frontend/src/lib/financial-types.ts): contratos TS; [financial-utils.ts](../../frontend/src/lib/financial-utils.ts): calculo/formato; [financial-utils.test.ts](../../frontend/src/lib/financial-utils.test.ts): pruebas; [mock-data.ts](../../frontend/src/lib/mock-data.ts): datos de ejemplo locales; [utils.ts](../../frontend/src/lib/utils.ts): combinacion de clases `cn` |
| Assets | [favicon.svg](../../frontend/public/favicon.svg): favicon; [hero.png](../../frontend/src/assets/hero.png): imagen existente. La presencia de un asset no prueba su uso en pantalla |

## 7. Stack, pruebas y limites

Stack declarado en [package.json](../../frontend/package.json): React 19, TypeScript 6, Vite 8, Tailwind 4, Recharts 3, lucide-react, clsx y tailwind-merge; ESLint 9 y Vitest 4. Las versiones exactas resueltas estan en el lockfile. El backend declara FastAPI, Uvicorn, Debugpy, Pytest, pytest-cov y HTTPX; consultar [requirements.txt](../../backend/requirements.txt), sin confundir dependencias declaradas con paquetes instalados.

Scripts frontend: `npm run dev`, `npm run build` (TypeScript + Vite), `npm run lint`, `npm run preview`, `npm test`, `npm run test:watch`, `npm run test:coverage`. Las pruebas existentes cubren calculo, agrupacion cronologica entre anos y formato; no hay pruebas de componentes o E2E en el inventario.

Las 15 pruebas backend inspeccionadas cubren generacion de 360 movimientos, orden, extremos de fecha, salud, filtros, B2B/B2C y contratos parciales de las rutas agregadas. Su existencia no equivale a cobertura completa: comparacion comprueba campos, alertas puede aceptar una lista vacia y la prueba semanal no demuestra por si sola el filtro de negocio. No hay configuracion CI presente en el inventario de fuentes.

Observaciones que deben sobrevivir al handover:

- El periodo visible `2024 - Full Year` esta fijado en `App`, pero `_year_for_month` usa la fecha actual; no existe selector de periodo conectado a la API.
- La semilla fija estabiliza la secuencia aleatoria, no las fechas a lo largo del calendario. El generador usa el mes actual como limite para asignar ano.
- El cliente recalcula KPIs/series desde movimientos; no usa los endpoints de resumen/comparacion/alertas ni importa los mocks locales en `App`.
- El parsing cliente combina `new Date("YYYY-MM-DD")` con getters locales; cualquier regla futura sobre fechas necesita pruebas de zona horaria, no una suposicion de independencia del entorno.
- La configuracion Compose/proxy esta orientada a desarrollo. No hay que afirmar que ofrece despliegue productivo, readiness o persistencia.
- CORS permite todos los origenes, metodos y cabeceras, con credenciales habilitadas en [main.py](../../backend/app/main.py). Es la configuracion observada, no una recomendacion de seguridad.
- Los componentes reutilizan `Card`, `Skeleton`, `cn`, iconos lucide y tokens CSS. Los graficos contemplan carga y ausencia de valores; el grafico de margen considera sin datos una serie cuyos porcentajes son todos cero, incluso si contiene movimientos.
- TypeScript configura comprobaciones de elementos no usados, pero no declara `strict`. No se debe describir el proyecto como configurado en modo estricto.

## 8. Evidencia y siguiente verificacion

Comprobado: inventario de fuentes, lectura de rutas y funciones de calculo, configuracion de servicios y pruebas existentes. Git mostraba inicialmente documentos no versionados en `docs/` y en la raiz. El mantenedor solicito consolidar los dos informes: ahora se conserva solo [verification - resume.md](verification%20-%20resume.md) en validations. No se incluyen documentos automaticamente en commits. `rg` no esta disponible en este entorno; el inventario se obtiene con las herramientas de busqueda del editor.

Se revisaron las fuentes de aplicacion, tests, configuraciones, guias, ambos informes previos y la cabecera del lockfile. El asset PNG se inventario como recurso, sin validar su renderizado; no se auditaron dependencias de terceros ni todos los registros del lockfile. La primera comprobacion documental encontro 66 enlaces locales validos y las nueve rutas GET representadas; no fue una prueba HTTP.

Pendiente para cerrar la fase 1: levantar Compose, consultar `/health`, `/api/metrics` y las otras rutas con sus parametros, contrastar el esquema OpenAPI, ejecutar las pruebas y registrar resultado/comando/fecha. Usar fechas obtenidas de facets o de los movimientos, no asumir que un ano fijo sigue teniendo datos. Mantener separados los resultados estaticos, las ejecuciones y los bloqueos de entorno.