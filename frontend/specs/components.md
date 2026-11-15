# Especificacion de componentes

Capa frontend de tres funcionalidades del dashboard financiero. Es una especificacion: no hay codigo React ni llamadas a la API. Tipos en [api-types.ts](api-types.ts) y [param-types.ts](param-types.ts); evidencia de la API en [verification.md](verification.md).

## Convenciones comunes

- Archivos de componentes en `frontend/src/components/dashboard/`, nombre kebab-case y export PascalCase, como los componentes existentes. Imports con el alias `@`.
- Los componentes reciben datos por props y no hacen fetch. El fetch y el estado viven en la pagina (`App`), con el patron actual de `App.tsx`: base `VITE_API_BASE_URL ?? ""`, `fetch` GET, `!response.ok` lanza `Error`, `response.json()` tipado.
- Reutilizar `Card`, `Skeleton`, iconos de lucide y tokens CSS (`--chart-income`, `--chart-outcome`). Importes con `formatCurrency` (USD sin decimales) y porcentajes con `formatPercent` (un decimal), de `@/lib/financial-utils`.
- Textos de la interfaz en ingles, igual que los componentes existentes. Las specs estan en espanol.
- Query string: un parametro con valor `undefined` o cadena vacia **no se envia** (una cadena vacia provoca 422; ver verification.md). Las rutas se construyen con la base de `API_BASE_URL`.
- Los tipos de `specs/` se mueven a `src/lib/` al implementar; las props de esta spec se conservan.
- Los criterios de aceptacion usan notacion EARS (`Cuando`, `Mientras`, `Si ... entonces`, `El sistema deberá`) y tienen un ID estable (`AC-F1-01`, `AC-F2-01`, `AC-F3-01`). Los IDs no se renumeran ni se reutilizan: un criterio retirado se marca como obsoleto y conserva su ID.
- Los invariantes y restricciones que valen para las tres funcionalidades estan al final, en [Invariantes y restricciones comunes](#invariantes-y-restricciones-comunes).

### Utilidades compartidas (en `@/lib/financial-utils.ts`)

```ts
import type { DateRangeFilter } from './param-types'

/** true si falta alguna de las dos fechas o si `start_date <= end_date` (limites inclusivos; la comparacion de cadenas YYYY-MM-DD es cronologica). Un rango con la misma fecha en ambos extremos es valido. */
export function isValidDateRange(filter: DateRangeFilter): boolean
```

Las usan F1, F2 y F3 para decidir si se piden datos.

## F1 - Filtro de rango de fechas

### Componentes

| Componente | Archivo | Responsabilidad |
| --- | --- | --- |
| `DateRangePicker` | `date-range-picker.tsx` | Dos inputs de fecha (inicio y fin), referencia del rango disponible, boton para limpiar y mensaje de rango invalido |
| `App` (pagina) | `App.tsx` | Estado del filtro, carga de facets y de movimientos, validacion antes de pedir datos, aviso de rango sin movimientos |

`DateRangePicker` es **un unico filtro compartido por toda la aplicacion** (dashboard, alertas y vista B2B vs B2C). Se coloca debajo de `DashboardHeader` y de la barra de pestanas (ver F3), por encima del contenido de la pestana activa, de modo que es visible y editable en ambas.

El estado `filter: DateRangeFilter` y `bounds` viven en `App`, no en las pestanas: al cambiar de pestana se desmonta la vista pero el filtro se conserva, y la pestana que se activa pide sus datos con el filtro vigente.

### Props de `DateRangePicker`

```ts
import type { FacetsResponse } from './api-types'
import type { DateRangeFilter } from './param-types'

interface DateRangePickerProps {
  /** Filtro actual. Una clave ausente significa input vacio. */
  value: DateRangeFilter
  /** Se llama en cada cambio, tambien con rango invalido. Un input vacio omite su clave. */
  onChange: (next: DateRangeFilter) => void
  /** Rango del dataset (de facets). null si facets aun no cargo o fallo. */
  bounds: Pick<FacetsResponse, 'min_date' | 'max_date'> | null
  /** true mientras se carga facets. */
  boundsLoading?: boolean
}
```

El componente es controlado: no guarda las fechas en estado propio. Cada input es un `<input type="date">`, que entrega `YYYY-MM-DD` o `''`; el componente convierte `''` en clave omitida.

### Renderizado condicional

| Condicion | Que se muestra |
| --- | --- |
| `boundsLoading` | `Skeleton` en la linea de referencia; los inputs siguen activos, sin atributos `min` / `max` |
| `bounds` presente | Texto `Available data: {min_date} to {max_date}` junto a los inputs; ambos inputs con `min={min_date}` y `max={max_date}` |
| `bounds` null y sin carga (facets fallo) | La linea de referencia se oculta, sin banner de error; los inputs funcionan sin `min` / `max` |
| Ninguna fecha informada | Boton `Clear dates` oculto |
| Alguna fecha informada | Boton `Clear dates` visible; al pulsarlo llama `onChange({})` |
| `start_date` > `end_date` | Mensaje `Start date must be on or before end date.` con `role="alert"` bajo los inputs, e inputs con `aria-invalid` |
| `start_date` = `end_date` | Valido (limites inclusivos: un solo dia) |

### Comportamiento de la pagina

1. Al montar, pide `GET /api/metrics/facets` y `GET /api/metrics` (sin filtros) en paralelo. `bounds` sale de `min_date` y `max_date`; el rango no se escribe fijo porque depende de la fecha de hoy.
2. Cada cambio del filtro vuelve a pedir `GET /api/metrics` con `start_date` y/o `end_date` (solo los informados, sin `category` ni `operation_type`). Los KPI y los dos graficos se recalculan con la respuesta. El mismo filtro se pasa a la tabla de alertas (F2) y a la vista B2B vs B2C (F3), que lo reciben por props y piden sus propios datos.
3. **Un solo input de fecha.** Si solo hay `start_date`, el filtro va desde esa fecha hasta el final del dataset; si solo hay `end_date`, desde el inicio hasta esa fecha. Se aplica de inmediato, sin esperar a la otra fecha.
4. **Rango invertido.** No se lanza ninguna peticion; se mantienen en pantalla los ultimos datos validos y `DateRangePicker` muestra el mensaje de error. Al corregir el rango se vuelve a pedir.
5. **Rango sin movimientos** (respuesta `[]`, por ejemplo fechas fuera de `bounds`): los KPI reciben `metrics={null}` y muestran `—` (no `$0`: distingue "sin datos" de un cero valido); los graficos muestran su estado vacio existente `No data available to display`; bajo los inputs aparece `No movements found for the selected range.` con `role="status"`.
6. **Cargando.** Durante cada recarga `loading=true`: KPI y graficos muestran sus `Skeleton`. Si llegan respuestas fuera de orden, solo cuenta la del ultimo filtro.
7. **Error de red o respuesta no 2xx.** Se mantiene el banner de error actual de `App` y los KPI muestran `—`.
8. **Etiqueta de periodo de `DashboardHeader`.** Con filtro activo, la prop `period` muestra el rango efectivo: `{start} — {end}`, `From {start}` o `Until {end}`. Sin filtro conserva su valor actual.

### Casos limite de F1

| Caso | Que debe mostrar la UI |
| --- | --- |
| Solo una fecha | Filtra con extremo abierto y muestra la etiqueta `From ...` o `Until ...` |
| Inicio posterior al fin | Mensaje de rango invalido, sin peticion, datos anteriores intactos |
| Rango sin movimientos | KPI `—`, graficos vacios y aviso `No movements found for the selected range.` |
| Facets falla | Sin linea de referencia ni `min` / `max`; el dashboard funciona igual |
| Fecha tecleada fuera de `bounds` | No es error de validacion; la API responde `[]` y aplica el caso de rango sin movimientos |
| Input vaciado a mano | Se omite el parametro (nunca `start_date=`, que daria 422) |
| Cambio de pestana con filtro activo | El filtro se conserva; la pestana activada muestra sus datos ya filtrados y el rango invertido sigue bloqueando las peticiones en ambas |

### Criterios de aceptacion de F1 (EARS)

| ID | Criterio |
| --- | --- |
| AC-F1-01 | El sistema deberá mostrar bajo el encabezado y las pestanas dos inputs de fecha, inicio y fin, ambos opcionales y vacios al cargar |
| AC-F1-02 | Cuando la aplicacion carga, el sistema deberá pedir `facets` y mostrar junto a los inputs `Available data: {min_date} to {max_date}` |
| AC-F1-03 | Mientras `facets` se carga, el sistema deberá mostrar un `Skeleton` en la linea de referencia sin bloquear los inputs |
| AC-F1-04 | Si `facets` falla, entonces el sistema deberá ocultar la linea de referencia y los limites `min` / `max` de los inputs sin mostrar un error, y el dashboard deberá funcionar igual |
| AC-F1-05 | Cuando el usuario cambia una fecha y el rango es valido, el sistema deberá pedir `GET /api/metrics` solo con las fechas informadas y recalcular los KPI y los dos graficos con la respuesta |
| AC-F1-06 | Cuando solo hay una fecha informada, el sistema deberá filtrar con el otro extremo abierto, sin esperar a la otra fecha |
| AC-F1-07 | Cuando ambas fechas son iguales, el sistema deberá tratarlo como un rango valido de un solo dia |
| AC-F1-08 | Cuando el usuario vacia un input, el sistema deberá omitir ese parametro de la peticion |
| AC-F1-09 | Mientras la fecha de inicio sea posterior a la de fin, el sistema no deberá pedir datos, deberá mantener los ultimos datos validos y mostrar `Start date must be on or before end date.` |
| AC-F1-10 | Si la respuesta es `[]` (rango valido sin movimientos), entonces el sistema deberá mostrar `—` en los KPI, el estado vacio existente en los graficos y `No movements found for the selected range.` |
| AC-F1-11 | Mientras haya alguna fecha informada, el sistema deberá mostrar el boton `Clear dates`; al pulsarlo deberá vaciar ambas fechas y pedir los datos sin filtro |
| AC-F1-12 | Mientras haya un filtro activo, el sistema deberá mostrar en `DashboardHeader` el rango efectivo: `{start} — {end}`, `From {start}` o `Until {end}` |
| AC-F1-13 | Si la peticion de movimientos falla, entonces el sistema deberá mostrar el banner de error actual de `App` y `—` en los KPI |
| AC-F1-14 | Si llegan respuestas fuera de orden, el sistema deberá mostrar solo la correspondiente al ultimo filtro |

### Restricciones negativas de F1

- No escribir fechas fijas en la interfaz (ni el ano `2024` ni el rango del dataset): salen de `facets`.
- No enviar `category` ni `operation_type` a `GET /api/metrics`.
- No montar un segundo selector de fechas en ninguna vista.
- No enviar un parametro con cadena vacia.
- No modificar el backend ni la firma de `DashboardHeader` (la prop `period` ya existe y es un `string`).

## F2 - Tabla de alertas de anomalias

Se muestra en la pestana del dashboard principal, **debajo de los graficos existentes**. Usa el filtro de fechas compartido de F1.

### Componentes

| Componente | Archivo | Responsabilidad |
| --- | --- | --- |
| `AlertsTable` | `alerts-table.tsx` | `Card` con titulo, input de umbral y la tabla de cuatro columnas, o su estado de carga, vacio o error |
| `ThresholdInput` | `threshold-input.tsx` | Input numerico del umbral con su ayuda y su mensaje de error; lo renderiza `AlertsTable` |
| `App` (pagina) | `App.tsx` | Estado del umbral, peticion a la API, validacion y resultado vigente |

### Utilidades (en `@/lib/financial-utils.ts`)

```ts
export const THRESHOLD_MIN = 0.01
export const THRESHOLD_MAX = 1
export const THRESHOLD_DEFAULT = 0.3

/** Devuelve el umbral si el texto es un numero finito entre THRESHOLD_MIN y THRESHOLD_MAX (ambos inclusive); si no, null. Texto vacio -> null. */
export function parseThreshold(text: string): number | null
```

### Props

```ts
import type { AlertsResponse } from './api-types'

interface AlertsTableProps {
  /** Ultimo resultado valido. null si aun no hay resultado (primera carga o error). */
  alerts: AlertsResponse | null
  /** Umbral al que corresponde `alerts` (el ultimo aplicado, no el texto tecleado). */
  appliedThreshold: number
  /** Texto actual del input (puede ser invalido). */
  thresholdText: string
  /** Se llama en cada cambio del input. */
  onThresholdChange: (text: string) => void
  loading?: boolean
  /** true si la ultima peticion fallo. */
  error?: boolean
}

interface ThresholdInputProps {
  value: string
  onChange: (text: string) => void
}
```

La peticion es `GET /api/metrics/alerts` con los parametros de `AlertsParams`: `threshold` y, si estan informados, `start_date` y `end_date` del filtro compartido. **Nunca** se envia `group_by` (la API agrupa por mes) ni `business_type`.

### Tabla

| Columna | Campo (`AlertEntry`) | Formato |
| --- | --- | --- |
| `Period` | `period` | Tal cual, `YYYY-MM` |
| `Outcome` | `outcome_total` | `formatCurrency` |
| `Avg. of previous periods` | `baseline_average` | `formatCurrency` |
| `Increase` | `increase_ratio` | `formatPercent(increase_ratio * 100)`; el ratio `0.5917` se muestra `59.2%` |

Las filas conservan el orden de la API (cronologico ascendente); no se reordena en el cliente. Bajo el titulo, una linea de ayuda: `Average outcome of all earlier periods in the selected range.` (la API promedia todos los periodos anteriores, no una media movil de 3; ver verification.md).

### `ThresholdInput`

`<input type="number">` con `min=0.01`, `max=1`, `step=0.01`, etiqueta `Alert threshold` y ayuda `Ratio between 0.01 and 1.0 (default 0.3).` Valor inicial `'0.3'`. Los extremos 0.01 y 1.0 son validos. Un texto vacio o no numerico (el navegador entrega `''` para una entrada que no es un numero, por ejemplo `0,3`) es invalido.

### Renderizado condicional

| Condicion | Que se muestra |
| --- | --- |
| `loading` | Titulo e input visibles; el cuerpo muestra 3 filas de `Skeleton`; el input sigue activo |
| `error` | Cuerpo: `Could not load anomaly alerts.`; la tabla se oculta; el input sigue activo |
| `alerts` con filas | Tabla de cuatro columnas |
| **`alerts` vacio (`[]`)** | Titulo, input y cabecera de la tabla siguen visibles; el cuerpo muestra `No anomalies detected for the current threshold ({formatPercent(appliedThreshold * 100)}).` y debajo `Try a lower threshold or a wider date range.` La tabla **no desaparece** |
| `parseThreshold(thresholdText)` es null | Bajo el input: `Enter a value between 0.01 and 1.0.` con `role="alert"` e `aria-invalid`; la tabla sigue mostrando el ultimo resultado valido |

### Comportamiento de la pagina

1. Al montar pide las alertas con `threshold=0.3` y el filtro vigente.
2. Cada cambio de texto: si `parseThreshold` da un numero **y** el rango de fechas es valido, se vuelve a pedir; si no, no hay peticion y se conserva el ultimo resultado. `appliedThreshold` solo cambia cuando se aplica un valor valido.
3. Un cambio del filtro de fechas (F1) vuelve a pedir las alertas con el umbral aplicado. Con rango invertido no hay peticion.
4. Si llegan respuestas fuera de orden, solo cuenta la del ultimo umbral y filtro.
5. Un fallo de esta peticion solo afecta a la tabla (`error`); no activa el banner global de `App` ni vacia los KPI.

### Casos limite de F2

| Caso | Que debe mostrar la UI |
| --- | --- |
| Ningun periodo supera el umbral (con el dataset completo y `1.0` la API aun da una alerta, 2025-12 con ratio 1.4968; un `[]` aparece al acotar las fechas) | Estado vacio con el umbral aplicado y la sugerencia; titulo, input y cabecera permanecen |
| Rango con un solo periodo o sin movimientos (la API da `[]`: el primer periodo nunca genera alerta) | El mismo estado vacio y la sugerencia de ampliar el rango |
| Umbral fuera de rango (`0`, `5`, `-0.1`) | Error bajo el input, sin peticion, tabla con el ultimo resultado valido |
| Input vacio o `0,3` | Se trata como invalido igual que el caso anterior |
| Umbral en un extremo (`0.01` o `1.0`) | Valido; se pide a la API |
| Fallo de red o respuesta no 2xx | `Could not load anomaly alerts.` solo en la tarjeta de alertas |
| Rango de fechas invertido | Sin peticion; la tabla conserva el ultimo resultado y el filtro muestra su error |

### Criterios de aceptacion de F2 (EARS)

| ID | Criterio |
| --- | --- |
| AC-F2-01 | El sistema deberá mostrar bajo los graficos del dashboard una tarjeta de alertas con titulo, un input de umbral con valor inicial `0.3` y una tabla de cuatro columnas: `Period`, `Outcome`, `Avg. of previous periods` e `Increase` |
| AC-F2-02 | Cuando la aplicacion carga, el sistema deberá pedir `GET /api/metrics/alerts` con `threshold=0.3` y el filtro de fechas vigente |
| AC-F2-03 | Cuando el usuario cambia el umbral a un valor de `0.01` a `1.0` (ambos inclusive) y el rango de fechas es valido, el sistema deberá pedir las alertas con ese umbral y mostrar el resultado |
| AC-F2-04 | Si el texto del umbral esta vacio, no es un numero o esta fuera de `0.01` a `1.0`, entonces el sistema no deberá pedir datos, deberá mostrar `Enter a value between 0.01 and 1.0.` y conservar el ultimo resultado valido |
| AC-F2-05 | Cuando cambia el filtro de fechas, el sistema deberá volver a pedir las alertas con el ultimo umbral aplicado y las fechas informadas |
| AC-F2-06 | Mientras el rango de fechas sea invalido, el sistema no deberá pedir alertas y deberá conservar el ultimo resultado |
| AC-F2-07 | El sistema deberá mostrar cada alerta con su periodo `YYYY-MM`, el outcome y el promedio con `formatCurrency` y el incremento como `increase_ratio * 100` con `formatPercent`, en el orden de la API |
| AC-F2-08 | El sistema deberá mostrar bajo el titulo de la tarjeta la linea `Average outcome of all earlier periods in the selected range.` |
| AC-F2-09 | Si la respuesta es `[]`, entonces el sistema deberá mostrar `No anomalies detected for the current threshold ({umbral aplicado}).` y `Try a lower threshold or a wider date range.`, manteniendo visibles el titulo, el input y la cabecera de la tabla |
| AC-F2-10 | Mientras se cargan las alertas, el sistema deberá mostrar 3 filas de `Skeleton` y mantener el input activo |
| AC-F2-11 | Si falla la peticion de alertas, entonces el sistema deberá mostrar `Could not load anomaly alerts.` solo en la tarjeta, sin activar el banner global ni vaciar los KPI |
| AC-F2-12 | Si llegan respuestas fuera de orden, el sistema deberá mostrar solo la correspondiente al ultimo umbral y filtro |

### Restricciones negativas de F2

- No enviar `group_by` ni `business_type`.
- No reordenar las filas en el cliente.
- No calcular las alertas en el cliente a partir de los movimientos: se usan las del endpoint.
- No llamar a la columna `Avg. of previous periods` "media movil de 3 periodos": la API promedia todos los anteriores.
- No mostrar la tarjeta en la vista `B2B vs B2C`.
- No modificar el backend.

## F3 - Vista comparativa B2B vs B2C

Nueva vista del dashboard, a la que se llega con **pestanas por estado** (decision: sin router ni dependencias nuevas). Usa el filtro de fechas compartido de F1.

### Componentes

| Componente | Archivo | Responsabilidad |
| --- | --- | --- |
| `ViewTabs` | `view-tabs.tsx` | Barra de dos pestanas (`Dashboard` y `B2B vs B2C`) bajo `DashboardHeader` |
| `ComparisonPage` | `comparison-page.tsx` | Pagina de la vista: pide los datos de ambos grupos, los transforma y compone paneles y grafico |
| `GroupTopTable` | `group-top-table.tsx` | Panel de un grupo: titulo y tabla de categorias, o su estado de carga, vacio o error |
| `GroupComparisonChart` | `group-comparison-chart.tsx` | Grafico unico de dos barras con el total de ingresos de cada grupo |
| `App` (pagina) | `App.tsx` | Estado `view` y `filter`; renderiza el dashboard o `ComparisonPage` segun la pestana |

### Tipos y utilidades

```ts
import type { BusinessType, Category } from '../src/lib/financial-types'
import type { TopCategoriesResponse } from './api-types'
import type { DateRangeFilter } from './param-types'

/** Vista activa de la aplicacion. */
type AppView = 'dashboard' | 'comparison'

/** Fila de un panel: dato de la API mas el porcentaje calculado en el cliente. */
interface GroupCategoryRow {
  category: Category
  /** Total de ingresos de la categoria. Viene de `CategoryEntry.total_amount`. */
  total_amount: number
  /** Parte del total del grupo, de 0 a 1. Se muestra como `formatPercent(share * 100)`. */
  share: number
}

/** Total de ingresos de un grupo, para el grafico. */
interface GroupTotal {
  business_type: BusinessType
  /** Suma de `total_amount` de la respuesta del grupo; 0 si la respuesta esta vacia. */
  total_income: number
}

/** Convierte la respuesta en filas con `share = total_amount / suma del grupo` (0 si la suma es 0). Conserva el orden de la API. */
export function toGroupRows(entries: TopCategoriesResponse): GroupCategoryRow[]

/** Suma de `total_amount` de la respuesta (0 si esta vacia). */
export function sumTotals(entries: TopCategoriesResponse): number
```

`isValidDateRange` esta definida en [Utilidades compartidas](#utilidades-compartidas-en-libfinancial-utilsts).

### Props

```ts
interface ViewTabsProps {
  view: AppView
  onChange: (view: AppView) => void
}

interface ComparisonPageProps {
  /** Filtro de fechas compartido; la pagina no tiene su propio selector. */
  filter: DateRangeFilter
}

interface GroupTopTableProps {
  businessType: BusinessType
  /** Filas del grupo, de 0 a 5. Vacio cuando el grupo no tiene ingresos. */
  rows: GroupCategoryRow[]
  loading?: boolean
  /** true si la peticion de este grupo fallo. */
  error?: boolean
}

interface GroupComparisonChartProps {
  /** Siempre dos elementos, en el orden B2B y B2C. */
  totals: GroupTotal[]
  loading?: boolean
  /** true si fallo la peticion de cualquiera de los dos grupos. */
  error?: boolean
}
```

### Datos y peticiones

`ComparisonPage` hace **dos peticiones en paralelo** a `GET /api/metrics/categories/top`, una por grupo, con los parametros de `TopCategoriesParams`: `operation_type: 'income'`, `limit: 5`, `business_type: 'B2B'` o `'B2C'`, y `start_date` / `end_date` del filtro compartido si estan informados. La respuesta es `TopCategoriesResponse`.

Las filas de cada tabla salen **de la respuesta de `top`**, no de `facets.categories` (lista global que incluye categorias sin ingresos; ver verification.md). Las dos secciones son siempre B2B y B2C, en ese orden; `facets.business_types` confirma esos dos valores pero la vista no lo consulta.

### Tablas (`GroupTopTable`)

Titulo `{group} - Top income categories` y descripcion `Top 5 categories by total income`. Columnas:

| Columna | Campo | Formato |
| --- | --- | --- |
| `Category` | `category` | Tal cual, con la primera letra en mayuscula (`Sales`, `Others`) |
| `Total income` | `total_amount` | `formatCurrency` |
| `Share of group` | `share` | `formatPercent(share * 100)` |

El porcentaje es sobre el total del grupo. Ese total es la suma de las filas porque el dataset solo tiene 5 categorias y `limit=5` las cubre todas (comprobado: 615540.72 en B2B y 642606.15 en B2C).

### Grafico (`GroupComparisonChart`)

`BarChart` de Recharts con una barra por grupo. Color de B2B: `var(--chart-1)`; de B2C: `var(--chart-5)` (se evitan `--chart-2` y `--chart-profit`, que ya significan gasto y beneficio). Eje Y y tooltip con `formatCurrency`. Titulo `Income: B2B vs B2C`.

### Criterios de aceptacion (EARS)

| ID | Criterio |
| --- | --- |
| AC-F3-01 | El sistema deberá mostrar bajo el encabezado dos pestanas, `Dashboard` y `B2B vs B2C`, con `Dashboard` activa al cargar |
| AC-F3-02 | Cuando el usuario selecciona `B2B vs B2C`, el sistema deberá mostrar la vista comparativa en lugar de KPI, graficos y alertas, manteniendo visible el selector de fechas con el filtro vigente |
| AC-F3-03 | Cuando el usuario vuelve a `Dashboard`, el sistema deberá mostrarlo con el mismo filtro de fechas |
| AC-F3-04 | Cuando se activa la vista comparativa, o cambia un filtro valido mientras esta activa, el sistema deberá pedir `top` dos veces, con `operation_type=income`, `limit=5` y `business_type` igual a `B2B` y a `B2C`, mas `start_date` y `end_date` si estan informados |
| AC-F3-05 | Mientras el rango de fechas sea invalido, el sistema no deberá pedir datos y deberá conservar el ultimo resultado mostrado |
| AC-F3-06 | El sistema deberá mostrar dos secciones en paralelo, B2B y B2C, cada una con una tabla de categorias con nombre, total de ingresos y porcentaje sobre el total del grupo, en el orden de la API (de mayor a menor total) |
| AC-F3-07 | Si un grupo tiene menos de 5 categorias con ingresos, entonces el sistema deberá mostrar solo esas filas, sin filas de relleno |
| AC-F3-08 | Si la respuesta de un grupo es `[]`, entonces el sistema deberá mostrar en su seccion `No income in the selected range for {group}.` sin tabla, y la otra seccion se mostrara con normalidad |
| AC-F3-09 | El sistema deberá mostrar bajo ambas secciones un unico grafico de dos barras con el total de ingresos de B2B y de B2C |
| AC-F3-10 | Si un grupo esta vacio y el otro no, entonces el grafico deberá mostrar la barra del grupo vacio con total `$0` |
| AC-F3-11 | Si ambos grupos estan vacios, entonces el grafico deberá mostrar `No income to compare in the selected range.` en lugar de las barras |
| AC-F3-12 | Mientras se cargan los datos de un grupo, el sistema deberá mostrar `Skeleton` en su seccion; mientras falte cualquiera de los dos, el grafico deberá mostrar `Skeleton` |
| AC-F3-13 | Si falla la peticion de un grupo, entonces el sistema deberá mostrar `Could not load {group} income data.` en su seccion y `Could not load the comparison.` en el grafico, y la otra seccion se mostrara con normalidad |
| AC-F3-14 | Si llegan respuestas fuera de orden, el sistema deberá mostrar solo la correspondiente al ultimo filtro |

### Invariantes de F3

- **INV-F3-1.** Toda peticion de la vista lleva `operation_type=income` y exactamente un `business_type` (`B2B` o `B2C`).
- **INV-F3-2.** En una tabla con filas, la suma de `share` es 1 (el redondeo a un decimal solo afecta a la presentacion).
- **INV-F3-3.** `total_income` de un grupo es igual a la suma de los `total_amount` de su tabla.

### Restricciones negativas de F3

- No anadir un router ni otra dependencia para la navegacion.
- No usar `/api/metrics/b2b`, `/api/metrics/b2c` ni `/api/metrics/summary`; los datos salen solo de `categories/top`.
- No pintar filas a partir de `facets.categories`.
- No mostrar filas de relleno hasta llegar a 5.
- No enviar `business_type` vacio ni omitirlo en esta vista.
- No modificar el backend ni la firma de `DashboardHeader`, `KPIRow` o de los graficos existentes.

## Invariantes y restricciones comunes

Valen para las tres funcionalidades. Los invariantes son condiciones que nunca deben romperse, hagan lo que hagan el usuario o la API.

### Invariantes

- **INV-1.** Ninguna peticion a la API lleva un parametro con cadena vacia ni con el texto `undefined`.
- **INV-2.** Ninguna peticion lleva `start_date` posterior a `end_date`.
- **INV-3.** Ninguna peticion de alertas lleva un `threshold` fuera de `0.01` a `1.0`.
- **INV-4.** Los parametros de cada peticion pertenecen a `DateRangeFilter`, `AlertsParams` o `TopCategoriesParams` (`param-types.ts`); no se envia ninguno mas.
- **INV-5.** Existe un unico filtro de fechas en la aplicacion y cambiar de pestana no lo modifica.
- **INV-6.** Un error o un estado vacio de una tarjeta o panel nunca oculta el resultado valido de otra.

### Restricciones negativas

- No implementar componentes React ni llamadas a la API como parte de esta entrega: solo especificacion.
- No usar `any`, `object` ni conversiones de tipo para ocultar diferencias con la API.
- No anadir dependencias nuevas.
- No cambiar el idioma, la moneda ni el formato de `formatCurrency` y `formatPercent`.
- No cambiar el backend: los desajustes con el PM se resuelven en esta spec.
