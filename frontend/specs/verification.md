# Rastro de verificacion de la API (fase 1)

Fecha: 2026-11-15. Fuente de verdad: `http://localhost:8000/openapi.json` y llamadas reales con curl al backend levantado con Docker Compose. Marcas: ✅ verificada, ❌ incorrecta, ❓ sin verificar.

Patron de fetch existente en el frontend ([App.tsx](../src/App.tsx)): base `VITE_API_BASE_URL ?? ""` (con vacio, el proxy de Vite reenvia `/api`), `fetch` GET, `!response.ok` lanza `Error`, `response.json()` tipado; estados `loading` y `error` con `useState`. Las specs siguen este patron.

## F1 - Filtro de rango de fechas

Endpoints: `GET /api/metrics/facets` y `GET /api/metrics` (filtros `start_date` / `end_date`).

| Afirmacion | Marca | Evidencia |
| --- | --- | --- |
| `/api/metrics/facets` no tiene parametros y devuelve `min_date` y `max_date` | ✅ | OpenAPI + llamada real |
| `min_date` y `max_date` son `string` con `format: date` (`YYYY-MM-DD`); el 2026-11-15 valian `2025-11-01` y `2026-10-28` | ✅ | Llamada real |
| `/api/metrics` acepta `start_date` y `end_date`, ambos opcionales, `format: date` | ✅ | OpenAPI |
| Sin filtros devuelve el dataset completo (360 movimientos) | ✅ | `/api/metrics` sin parametros |
| Solo `start_date` o solo `end_date` es valido (el otro extremo queda abierto) | ✅ | `?start_date=2026-01-01` -> 200 |
| Fecha mal formada (`start_date=hoy`) -> 422 con `detail[].loc = ["query","start_date"]` | ✅ | Llamada real |
| Rango `2026-01-01..2026-01-31` devuelve solo fechas de enero | ✅ | Primera y ultima fecha: `2026-01-01`, `2026-01-28` |
| `start_date > end_date` -> 200 con `[]` (no hay error de validacion) | ✅ | `?start_date=2026-02-01&end_date=2026-01-01` -> `[]` |
| Fecha fuera del dataset (`start_date=2030-01-01`) -> 200 con `[]` | ✅ | Llamada real |
| `/api/metrics` acepta tambien `category` y `operation_type` (el PM no los pidio) | ✅ | OpenAPI |

Desajustes PM vs API y resolucion en la spec:

1. **Rango del dataset relativo al reloj.** El PM habla de "la fecha mas antigua y mas reciente del dataset"; el backend la deriva de la fecha de hoy. Resolucion: los inputs leen `min_date`/`max_date` de facets en cada carga; la spec no hardcodea fechas.
2. **Rango invertido sin error de API.** Devuelve `[]` y no 422. Resolucion: la UI valida `start_date <= end_date` o trata `[]` como estado vacio; se decide en `components.md`.
3. **`category` y `operation_type` en `/api/metrics`** no estan pedidos. Resolucion: los tipos de F1 solo incluyen `start_date`/`end_date`.

## F2 - Tabla de alertas de anomalias

Endpoint: `GET /api/metrics/alerts`. Parametros (OpenAPI): `threshold` (number, `minimum: 0`, defecto `0.3`), `group_by` (`day | week | month`, defecto `month`), `start_date`, `end_date`, `business_type` (`B2B | B2C`). Respuesta: array de `MetricsAlert` `{period: string, outcome_total: number, baseline_average: number, increase_ratio: number}`, todos requeridos.

| Afirmacion | Marca | Evidencia |
| --- | --- | --- |
| Los cuatro campos de `MetricsAlert` y sus tipos | ✅ | OpenAPI `components.schemas.MetricsAlert` + llamada real |
| `period` es `string` con formato `YYYY-MM` para `group_by=month`; con `day` es `YYYY-MM-DD` | ✅ | Llamadas reales |
| Sin `threshold`, aplica `0.3`: 4 alertas (2025-12, 2026-03, 2026-06, 2026-08) | ✅ | Llamada real |
| `threshold=0.01` -> 5 alertas; `threshold=1.0` -> 1 alerta (2025-12, ratio 1.4968) | ✅ | Llamadas reales |
| `threshold=0` -> 200 (el minimo de la API es 0, no 0.01) | ✅ | Llamada real |
| `threshold=-0.1` -> 422 `greater_than_equal`; `threshold=abc` -> 422 `float_parsing` | ✅ | Llamadas reales |
| `threshold=5` (sobre 1.0) -> 200 con `[]`; la API no impone maximo | ✅ | Llamada real |
| Sin alertas -> 200 con `[]`, no un error | ✅ | `threshold=5` |
| Un rango de un solo mes -> `[]` (el primer periodo nunca genera alerta) | ✅ | `2026-01-01..2026-01-31` -> `[]` |
| El rango de fechas filtra antes de calcular: la base solo usa periodos dentro del rango | ✅ | Codigo `detect_outcome_alerts` aplicado al resumen filtrado |
| `increase_ratio` es un ratio (0.5917 = +59,17 %), no un porcentaje | ✅ | Formula `(outcome - baseline) / baseline` en routes.py |
| `baseline_average` es la **media movil de los 3 periodos anteriores** (wording del PM) | ❌ | Es el promedio de **todos** los periodos anteriores: 2026-03 da 55334.29; la media de 3 previos daria 59977.58 |

Desajustes PM vs API y resolucion en la spec:

1. **Media movil de 3 periodos (PM) vs promedio de todos los anteriores (API).** Decision de la spec: se usa `/api/metrics/alerts` tal cual; la columna se etiqueta `Avg. of previous periods` y la spec documenta la formula real. **Pendiente de confirmar con el PM.** Para cumplir literalmente "3 periodos" hay dos caminos:
   - **Cambiar el backend** (`detect_outcome_alerts`): fuera de alcance de esta entrega.
   - **Calcular en el cliente** con `GET /api/metrics/summary` (gasto por mes; verificado en `/openapi.json`): viable sin tocar la API, pero deja de usar `/alerts` y sus tipos `AlertEntry` / `AlertsResponse`, duplica en el cliente la logica de anomalias y abre decisiones que el PM no definio (que hacer con los primeros periodos, que tienen menos de tres anteriores).

   Se eligio mantener `/alerts` por alinearse con el endpoint que nombra el PM y con los tipos que pide el enunciado. Comprobacion del impacto de la alternativa (2026-11-16, umbral 0.3, dataset completo, calculada a partir de `/summary`): con el promedio de todos los anteriores (API) hay alertas en 2025-12, 2026-03, 2026-06 y 2026-08; con la media de hasta 3 previos, las mismas cuatro fechas pero con otros valores (2026-03: base 59977.58 e incremento 0.4685, frente a 55334.29 y 0.5917); con exactamente 3 previos desaparece 2025-12, que no tiene tres periodos anteriores.
2. **Rango del umbral.** PM: `0.01` a `1.0`; API: `>= 0` sin maximo. Resolucion: la restriccion `0.01-1.0` es validacion de la UI (input `min=0.01`, `max=1`, `step=0.01`), no del backend.
3. **"Incremento porcentual".** La API devuelve un ratio (`increase_ratio`), no un porcentaje. Resolucion: la UI multiplica por 100 y formatea (ej. `59,17 %`); el tipo conserva el ratio sin transformar.
4. **"Outcome registrado".** El campo real se llama `outcome_total`.
5. **El filtro de fechas de F1 aplica a alertas** via `start_date` / `end_date` (comprobado en OpenAPI). Con un rango de un solo periodo o sin datos el resultado es `[]`, que es el estado vacio que debe mostrar la UI.
6. **Granularidad del periodo no especificada.** El PM solo dice "periodo"; la API admite `group_by = day | week | month` (defecto `month`). Decision de alcance: granularidad fija mensual. La UI no envia `group_by` y no ofrece selector; `AlertsParams` incluye solo `threshold` y `DateRangeFilter`. `AlertEntry.period` se documenta como `YYYY-MM`. `day` y `week` existen en la API pero quedan fuera de alcance; el formato de `period` con `week` no se verifico (❓). Un selector futuro exigiria anadir `group_by` a los tipos y revisar el formato de `period`, sin cambios de backend.

## F3 - Vista comparativa B2B vs B2C

Endpoints: `GET /api/metrics/categories/top` y `GET /api/metrics/facets`. Parametros de `top` (OpenAPI): `operation_type` (`income | outcome`, defecto `outcome`), `limit` (integer, 1 a 20, defecto 5), `start_date`, `end_date`, `business_type` (`B2B | B2C`). Respuesta: array de `TopCategoryItem` `{category: enum, operation_type: enum, total_amount: number}`, todos requeridos. `facets` devuelve `MetricsFacets` `{operation_types, business_types, categories, min_date, max_date}`, todos requeridos.

| Afirmacion | Marca | Evidencia |
| --- | --- | --- |
| `top` acepta `business_type` (la URL del PM no lo menciona, es necesario para separar los grupos) | ✅ | OpenAPI + llamadas reales |
| Hay que enviar `operation_type=income` explicito: el defecto es `outcome` | ✅ | Llamada sin `operation_type` devuelve outcome |
| `limit` fuera de 1-20 -> 422 (`limit=0`, `limit=21`); `business_type=B2X` -> 422 `literal_error` | ✅ | Llamadas reales |
| Top de ingresos B2B: `sales` 557903.97, `others` 57636.75 (2 filas, no 5) | ✅ | Llamada real |
| Top de ingresos B2C: `sales` 574193.41, `others` 68412.74 (2 filas, no 5) | ✅ | Llamada real |
| Con `limit=20` el resultado es igual: solo existen 2 categorias con ingreso por grupo | ✅ | Llamada real |
| Los ingresos solo caen en `sales` y `others` (B2B: 89 y 12 movimientos; B2C: 86 y 10) | ✅ | `/api/metrics/b2b` y `/b2c` con `operation_type=income` |
| La suma del top coincide con el total de ingresos del grupo: B2B 615540.72, B2C 642606.15 | ✅ | Suma de movimientos vs suma del top |
| `TopCategoryItem` no incluye porcentaje ni total del grupo | ✅ | OpenAPI |
| Rango sin datos (`start_date=2030-01-01`) -> 200 con `[]` | ✅ | Llamada real |
| `facets.categories` da las categorias de cada grupo B2B y B2C (wording del PM) | ❌ | Es una lista **global** de 5 categorias; incluye `administrative`, `operational` y `suppliers`, que no tienen ingresos |
| `facets.business_types` lista los grupos `B2B` y `B2C` | ✅ | Llamada real |
| El top-5 mostrara 5 categorias por grupo (wording del PM) | ❌ | Con el catalogo actual (5 categorias, 2 con ingreso) solo salen 2 filas |

Desajustes PM vs API y resolucion en la spec:

1. **Categorias por grupo desde facets.** Facets no tiene categorias por grupo. Resolucion: las filas de cada tabla se toman de la respuesta de `top` con `business_type`; de facets solo se usan `min_date` / `max_date` (rango del filtro compartido). `business_types` confirma los dos grupos `B2B` y `B2C`, pero la vista no lo consulta: las dos secciones son siempre B2B y B2C. La spec no pinta categorias fijas.
2. **"5 categorias principales".** `limit=5` es un maximo, no una garantia. Resolucion: cada tabla renderiza de 0 a 5 filas segun la respuesta, sin rellenar filas vacias; con `[]` muestra estado vacio propio por panel.
3. **Porcentaje sobre el total del grupo.** La API no lo devuelve. Resolucion: el cliente calcula `total_amount / suma(total_amount del grupo)`. Es valido porque solo existen 5 categorias y `limit=5` las cubre todas, asi que la suma del top es el total del grupo (comprobado: 615540.72 y 642606.15). Si el catalogo creciera por encima de 5, habria que subir `limit` (maximo 20).
4. **Grafico unico B2B vs B2C.** No hay endpoint con totales por grupo. Resolucion: el total de cada grupo es la suma de `total_amount` de su respuesta `top`; se pintan dos barras.
5. **`operation_type=income` obligatorio** en ambas llamadas (el defecto es `outcome`); es un valor fijo de la vista, no un filtro de usuario.
6. **Dos llamadas independientes**, una por `business_type`. El filtro de fechas se envia a ambas con los mismos `start_date` / `end_date`.

## Verificacion de tipos de las specs (hallazgo)

`npx tsc --noEmit` (desde `frontend/`) termina con exit 0 pero **no compila `frontend/specs/`**: `tsconfig.json` tiene `"files": []` y solo referencias, y `tsconfig.app.json` incluye unicamente `src`. Su exito no prueba nada sobre las specs. Ademas el proyecto no declara `strict`. Marca: ✅ (comprobado el 2026-11-15).

Decision: no modificar la configuracion del proyecto. Se ejecutan los dos comandos y se registran ambos resultados:

```sh
# 1. Comando del enunciado (no cubre specs)
npx tsc --noEmit

# 2. Comprobacion real de las specs, en modo estricto
npx tsc --ignoreConfig --noEmit --strict --target es2023 --module esnext --moduleResolution bundler --verbatimModuleSyntax --skipLibCheck specs/api-types.ts specs/param-types.ts
```

Control negativo (2026-11-15): un archivo temporal con `period: 1` sobre `AlertEntry` falla con `TS2322`, asi que el comando 2 detecta errores de tipo. El archivo se borro tras la prueba.

| Archivo | Comando 2 | Resultado |
| --- | --- | --- |
| `api-types.ts` | `--strict` | exit 0 (2026-11-15) |
| `param-types.ts` | `--strict` | exit 0 (2026-11-15); control negativo con `threshold: "0.3"`, `operation_type: "revenue"`, `limit: "5"` falla con TS2322 |

## Parametros vacios (comprobado al redactar param-types.ts)

| Afirmacion | Marca | Evidencia |
| --- | --- | --- |
| `start_date=` o `end_date=` con cadena vacia -> 422 (`date_from_datetime_parsing`, "input is too short") | ✅ | `GET /api/metrics?start_date=&end_date=` |
| `threshold=` vacio -> 422 (`float_parsing`) | ✅ | `GET /api/metrics/alerts?threshold=` |

Resolucion en la spec: un input vacio se traduce en **omitir el parametro** de la query string, nunca en enviarlo vacio. Aplica a `start_date`, `end_date` y `threshold`.

## Verificacion de tipos contra OpenAPI (fase 2)

Fecha: 2026-11-15. El mantenedor comparo cada tipo con Swagger (`/docs`, seccion Schemas y Parameters) y confirmo la coincidencia. Marca ✅ en todas las filas.

| # | Tipo de la spec | Fuente en `/docs` | Que se comprobo | Marca |
| --- | --- | --- | --- | --- |
| 1 | `FacetsResponse` | Schema `MetricsFacets` | 5 campos obligatorios; `min_date` y `max_date` string `date`; enums | ✅ |
| 2 | `AlertEntry` | Schema `MetricsAlert` | 4 campos obligatorios, `period` string, tres number; sin campos extra | ✅ |
| 3 | `CategoryEntry` | Schema `TopCategoryItem` | 3 campos obligatorios; sin campo de porcentaje | ✅ |
| 4 | `DateRangeFilter` | `GET /api/metrics`, parametros `start_date` y `end_date` | string `date`, ambos opcionales | ✅ |
| 5 | `AlertsParams`, `AlertsResponse` | `GET /api/metrics/alerts` | `threshold` number, minimo 0, defecto 0.3, sin maximo; respuesta 200 es array de `MetricsAlert`; `group_by` y `business_type` existen y quedan fuera de la spec | ✅ |
| 6 | `TopCategoriesParams`, `TopCategoriesResponse` | `GET /api/metrics/categories/top` | `operation_type` (defecto `outcome`), `limit` 1-20 (defecto 5), `business_type`, fechas; respuesta 200 es array de `TopCategoryItem` | ✅ |

Nota: Swagger UI bloquea en el navegador los valores fuera de rango (por ejemplo `threshold=-0.1`) antes de enviar la peticion, asi que no muestra el 422 del servidor. El 422 real se comprobo con curl en la fase 1 y queda registrado arriba.

### Ejecucion final de los dos comandos (2026-11-16)

Desde `frontend/`, con `api-types.ts` y `param-types.ts` juntos:

| Comando | Resultado |
| --- | --- |
| `npx tsc --noEmit` | exit 0 (no compila `specs`; ver hallazgo arriba) |
| `npx tsc --ignoreConfig --noEmit --strict ... specs/api-types.ts specs/param-types.ts` | exit 0 |
