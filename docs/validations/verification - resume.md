# Verificacion y analisis del proyecto

Analisis realizado el 11 de noviembre de 2026 a partir de los archivos del repositorio. Las afirmaciones tecnicas de este documento se vinculan con sus fuentes. No se infiere una base de datos ni endpoints que no esten definidos en el codigo.

Consolidacion realizada el 12 de noviembre de 2026: se conserva la estructura de este informe y se incorporan los detalles relevantes del segundo informe. Esa revision fue estatica. El 13 de noviembre de 2026 se incorpora en la seccion 7 el contraste con evidencia de ejecucion aportada por el mantenedor; las suites siguen pendientes.

## 1. Funcion de la aplicacion

Es un dashboard de metricas financieras. Muestra cuatro KPI (ingresos, egresos, beneficio y margen de beneficio), una serie mensual de ingresos/egresos y otra de margen de beneficio. La interfaz presenta estados de carga y error. El flujo esta implementado en [`frontend/src/App.tsx`](../../frontend/src/App.tsx), con los KPI en [`frontend/src/components/dashboard/kpi-row.tsx`](../../frontend/src/components/dashboard/kpi-row.tsx) y las graficas en [`frontend/src/components/dashboard/income-outcome-chart.tsx`](../../frontend/src/components/dashboard/income-outcome-chart.tsx) y [`frontend/src/components/dashboard/profit-percent-chart.tsx`](../../frontend/src/components/dashboard/profit-percent-chart.tsx).

La app consulta `GET /api/metrics` y calcula los KPI y agregados mensuales en el navegador; no consume desde la interfaz las demas rutas analiticas del backend. Los calculos estan en [`frontend/src/lib/financial-utils.ts`](../../frontend/src/lib/financial-utils.ts). La cabecera muestra el periodo fijo `2024 - Full Year` en [`frontend/src/App.tsx`](../../frontend/src/App.tsx) y [`frontend/src/components/dashboard/dashboard-header.tsx`](../../frontend/src/components/dashboard/dashboard-header.tsx).

## 2. Estructura, lenguajes y datos

| Area | Tecnologia comprobada | Evidencia |
|---|---|---|
| Frontend | TypeScript y React (archivos `.ts`/`.tsx`); estilos CSS con Tailwind CSS v4. Vite sirve y compila el cliente. | [`frontend/package.json`](../../frontend/package.json), [`frontend/vite.config.ts`](../../frontend/vite.config.ts), [`frontend/src/index.css`](../../frontend/src/index.css) |
| Backend | Python 3.13 en la imagen Docker; FastAPI define la API y Uvicorn la sirve. Pydantic define los modelos de respuesta. | [`backend/Dockerfile`](../../backend/Dockerfile), [`backend/requirements.txt`](../../backend/requirements.txt), [`backend/app/main.py`](../../backend/app/main.py), [`backend/app/routes.py`](../../backend/app/routes.py) |
| Base de datos | No se encontro una base de datos configurada: no hay servicio de base de datos en Compose ni driver, ORM, esquema o configuracion de conexion en los archivos inspeccionados. Los movimientos se generan en memoria. | [`docker-compose.yml`](../../docker-compose.yml), [`backend/requirements.txt`](../../backend/requirements.txt), [`backend/app/routes.py`](../../backend/app/routes.py) |
| Datos financieros | Cada ruta analitica vuelve a generar 360 movimientos sinteticos (30 por mes), usando `seed=42`; se ordenan y, segun la ruta, se filtran o agregan antes de responder. | [`backend/app/routes.py`](../../backend/app/routes.py) |

El modelo de movimiento tiene `create_date`, `amount`, `operation_type`, `category` y `business_type`. Los valores admitidos por el backend son `income`/`outcome`, `suppliers`/`sales`/`operational`/`administrative`/`others` y `B2B`/`B2C`; el tipo correspondiente del frontend esta en [`frontend/src/lib/financial-types.ts`](../../frontend/src/lib/financial-types.ts).

El frontend declara React 19 y Tailwind CSS 4, graficos con Recharts, iconos con lucide-react y utilidades de clases clsx/tailwind-merge. Pytest/TestClient comprueban el backend y Vitest las utilidades financieras del cliente. Las dependencias Python declaradas son `fastapi`, `uvicorn[standard]`, `debugpy`, `pytest`, `pytest-cov` y `httpx`, sin versiones fijadas; las dependencias npm resueltas estan en el lockfile. Fuentes: [`frontend/package.json`](../../frontend/package.json), [`frontend/package-lock.json`](../../frontend/package-lock.json), [`backend/requirements.txt`](../../backend/requirements.txt), [`backend/tests/test_routes.py`](../../backend/tests/test_routes.py), [`frontend/src/lib/financial-utils.test.ts`](../../frontend/src/lib/financial-utils.test.ts).

Los modelos Pydantic describen y validan respuestas: no representan tablas persistidas. La semilla fija estabiliza la secuencia aleatoria, pero no las fechas entre distintos momentos del calendario porque el generador consulta `date.today()`.

**Diferencia de periodo:** aunque el titulo del dashboard dice 2024, el backend asigna los movimientos a años relativos a la fecha actual (`_year_for_month` en [`backend/app/routes.py`](../../backend/app/routes.py)). En la fecha de este analisis (noviembre de 2026), esa funcion situa enero-octubre en 2026 y noviembre-diciembre en 2025. Por tanto, el texto fijo de la cabecera no describe el periodo generado por el backend.

## 3. Como se conectan las piezas

```text
Navegador
  -> React (frontend/src/App.tsx)
  -> GET /api/metrics
  -> servidor Vite (proxy /api)
  -> servicio backend:8000 en la red de Docker Compose
  -> FastAPI (backend/app/main.py -> backend/app/routes.py)
  -> movimientos sinteticos -> JSON
  -> calculos de KPI/mes y visualizaciones en React
```

La ruta del proxy esta configurada en [`frontend/vite.config.ts`](../../frontend/vite.config.ts): reenvia `/api` a `http://backend:8000`. Compose define ambos servicios y publica sus puertos en [`docker-compose.yml`](../../docker-compose.yml). El frontend obtiene la base opcional desde `VITE_API_BASE_URL`; si esta vacia o no definida usa una ruta relativa, como documentan [`frontend/src/App.tsx`](../../frontend/src/App.tsx) y [`frontend/.env.example`](../../frontend/.env.example). El backend registra el router desde [`backend/app/main.py`](../../backend/app/main.py).

[`frontend/index.html`](../../frontend/index.html) carga [`frontend/src/main.tsx`](../../frontend/src/main.tsx), que monta `App` en `#root` con `StrictMode` e importa el CSS global. `fetchFinancialData` se llama desde un efecto de montaje; `StrictMode` puede repetir ese efecto en desarrollo, por lo que no se garantiza una sola peticion de red. `backend` es un hostname de la red Compose, no del host Windows; `/health` no tiene proxy configurado.

El middleware CORS permite todos los origenes, metodos y cabeceras, con credenciales habilitadas (`allow_origins=["*"]`, `allow_credentials=True`), segun [`backend/app/main.py`](../../backend/app/main.py). Es la configuracion actual, no una recomendacion de seguridad ni una garantia de acceso desde cualquier entorno.

## 4. Como iniciar y detener

El README del proyecto documenta Docker Compose como metodo de ejecucion local:

```powershell
docker compose up --build
```

Ejecutarlo desde la raiz del repositorio. La publicacion de puertos definida en [`docker-compose.yml`](../../docker-compose.yml) es:

| Servicio | URL local | Puerto del contenedor |
|---|---|---:|
| Frontend | `http://localhost:5173` | 5173 |
| Backend/API | `http://localhost:8000` | 8000 |
| Debugpy | No es una URL HTTP | 5678 |

El frontend reenvia las peticiones `/api` al backend usando el proxy de Vite; no requiere configurar una variable extra en este modo. Para apuntar a otro origen, [`README.md`](../../README.md) indica copiar [`frontend/.env.example`](../../frontend/.env.example) a `.env` y definir `VITE_API_BASE_URL`.

Para detener el comando ejecutado en primer plano, usar `Ctrl+C`. Si se inicio en segundo plano, ejecutar `docker compose down` desde la raiz para detener y retirar los contenedores de este proyecto. El archivo [`backend/Dockerfile`](../../backend/Dockerfile) muestra que el backend inicia Uvicorn con recarga y Debugpy en escucha en el puerto 5678; ese puerto no corresponde a una ruta HTTP de la API.

La documentacion interactiva de FastAPI queda disponible, segun [`README.md`](../../README.md), en `http://localhost:8000/docs`.

Compose monta las fuentes en `/app` y un volumen anonimo para `node_modules`; el frontend declara dependencia de arranque del backend, sin healthcheck ni garantia de disponibilidad. Vite escucha en `0.0.0.0:5173` y Uvicorn en `0.0.0.0:8000`, con recarga. No hay volumen de datos financieros persistentes. `docker compose stop` mantiene los contenedores detenidos y `docker compose start` los reanuda. Fuentes: [`docker-compose.yml`](../../docker-compose.yml), [`frontend/Dockerfile`](../../frontend/Dockerfile), [`backend/Dockerfile`](../../backend/Dockerfile).

Este flujo es de desarrollo. El proxy de Vite no configura por si solo un despliegue productivo de archivos compilados, y el arranque separado en el host necesita resolver el destino de la API. No se ha validado ese modo alternativo.

## 5. API HTTP

Las rutas se declaran en [`backend/app/routes.py`](../../backend/app/routes.py). Todas las rutas de aplicacion definidas son `GET`: no requieren body JSON. Los filtros se envian como parametros de query string. Fechas usan formato ISO `YYYY-MM-DD`; los filtros de fecha son inclusivos. Los tipos y validaciones de parametros estan declarados en ese router. Las pruebas correspondientes estan en [`backend/tests/test_routes.py`](../../backend/tests/test_routes.py).

Se puede llamar directamente al backend (`http://localhost:8000`) o, desde el navegador/cliente servido por Vite, usar el mismo origen y prefijo `/api` que Vite proxya. Ejemplo:

```http
GET http://localhost:8000/api/metrics?start_date=2026-01-01&end_date=2026-03-31&category=sales&operation_type=income
```

### `GET /health`

- **Parametros:** ninguno.
- **Respuesta:** objeto JSON `{"status":"ok"}`.

### `GET /api/metrics`

- **Parametros opcionales:** `start_date`, `end_date` (`YYYY-MM-DD`); `category` (`suppliers`, `sales`, `operational`, `administrative`, `others`); `operation_type` (`income`, `outcome`).
- **Respuesta:** lista ordenada de movimientos.
- **Elemento:** `{"create_date":"YYYY-MM-DD","amount":123.45,"operation_type":"income","category":"sales","business_type":"B2B"}`.
- **Ejemplo:** `GET /api/metrics?start_date=2026-01-01&end_date=2026-03-31&category=sales&operation_type=income`.
- Es la ruta consumida por el dashboard. Fuente: [`backend/app/routes.py`](../../backend/app/routes.py), [`frontend/src/App.tsx`](../../frontend/src/App.tsx).
- No declara filtro `business_type`; usar las rutas B2B/B2C para esos subconjuntos, no asumir que un parametro no declarado se aplica.

### `GET /api/metrics/facets`

- **Parametros:** ninguno.
- **Respuesta:** objeto con `operation_types` (lista), `business_types` (lista), `categories` (lista), `min_date` y `max_date` (fechas ISO).
- Sirve para obtener las opciones disponibles y los extremos del periodo generado. Fuente: [`backend/app/routes.py`](../../backend/app/routes.py).

### `GET /api/metrics/summary`

- **Parametros opcionales:** `group_by` (`day`, `week`, `month`; por defecto `month`); `start_date`, `end_date`; `category`; `operation_type`; `business_type` (`B2B`, `B2C`).
- **Respuesta:** lista de `{ "period": "...", "income": 0.0, "outcome": 0.0, "net": 0.0 }`. `period` representa una fecha, semana ISO o mes segun `group_by`.
- `net = income - outcome`; importes redondeados a dos decimales y periodos ordenados. Formatos: `YYYY-MM-DD`, semana ISO `YYYY-Wnn` o mes `YYYY-MM`.
- **Ejemplo:** `GET /api/metrics/summary?group_by=month&business_type=B2C`.
- Fuente: [`backend/app/routes.py`](../../backend/app/routes.py).

### `GET /api/metrics/categories/top`

- **Parametros opcionales:** `operation_type` (`income`/`outcome`, por defecto `outcome`); `limit` (entero de 1 a 20, por defecto 5); `start_date`, `end_date`; `business_type` (`B2B`/`B2C`).
- **Respuesta:** lista ordenada descendentemente por importe, con `{ "category": "...", "operation_type": "...", "total_amount": 0.0 }`.
- No declara filtro de categoria: agrega los importes por categoria.
- **Ejemplo:** `GET /api/metrics/categories/top?operation_type=outcome&limit=3`.
- Fuente: [`backend/app/routes.py`](../../backend/app/routes.py).

### `GET /api/metrics/comparison`

- **Parametros requeridos:** `start_date` y `end_date` (`YYYY-MM-DD`).
- **Parametro opcional:** `business_type` (`B2B`/`B2C`).
- **Respuesta:** objeto `{ "current_period": 0.0, "previous_period": 0.0, "delta_abs": 0.0, "delta_pct": 0.0 }`. `delta_pct` puede ser `null` cuando el valor neto del periodo anterior es cero. La comparacion utiliza periodos de igual duracion, contiguos segun el calculo del router.
- Compara valores netos; el periodo anterior termina el dia previo al inicio del actual y contiene el mismo numero de dias incluidos. No se valida explicitamente `start_date <= end_date`.
- **Ejemplo:** `GET /api/metrics/comparison?start_date=2026-03-01&end_date=2026-03-31&business_type=B2B`.
- Fuente: [`backend/app/routes.py`](../../backend/app/routes.py).

### `GET /api/metrics/alerts`

- **Parametros opcionales:** `threshold` (numero >= 0, por defecto `0.3`); `group_by` (`day`, `week`, `month`; por defecto `month`); `start_date`, `end_date`; `business_type` (`B2B`/`B2C`).
- **Respuesta:** lista de alertas `{ "period": "...", "outcome_total": 0.0, "baseline_average": 0.0, "increase_ratio": 0.0 }`. Incluye periodos cuyo egreso excede la media de los periodos anteriores por encima del umbral indicado.
- `threshold` es un ratio decimal: `0.3` equivale al 30%. Se omite el primer periodo, sin historial, y no se emiten alertas para una media previa no positiva. El aumento debe superar estrictamente el umbral.
- **Ejemplo:** `GET /api/metrics/alerts?threshold=0.2&group_by=month`.
- Fuente: [`backend/app/routes.py`](../../backend/app/routes.py).

### `GET /api/metrics/b2b` y `GET /api/metrics/b2c`

- **Parametros opcionales en ambas:** `start_date`, `end_date`; `category`; `operation_type`, con los mismos valores indicados para `/api/metrics`.
- **Respuesta:** lista de movimientos con el mismo formato de `/api/metrics`, restringida respectivamente a `business_type: "B2B"` o `"B2C"` y ordenada por fecha.
- **Ejemplo:** `GET /api/metrics/b2b?operation_type=outcome&category=suppliers`.
- Fuente: [`backend/app/routes.py`](../../backend/app/routes.py); las pruebas comprueban estos filtros en [`backend/tests/test_routes.py`](../../backend/tests/test_routes.py).

Las rutas no definen operaciones de escritura (`POST`, `PUT`, `PATCH` o `DELETE`). Los parametros enumerados y fechas se validan mediante los tipos FastAPI/Pydantic declarados en el backend; no se documentan aqui codigos de error no verificados.

No hay autenticacion declarada. Las fechas, literales y limites tienen validacion FastAPI/Pydantic; los parametros invalidos suelen producir HTTP 422, pendiente de comprobacion runtime. FastAPI aporta ademas `/docs`, `/redoc` y `/openapi.json` por defecto; no son rutas de negocio escritas en el router. Para comprobar ejemplos, obtener primero fechas actuales de facets o de los movimientos: un ano fijo puede devolver listas vacias.

## 6. Inventario de archivos y para que sirven

### Raiz

| Archivo | Funcion |
|---|---|
| [`AGENTS.md`](../../AGENTS.md) | Instruye a los agentes para buscar reglas, skills y memoria del proyecto en carpetas especificas. En la inspeccion no se encontraron archivos en esas carpetas. |
| [`README.md`](../../README.md), [`README.es.md`](../../README.es.md) | Presentan el proyecto e indican como iniciarlo con Compose y las URL locales. |
| [`docker-compose.yml`](../../docker-compose.yml) | Declara los servicios frontend/backend, construccion de imagenes, puertos y volumenes de desarrollo. |
| [`.gitignore`](../../.gitignore) | Excluye secretos locales, dependencias, caches y artefactos de ejecucion/build de Python, Node y Docker. |

### Documentacion de validacion

| Archivo | Funcion |
|---|---|
| [verification - resume.md](verification%20-%20resume.md) | Informe canonico consolidado; mantiene la estructura del antiguo informe de la raiz. |
| [01-structure.md](01-structure.md) | Mapa de estructura, servicios, entry points, contratos y limites. |
| [ROADMAP-Project-2.md](../entregables/ROADMAP-Project-2.md) | Plan de las cuatro fases con hitos, evidencias y commits independientes. |

### Backend

| Archivo | Funcion |
|---|---|
| [`backend/Dockerfile`](../../backend/Dockerfile) | Construye la imagen Python 3.13, instala dependencias y arranca Debugpy/Uvicorn. |
| [`backend/requirements.txt`](../../backend/requirements.txt) | Dependencias Python: FastAPI, Uvicorn, Debugpy y herramientas de pruebas. |
| [`backend/app/__init__.py`](../../backend/app/__init__.py) | Marca `app` como paquete Python. |
| [`backend/app/main.py`](../../backend/app/main.py) | Crea la instancia FastAPI, configura CORS y registra el router. |
| [`backend/app/routes.py`](../../backend/app/routes.py) | Modelos, datos sinteticos, filtros, agregaciones y todas las rutas HTTP descritas arriba. |
| [`backend/tests/conftest.py`](../../backend/tests/conftest.py) | Agrega la raiz de `backend` a `sys.path` para los tests. |
| [`backend/tests/test_routes.py`](../../backend/tests/test_routes.py) | Pruebas de generacion, orden, filtros y respuestas de las rutas. |

### Frontend: configuracion y recursos publicos

| Archivo | Funcion |
|---|---|
| [`frontend/Dockerfile`](../../frontend/Dockerfile) | Construye con Node 24, instala paquetes y arranca Vite en el puerto 5173. |
| [`frontend/package.json`](../../frontend/package.json) | Dependencias y scripts de desarrollo, build, lint y Vitest. |
| [`frontend/package-lock.json`](../../frontend/package-lock.json) | Versiones concretas resueltas para instalaciones npm reproducibles. |
| [`frontend/vite.config.ts`](../../frontend/vite.config.ts) | Configura plugins React/Tailwind, alias `@` y proxy `/api` hacia `backend:8000`. |
| [`frontend/tsconfig.json`](../../frontend/tsconfig.json), [`frontend/tsconfig.app.json`](../../frontend/tsconfig.app.json), [`frontend/tsconfig.node.json`](../../frontend/tsconfig.node.json) | Configuracion TypeScript compartida y especifica de la app y de Vite. |
| [`frontend/eslint.config.js`](../../frontend/eslint.config.js) | Reglas ESLint para TypeScript, React Hooks y React Refresh. |
| [`frontend/components.json`](../../frontend/components.json) | Configuracion de componentes estilo shadcn, alias y hoja de estilos; no es una ruta de ejecucion. |
| [`frontend/index.html`](../../frontend/index.html) | Documento HTML de entrada: define `#root`, favicon y carga `src/main.tsx`. |
| [`frontend/.env.example`](../../frontend/.env.example) | Plantilla vacia para el override opcional `VITE_API_BASE_URL`. |
| [`frontend/.gitignore`](../../frontend/.gitignore) | Excluye logs, dependencias Node, salida de build y archivos locales del editor. |
| [`frontend/public/favicon.svg`](../../frontend/public/favicon.svg) | Icono publico referenciado desde `frontend/index.html`. |

### Frontend: codigo de interfaz

| Archivo | Funcion |
|---|---|
| [`frontend/src/main.tsx`](../../frontend/src/main.tsx) | Punto de entrada React; monta `App` dentro de `StrictMode`. |
| [`frontend/src/App.tsx`](../../frontend/src/App.tsx) | Obtiene metricas, administra carga/error y organiza cabecera, KPI y graficas. |
| [`frontend/src/index.css`](../../frontend/src/index.css) | Tailwind CSS, tokens de tema claro/oscuro y estilos globales. |
| [`frontend/src/lib/financial-types.ts`](../../frontend/src/lib/financial-types.ts) | Tipos TypeScript de movimientos, KPI y datos mensuales. |
| [`frontend/src/lib/financial-utils.ts`](../../frontend/src/lib/financial-utils.ts) | Calcula KPI, agrupa por mes y formatea moneda/porcentajes. |
| [`frontend/src/lib/financial-utils.test.ts`](../../frontend/src/lib/financial-utils.test.ts) | Pruebas Vitest de esos calculos y formateadores. |
| [`frontend/src/lib/mock-data.ts`](../../frontend/src/lib/mock-data.ts) | Exporta una lista local de movimientos de ejemplo; no se encontro importacion/uso de `mockMovements` en el codigo frontend inspeccionado. |
| [`frontend/src/lib/utils.ts`](../../frontend/src/lib/utils.ts) | Combina clases CSS con `clsx` y `tailwind-merge`. |
| [`frontend/src/components/dashboard/dashboard-header.tsx`](../../frontend/src/components/dashboard/dashboard-header.tsx) | Cabecera del panel y etiqueta del periodo. |
| [`frontend/src/components/dashboard/kpi-row.tsx`](../../frontend/src/components/dashboard/kpi-row.tsx) | Organiza las cuatro tarjetas KPI y delega su formato a las utilidades financieras. |
| [`frontend/src/components/dashboard/kpi-card.tsx`](../../frontend/src/components/dashboard/kpi-card.tsx) | Presenta una metrica, icono, variante visual y placeholder de carga. |
| [`frontend/src/components/dashboard/income-outcome-chart.tsx`](../../frontend/src/components/dashboard/income-outcome-chart.tsx) | Grafica mensual de ingresos y egresos con Recharts. |
| [`frontend/src/components/dashboard/profit-percent-chart.tsx`](../../frontend/src/components/dashboard/profit-percent-chart.tsx) | Grafica mensual de margen de beneficio con Recharts. |
| [`frontend/src/components/ui/card.tsx`](../../frontend/src/components/ui/card.tsx) | Primitivas reutilizables para tarjetas y sus secciones. |
| [`frontend/src/components/ui/skeleton.tsx`](../../frontend/src/components/ui/skeleton.tsx) | Placeholder animado utilizado mientras cargan las metricas. |
| [`frontend/src/assets/hero.png`](../../frontend/src/assets/hero.png) | Recurso de imagen raster incluido en el codigo fuente; no se encontro referencia a este archivo en el codigo frontend inspeccionado. |

### Consolidacion de los informes

Por solicitud del mantenedor, el 12 de noviembre de 2026 se compararon los dos informes y se mantuvo la estructura del que estaba en la raiz. Se integraron detalles sobre stack y pruebas, modelos sin persistencia, semilla y calendario, montaje React/StrictMode, CORS, proxy, arranque/parada y contratos de resumen, top, comparacion y alertas. Se corrigieron las afirmaciones de determinismo temporal y peticion unica en desarrollo; no se traslado la afirmacion incorrecta de que el inicializador Python estaba vacio.

El resultado es este unico informe en `docs/validations`; el de la raiz se traslado y dejo de existir como duplicado. Los enlaces se ajustaron a la nueva ubicacion. La consolidacion no implica que los servicios o tests se hayan ejecutado.

## 7. Validacion y limites

- Los nombres y metodos de los endpoints se contrastaron con los decoradores en [`backend/app/routes.py`](../../backend/app/routes.py), y los principales contratos con [`backend/tests/test_routes.py`](../../backend/tests/test_routes.py).
- Los flujos de inicio y puertos se contrastaron con [`README.md`](../../README.md), [`README.es.md`](../../README.es.md), [`docker-compose.yml`](../../docker-compose.yml) y ambos Dockerfiles.
- La revision inicial no ejecuto la aplicacion ni las suites. Posteriormente el mantenedor aporto evidencia de arranque, respuestas HTTP, flujo UI/proxy, ambas suites, lint y FRONTEND-BUILD-01 en [02-handover-checks.md](02-handover-checks.md): 15 tests backend, cinco frontend, ESLint y build TypeScript/Vite aprobados, salida 0. Se conservan los avisos y el primer intento frontend bloqueado. No se modifico codigo ejecutable para obtener estos resultados.
- La ausencia de una base de datos se refiere a los archivos y configuraciones encontrados en este repositorio; no afirma nada sobre servicios externos no descritos por el proyecto.

### Matriz de contraste del resumen

Actualizada el 2026-11-13. ✅ Confirmado para la afirmacion y alcance indicados; ❌ discrepancia observada; ❓ pendiente o evidencia insuficiente. Una confirmacion estatica no equivale a una prueba runtime. Los IDs remiten al [registro de evidencia](02-handover-checks.md); las fuentes de codigo se enlazan en las secciones 1 a 6 de este informe.

| Estado | Afirmacion o criterio | Evidencia y tipo | Limite / accion pendiente |
| --- | --- | --- | --- |
| ✅ | El dashboard implementa cuatro KPI y dos series mensuales | Estatica: App, kpi-row y ambos componentes de graficos (seccion 1); runtime: UI-PROXY-01 muestra KPI y grafico de ingresos/egresos | No se ha comprobado el renderizado de la segunda grafica ni la exactitud global de calculos |
| ✅ | Los movimientos son sinteticos y se generan en memoria; no se encontro una base de datos configurada | Estatica: routes, requirements y Compose (seccion 2) | No afirma ausencia de servicios externos ajenos a la configuracion inspeccionada |
| ✅ | En el flujo Compose observado, React pide /api/metrics y Vite lo reenvia a backend:8000 | Estatica: App y vite.config (seccion 3); runtime: UI-PROXY-01, URL localhost:5173/api/metrics, HTTP 200, servidor uvicorn y muestra de movimientos | No valida despliegue productivo ni una base API alternativa |
| ✅ | Compose permite construir y arrancar los dos servicios de desarrollo | CONFIG-01 y RUN-01 intento 2; instrucciones de README/Compose/Dockerfiles (seccion 4) | No prueba readiness, suites ni build TypeScript completo |
| ✅ | Los puertos publicados son 5173, 8000 y 5678; Debugpy no es HTTP | Estatica y CONFIG-01; HTTP observado en 5173/8000 | No se ha conectado un depurador al puerto 5678 |
| ✅ | La API publica nueve operaciones propias GET | Estatica: decoradores del router; OPENAPI-01, contraste visual en Swagger | Verlas en Swagger no demuestra ejecucion de todas |
| ✅ | La cabecera muestra el literal fijo 2024 - Full Year y no refleja las fechas relativas del generador | Estatica: App y routes; runtime: UI-PROXY-01 y FACETS-01 | El informe ya advierte esta limitacion; no es una afirmacion incorrecta del resumen |
| ❌ | Criterio de coherencia: el periodo visible del dashboard coincide con los movimientos recibidos | UI-PROXY-01: etiqueta 2024 frente a muestra con fechas de 2025/2026 | Discrepancia de producto, no fallo del proxy. No corregir codigo sin acordar alcance |
| ✅ | La lista completa recibida tiene 360 movimientos, orden global por fecha y extremos coincidentes con facets | METRICS-FULL-01: ambos GET 200, count 360, ordered true, extremos 2025-11-01 / 2026-10-28 y facets_match true | Resumen calculado sobre toda la respuesta, no sobre la muestra UI; no prueba orden dentro de una fecha ni exactitud de sumas globales |
| ❓ | Los KPI y ambas series muestran valores numericamente correctos para toda la respuesta | Estatica: financial-utils; dashboard visible; FRONTEND-TEST-01 aprueba cinco casos de utilidades | Falta contrastar la respuesta completa con un esperado independiente y ambos graficos; la suite no prueba la exactitud global de la UI |
| ❓ | Los estados de carga, vacio y error funcionan en la UI | Implementacion estatica en App y componentes | No se han provocado y observado todos esos estados |
| ❓ | Los comandos de parada tienen el efecto descrito | Estatica: instrucciones de ejecucion; aclaracion en SUMMARY-01 | No hay evidencia de ejecucion de Ctrl+C, stop/start o down; SUMMARY-01 es comprension, no prueba de parada |
| ✅ | Los 15 tests existentes del backend pasan | BACKEND-TEST-01: `15 passed, 1 warning in 1.94s`, salida 0, ejecucion del mantenedor con uv | No implica cobertura exhaustiva; aviso de deprecacion de httpx/TestClient pendiente de evaluacion, sin cambios de dependencias |
| ✅ | Los cinco tests existentes de utilidades frontend pasan | FRONTEND-TEST-01 intento 2: Vitest v4.1.4, un archivo y cinco tests aprobados, 487ms, salida 0 | Cubre KPI, agrupacion mensual y formatos en sus casos de prueba; no valida toda la respuesta ni estados UI. Intento 1 bloqueado conservado |
| ✅ | ESLint pasa con la configuracion frontend existente | FRONTEND-LINT-01: `eslint .`, sin errores ni avisos mostrados, salida 0 | No prueba TypeScript, bundle ni comportamiento UI; no se modifico configuracion para pasar |
| ✅ | El build TypeScript/Vite pasa | FRONTEND-BUILD-01: `tsc -b && vite build`, Vite v8.0.8, 2290 modulos, 917ms, salida 0 | Aviso de chunk JS 584.26 kB (>500 kB), gzip 175.20 kB; no prueba rendimiento ni despliegue. Vulnerabilidades npm pendientes, sin audit fix |

La fila ❌ es un criterio de coherencia de la UI, no una frase que el informe defendiera como cierta. No se inventan afirmaciones falsas para rellenar la matriz.

### Contraste funcional de rutas

| Estado | Ruta GET y afirmacion contrastada | Evidencia runtime / siguiente check |
| --- | --- | --- |
| ✅ | /health devuelve status ok | HEALTH-01, HTTP 200 y cuerpo observado |
| ✅ | /api/metrics devuelve el movimiento conocido e incluye el dia solicitado; operacion/categoria excluyen o conservan ese registro segun el filtro | METRICS-01, FILTER-OP-01/02, FILTER-CAT-01/02 y UI-PROXY-01; no implica todas las combinaciones o lista completa |
| ✅ | /api/metrics/facets devuelve opciones y fechas minima/maxima | FACETS-01 y METRICS-FULL-01: extremos contrastados contra la lista completa; las opciones no se han recalculado sobre todos los movimientos |
| ✅ | /api/metrics/summary devuelve el resumen diario y neto del unico ingreso conocido | SUMMARY-API-01: period 2025-11-01, income 5465.56, outcome 0.0, net 5465.56; no prueba semana/mes, multiples movimientos ni todos los filtros |
| ✅ | /api/metrics/categories/top devuelve el total de sales del unico ingreso conocido | TOP-API-01: category sales, operation_type income, total_amount 5465.56; no prueba suma de varios movimientos, orden entre categorias o limite ante mas resultados |
| ✅ | /api/metrics/comparison compara el dia conocido con neto anterior cero | COMPARISON-API-01: current_period 5465.56, previous_period 0.0, delta_abs 5465.56 y delta_pct null; no prueba base distinta de cero, rangos de varios dias ni filtro de negocio |
| ✅ | /api/metrics/alerts detecta el aumento diario del control conocido | ALERTS-API-01 contra ALERTS-REF-01: unica alerta del dia 6, gastos 1372.08, baseline_average 537.63, increase_ratio 1.5521 > 0.3. No prueba semana/mes, filtro de negocio, igualdad exacta al umbral ni todas las ramas con media cero |
| ✅ | /api/metrics/b2b excluye el movimiento B2C conocido | B2B-API-01: HTTP 200 y lista vacia para 2025-11-01; METRICS-01 muestra un unico registro B2C. No prueba retencion de B2B, rangos mixtos ni todos los filtros |
| ✅ | /api/metrics/b2c conserva el movimiento B2C conocido | B2C-API-01: mismo ingreso de 5465.56, fecha 2025-11-01, income/sales/B2C; no prueba exclusion de B2B, rangos mixtos ni todos los filtros |

### Contraste de validaciones de parametros

| Estado | Afirmacion contrastada | Evidencia / limite |
| --- | --- | --- |
| ✅ | /api/metrics rechaza operation_type invalid | PARAM-OP-01: HTTP 422, literal_error en query/operation_type y valores admitidos income/outcome; no prueba todos los parametros invalidos |
| ✅ | /api/metrics/comparison requiere start_date y end_date | PARAM-DATES-01: HTTP 422 al omitir ambas, dos errores missing en query/start_date y query/end_date; no prueba omision individual ni formatos invalidos |

Cada respuesta nueva se guarda primero en el registro y solo cambia el icono de la afirmacion que realmente comprueba. El resto de valores invalidos no se considera probado por PARAM-OP-01.

### Siguiente comprobacion del hito 1.4

METRICS-FULL-01 confirma el conteo completo, orden por fecha y extremos contra facets. El bloque previsto de API/calidad esta contrastado; hitos 1.4 y 1.5 completados tras aprobacion del contenido por el mantenedor, sin declarar cobertura exhaustiva ni resolver las filas ❓ o la discrepancia ❌ de producto.

Fase 1 integrada mediante [PR #1](https://github.com/EricDevs/ai-eng-financial-dashboard-context-project/pull/1), merge `253b3c6`; main sincronizado, validation-init eliminada local/remota y rama phase-2-engineering-findings preparada desde el merge. [PHASE1-INTEGRATION-01](02-handover-checks.md#phase1-integration-01-merge-limpieza-y-rama-de-fase-2) conserva la evidencia. Siguiente hito 2.1: extraer convenciones API/cliente con fuentes; avisos y vulnerabilidades siguen pendientes de evaluacion.

### Hito 1.1: fork, workspace y rama

Estado: completado el 12 de noviembre de 2026. El mantenedor confirma que el fork esta creado y conectado. Evidencia aportada desde Git Bash:

```text
Rama: validation-init
origin https://github.com/EricDevs/ai-eng-financial-dashboard-context-project.git (fetch)
origin https://github.com/EricDevs/ai-eng-financial-dashboard-context-project.git (push)

git status --short, antes de consolidar:
?? docs/
?? verification.md
```

La rama activa se contrasto ademas con `git branch --show-current`, que devolvio `validation-init`. La salida de remotos demuestra la configuracion local de origin; la existencia del fork se registra con la confirmacion del mantenedor, sin atribuir una prueba de red o push que no se ha realizado. No se han creado commits ni revertido cambios locales.

Estado al 2026-11-13: hitos 1.1-1.7 completados; commits `3f31fdd` y `73f8a49`, PR #1 merged en `253b3c6`, limpieza y rama nueva contrastadas en PHASE1-INTEGRATION-01. Hitos de fase 2 pendientes. Nueve rutas con casos concretos, dos controles negativos, lista completa, ambas suites (15 tests backend y cinco frontend), ESLint y build contrastados. Las filas ❓ y la discrepancia ❌ permanecen explicitas; no se afirma cobertura exhaustiva, siguiendo el [roadmap](../entregables/ROADMAP-Project-2.md). Las notas de integracion posteriores al merge quedan pendientes de versionar en la rama de fase 2.

El 12 de noviembre de 2026 el mantenedor compartio la salida de `docker compose config`, coherente con los servicios, puertos y montajes descritos. Se registra como CONFIG-01 aprobada en [02-handover-checks.md](02-handover-checks.md). Esta comprobacion por si sola no construye imagenes ni demuestra arranque, compilacion frontend o respuestas HTTP; RUN-01, HEALTH-01 y UI-PROXY-01 aportan evidencia posterior de arranque y peticiones, sin sustituir las comprobaciones independientes de suites y build registradas posteriormente.
