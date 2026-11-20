# Especificaciones frontend: contrato de datos

**Version:** 1.11 | **Fecha:** 2026-11-20. Las versiones 1.1 a 1.11 anaden decisiones de implementacion (`DEC-01` a `DEC-44`) y doce criterios nuevos. Los tipos de la API no cambian; la 1.4 cambia un comportamiento de la 1.0 (una fecha fuera del rango disponible pasa a ser error de validacion, DEC-26); detalle en el [historial de components.md](components.md#historial-de-versiones). Planes de implementacion en [docs/plans](../../docs/plans).

Tres funcionalidades nuevas del dashboard financiero, especificadas antes de construirlas. Este documento es el punto de entrada: dice que endpoint consume cada funcionalidad, que tipos usan sus peticiones y respuestas, que valores son validos y que debe mostrar la interfaz en los casos limite. **No hay codigo React ni llamadas a la API en esta entrega**; se implementa a partir de estos archivos, sin hacer preguntas.

## Mapa de archivos

| Archivo | Contenido |
| --- | --- |
| [api-types.ts](api-types.ts) | Tipos de respuesta: `FacetsResponse`, `AlertEntry`, `AlertsResponse`, `CategoryEntry`, `TopCategoriesResponse` |
| [param-types.ts](param-types.ts) | Tipos de parametros de query: `DateRangeFilter`, `AlertsParams`, `TopCategoriesParams` |
| [components.md](components.md) | Componentes, props, estados y **criterios de aceptacion** (IDs `AC-F1-xx`, `AC-F2-xx`, `AC-F3-xx`), invariantes, restricciones y [decisiones de implementacion](components.md#decisiones-de-implementacion) (IDs `DEC-xx`, v1.1 a v1.11) |
| [verification.md](verification.md) | Evidencia: cada afirmacion sobre la API marcada ✅ / ❌ / ❓ con la llamada que la comprueba |

Los criterios de aceptacion estan escritos en notacion EARS y sus IDs no se renumeran. Este README **los enlaza, no los repite**: la fuente de verdad del comportamiento es [components.md](components.md).

## Resumen de endpoints

Todas las rutas son `GET`. La base es `VITE_API_BASE_URL` (vacia en desarrollo: el proxy de Vite reenvia `/api`). Fechas en formato `YYYY-MM-DD`. Un parametro sin valor **se omite**: enviarlo vacio (`start_date=`, `threshold=`) provoca `422`.

| Funcionalidad | Endpoint | Parametros | Respuesta |
| --- | --- | --- | --- |
| F1 | `/api/metrics/facets` | ninguno | [`FacetsResponse`](api-types.ts) |
| F1 | `/api/metrics` | [`DateRangeFilter`](param-types.ts) | `FinancialMovement[]` (ya existe en [`src/lib/financial-types.ts`](../src/lib/financial-types.ts)) |
| F2 | `/api/metrics/alerts` | [`AlertsParams`](param-types.ts) | [`AlertsResponse`](api-types.ts) |
| F3 | `/api/metrics/categories/top` | [`TopCategoriesParams`](param-types.ts) | [`TopCategoriesResponse`](api-types.ts) |

**Errores.** Un valor invalido devuelve `422` con `{ "detail": [{ "loc": [...], "msg": "...", "type": "..." }] }`. La interfaz evita enviarlos (ver [INV-1 a INV-4](components.md#invariantes-y-restricciones-comunes)); si llega un `422` u otra respuesta no 2xx, se trata como un error de carga de esa pieza.

## F1 - Filtro de rango de fechas

Dos inputs de fecha (inicio y fin, opcionales) que filtran todo el dashboard, con el rango disponible del dataset como referencia. Es un **unico filtro compartido** por las tres funcionalidades.

**Endpoints.** `GET /api/metrics/facets` (rango disponible) y `GET /api/metrics` (movimientos filtrados).

**Parametros de `GET /api/metrics`** (tipo [`DateRangeFilter`](param-types.ts)):

| Parametro | Tipo | Obligatorio | Valores validos |
| --- | --- | --- | --- |
| `start_date` | `string` | No | `YYYY-MM-DD`, inclusivo. Otro formato o cadena vacia: `422` |
| `end_date` | `string` | No | `YYYY-MM-DD`, inclusivo. Otro formato o cadena vacia: `422` |

No se envian `category` ni `operation_type`, aunque la API los acepta. La API **no valida** `start_date <= end_date`: un rango invertido o fuera del dataset devuelve `200` con `[]`.

**Respuesta de `facets`** ([`FacetsResponse`](api-types.ts)): `min_date` y `max_date` (`YYYY-MM-DD`), mas `operation_types`, `business_types` y `categories` (esta ultima es una lista global, no por grupo). El rango depende de la fecha de hoy; al 2026-11-15 era `2025-11-01` a `2026-10-28`. Nunca se escribe fijo en la interfaz.

**Casos limite**

| Caso | Que debe mostrar la UI | Criterio |
| --- | --- | --- |
| Solo una fecha informada | Filtra con el otro extremo abierto y lo indica en el encabezado (`From ...` / `Until ...`) | [AC-F1-06](components.md#criterios-de-aceptacion-de-f1-ears), [AC-F1-12](components.md#criterios-de-aceptacion-de-f1-ears) |
| Inicio posterior al fin | `Start date must be on or before end date.`; no se pide nada y se conservan los ultimos datos validos | [AC-F1-09](components.md#criterios-de-aceptacion-de-f1-ears) |
| Rango valido sin movimientos | KPI `—`, graficos en su estado vacio y `No movements found for the selected range.` | [AC-F1-10](components.md#criterios-de-aceptacion-de-f1-ears) |
| `facets` falla | Sin linea de referencia ni `min` / `max`; el dashboard funciona igual | [AC-F1-04](components.md#criterios-de-aceptacion-de-f1-ears) |
| Un input vaciado a mano | Se omite el parametro de la peticion | [AC-F1-08](components.md#criterios-de-aceptacion-de-f1-ears) |

## F2 - Tabla de alertas de anomalias

Tabla bajo los graficos del dashboard con los periodos donde el gasto subio por encima de un umbral configurable.

**Endpoint.** `GET /api/metrics/alerts`.

**Parametros** (tipo [`AlertsParams`](param-types.ts), que incluye `DateRangeFilter`):

| Parametro | Tipo | Obligatorio | Valores validos |
| --- | --- | --- | --- |
| `threshold` | `number` | No | Ratio. La API acepta `>= 0` sin maximo y usa `0.3` por defecto; **la interfaz restringe el input a `0.01`-`1.0`** (ambos inclusive). Negativo o no numerico: `422` |
| `start_date`, `end_date` | `string` | No | Como en F1, del filtro compartido |

No se envian `group_by` (la API agrupa por mes) ni `business_type`.

**Respuesta** ([`AlertsResponse`](api-types.ts) = `AlertEntry[]`), en orden cronologico:

| Campo | Tipo | Significado |
| --- | --- | --- |
| `period` | `string` | `YYYY-MM` |
| `outcome_total` | `number` | Gasto del periodo |
| `baseline_average` | `number` | Promedio del gasto de **todos** los periodos anteriores del rango (no una media movil de 3) |
| `increase_ratio` | `number` | Ratio sobre la base (`0.5917` = +59,17 %); la UI lo muestra como `59.2%` |

Con el umbral por defecto y el dataset completo, el 2026-11-15 habia 4 alertas. El primer periodo del rango nunca genera alerta.

**Casos limite**

| Caso | Que debe mostrar la UI | Criterio |
| --- | --- | --- |
| La API devuelve `[]` (ningun periodo supera el umbral, o el rango tiene un solo periodo) | `No anomalies detected for the current threshold (30.0%).` y `Try a lower threshold or a wider date range.`; la tarjeta no desaparece | [AC-F2-09](components.md#criterios-de-aceptacion-de-f2-ears) |
| Umbral vacio, no numerico o fuera de `0.01`-`1.0` | `Enter a value between 0.01 and 1.0.`; no se pide nada y se conserva el ultimo resultado | [AC-F2-04](components.md#criterios-de-aceptacion-de-f2-ears) |
| Rango de fechas invertido | No se piden alertas; se conserva el ultimo resultado | [AC-F2-06](components.md#criterios-de-aceptacion-de-f2-ears) |
| Falla la peticion | `Could not load anomaly alerts.` solo en la tarjeta, sin banner global | [AC-F2-11](components.md#criterios-de-aceptacion-de-f2-ears) |

## F3 - Vista comparativa B2B vs B2C

Nueva vista, a la que se llega con pestanas por estado (sin router), con dos tablas de categorias de ingreso en paralelo y un grafico de dos barras.

**Endpoint.** `GET /api/metrics/categories/top`, **dos peticiones en paralelo**, una por grupo. `facets` solo aporta el rango del filtro compartido.

**Parametros** (tipo [`TopCategoriesParams`](param-types.ts), que incluye `DateRangeFilter`):

| Parametro | Tipo | Valor en esta vista | Valores validos en la API |
| --- | --- | --- | --- |
| `operation_type` | `'income' \| 'outcome'` | Siempre `income` (el defecto de la API es `outcome`) | `income`, `outcome` |
| `limit` | `number` | Siempre `5` | Entero de `1` a `20`; otro valor: `422` |
| `business_type` | `'B2B' \| 'B2C'` | `B2B` en una peticion y `B2C` en la otra | `B2B`, `B2C`; otro valor: `422` |
| `start_date`, `end_date` | `string` | Del filtro compartido | Como en F1 |

**Respuesta** ([`TopCategoriesResponse`](api-types.ts) = `CategoryEntry[]`), de mayor a menor `total_amount`: `category` (`suppliers`, `sales`, `operational`, `administrative` o `others`), `operation_type` y `total_amount`. **No incluye porcentajes**: el cliente calcula `total_amount / suma de total_amount del grupo`. Es valido porque solo hay 5 categorias y `limit=5` las cubre todas.

**Lo que difiere del brief del PM**

- Las categorias de cada grupo **no salen de `facets`** (su lista es global e incluye categorias sin ingresos); salen de la respuesta de `top`.
- El "top 5" no tiene siempre 5 filas: con los datos actuales los ingresos solo caen en `sales` y `others`, asi que cada grupo muestra 2.

**Casos limite**

| Caso | Que debe mostrar la UI | Criterio |
| --- | --- | --- |
| La respuesta de un grupo es `[]` | `No income in the selected range for {group}.` en esa seccion, sin tabla; la otra seccion sigue normal | [AC-F3-08](components.md#criterios-de-aceptacion-ears) |
| Un grupo con menos de 5 categorias | Solo las filas existentes, sin relleno | [AC-F3-07](components.md#criterios-de-aceptacion-ears) |
| Un grupo vacio y el otro no | El grafico muestra la barra vacia con `$0` | [AC-F3-10](components.md#criterios-de-aceptacion-ears) |
| Ambos grupos vacios | `No income to compare in the selected range.` en lugar del grafico | [AC-F3-11](components.md#criterios-de-aceptacion-ears) |
| Falla la peticion de un grupo | `Could not load {group} income data.` en su seccion y `Could not load the comparison.` en el grafico | [AC-F3-13](components.md#criterios-de-aceptacion-ears) |

## Desajustes entre el brief del PM y la API

Resueltos en la spec, sin tocar el backend. El detalle y la evidencia estan en [verification.md](verification.md).

| El PM pide | La API real | Decision |
| --- | --- | --- |
| Media movil de los 3 periodos anteriores | Promedio de **todos** los periodos anteriores | Se usa `/alerts` tal cual: la columna se llama `Avg. of previous periods` y lleva una linea de ayuda. **Pendiente de confirmar con el PM**: cumplir "3 periodos" exige cambiar el backend (fuera de alcance) o calcularlo en el cliente con `/api/metrics/summary`, alternativa viable que se descarto por alejarse del endpoint y los tipos pedidos (detalle en [verification.md](verification.md)) |
| Umbral entre `0.01` y `1.0` | Acepta `>= 0` sin maximo | La restriccion `0.01`-`1.0` la aplica la interfaz |
| "Incremento porcentual" | Devuelve un ratio | La UI lo multiplica por 100 y lo formatea; el tipo conserva el ratio |
| Categorias de cada grupo desde `facets` | `facets.categories` es global | Se toman de `categories/top` con `business_type` |
| 5 categorias principales por grupo | Solo 2 categorias tienen ingresos | De 0 a 5 filas, sin relleno |
| Porcentaje sobre el total del grupo | La API no lo devuelve | Se calcula en el cliente |
| "Periodo" sin granularidad | `day`, `week` o `month` | Fijo mensual; no se envia `group_by` |
| Una nueva "pagina" sin router en el proyecto | — | Pestanas por estado, sin dependencias nuevas |

## Verificacion de tipos

Desde `frontend/`:

```sh
# 1. Comando del enunciado. Pasa, pero NO compila frontend/specs
npx tsc --noEmit

# 2. Comprobacion real de las specs, en modo estricto
npx tsc --ignoreConfig --noEmit --strict --target es2023 --module esnext --moduleResolution bundler --verbatimModuleSyntax --skipLibCheck specs/api-types.ts specs/param-types.ts
```

El primero no cubre `specs`: `tsconfig.json` solo contiene referencias y `tsconfig.app.json` incluye unicamente `src`. Ademas el proyecto no declara `strict`. Por eso se ejecuta tambien el segundo, sin modificar la configuracion del proyecto.

## Reproducir la verificacion contra la API

Con el backend levantado (`docker compose up --build`), Swagger esta en `http://localhost:8000/docs`. Por ejemplo:

```sh
curl "http://localhost:8000/api/metrics/facets"
curl "http://localhost:8000/api/metrics/alerts?threshold=0.3"
curl "http://localhost:8000/api/metrics/categories/top?operation_type=income&limit=5&business_type=B2B"
```

Swagger bloquea en el navegador los valores fuera de rango antes de enviarlos (por ejemplo `threshold=-0.1`); para ver el `422` real del servidor usa `curl`.

## Fuera de alcance

- Implementar componentes React, llamadas `fetch` o cambios de backend dentro de estas specs. La implementacion se hace aparte, con los planes de [docs/plans](../../docs/plans).
- Un selector de granularidad (`day` / `week`), filtros por `category` u `operation_type`, o un router.
- Corregir el periodo fijo `2024 - Full Year` del encabezado cuando no hay filtro, y los demas gaps conocidos de [memory-bank/status.md](../../memory-bank/status.md).
