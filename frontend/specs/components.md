# Especificacion de componentes

**Version:** 1.10 | **Fecha:** 2026-11-19 | Cambios en el [Historial de versiones](#historial-de-versiones).

Capa frontend de tres funcionalidades del dashboard financiero. Es una especificacion: no hay codigo React ni llamadas a la API. Tipos en [api-types.ts](api-types.ts) y [param-types.ts](param-types.ts); evidencia de la API en [verification.md](verification.md).

Las versiones 1.1 a 1.3 no cambian el comportamiento de la 1.0: cierran decisiones que la 1.0 dejaba abiertas para poder implementar sin preguntas. La 1.4 **si cambia** un comportamiento de la 1.0, tras la prueba visual de F1: una fecha fuera del rango disponible pasa a ser un error de validacion (DEC-26). La 1.5 fija el aspecto de los errores de F2 y F3 (DEC-29) y la 1.6 la disposicion de la tarjeta de alertas (DEC-30), revisada en la 1.7 (DEC-31); la 1.8 fija el color de la etiqueta del umbral (DEC-32) y corrige el caso `0,3`. La 1.9 cierra los huecos que encontro la prueba de traspaso (DEC-33 a DEC-40) y anade al grafico de F3 la etiqueta de cada barra y una descripcion visible (DEC-38, DEC-39). La 1.10 cierra las tres dudas que el agente encontro al releer la 1.9 (DEC-41 a DEC-43), sin cambiar el comportamiento. Cada una tiene un ID `DEC-xx` y se explica en [Decisiones de implementacion](#decisiones-de-implementacion); en el texto se marcan con la version que la introdujo, por ejemplo `(v1.1, DEC-xx)`.

## Convenciones comunes

- Archivos de componentes en `frontend/src/components/dashboard/`, nombre kebab-case y export PascalCase, como los componentes existentes. Imports con el alias `@`.
- Los componentes reciben datos por props y no hacen fetch. El fetch y el estado viven en la pagina (`App`), con el patron actual de `App.tsx`: base `VITE_API_BASE_URL ?? ""`, `fetch` GET, `!response.ok` lanza `Error`, `response.json()` tipado. Desde la v1.1 ese patron se escribe una sola vez en la [capa de datos compartida](#capa-de-datos-compartida-v11-dec-05), que la pagina usa para pedir (DEC-05).
- Reutilizar `Card`, `Skeleton`, iconos de lucide y tokens CSS (`--chart-income`, `--chart-outcome`). Importes con `formatCurrency` (USD sin decimales) y porcentajes con `formatPercent` (un decimal), de `@/lib/financial-utils`.
- Textos de la interfaz en ingles, igual que los componentes existentes. Las specs estan en espanol.
- Query string: un parametro con valor `undefined` o cadena vacia **no se envia** (una cadena vacia provoca 422; ver verification.md). Las rutas se construyen con la base de `API_BASE_URL`.
- Los tipos de `specs/` se **copian** a `src/lib/api-types.ts` y `src/lib/param-types.ts` al implementar (import cambiado a `./financial-types`); los de `specs/` se conservan como registro del contrato verificado. Las props de esta spec se conservan (v1.1, DEC-01).
- Los parametros de query se escriben en un orden fijo: primero los propios del endpoint y despues `start_date` y `end_date`. Alertas: `threshold`, `start_date`, `end_date`. Top: `operation_type`, `limit`, `business_type`, `start_date`, `end_date` (v1.1, DEC-07).
- **Precedencia de estados** en tarjetas, paneles y graficos nuevos: `loading` > `error` > vacio > datos. Si coinciden carga y error, se muestra la carga. Los avisos de validacion de un input (rango de fechas, umbral) son independientes y se muestran siempre que apliquen (v1.2, DEC-16).
- **Roles ARIA de los mensajes** en F2 y F3: los errores de carga llevan `role="alert"` y los estados vacios `role="status"`, igual que el aviso de rango sin movimientos de F1 (v1.2, DEC-18).
- **Aspecto de los errores** en F2 y F3: todo mensaje de error (validacion del umbral y errores de carga) usa el mismo aviso rojo que F1: borde y fondo rojo translucido (`border-red-500/40`, `bg-red-500/10`), texto rojo claro (`text-red-300`) e icono `AlertCircle`; ver la [presentacion de F1](#presentacion-v14-dec-27-dec-28) (v1.5, DEC-29). El banner de error global de `App` no cambia.
- Los criterios de aceptacion usan notacion EARS (`Cuando`, `Mientras`, `Si ... entonces`, `El sistema deberá`) y tienen un ID estable (`AC-F1-01`, `AC-F2-01`, `AC-F3-01`). Los IDs no se renumeran ni se reutilizan: un criterio retirado se marca como obsoleto y conserva su ID.
- Los invariantes y restricciones que valen para las tres funcionalidades estan al final, en [Invariantes y restricciones comunes](#invariantes-y-restricciones-comunes).

### Utilidades compartidas (en `@/lib/financial-utils.ts`)

```ts
import type { DateRangeFilter } from './param-types'

/** true si falta alguna de las dos fechas o si `start_date <= end_date` (limites inclusivos; la comparacion de cadenas YYYY-MM-DD es cronologica). Un rango con la misma fecha en ambos extremos es valido. */
export function isValidDateRange(filter: DateRangeFilter): boolean

/** (v1.1, DEC-02, DEC-03) Etiqueta del rango para `DashboardHeader`, con las fechas tal cual (YYYY-MM-DD, sin convertir a Date). `{start} — {end}`, `From {start}`, `Until {end}`; null sin fechas. No valida el rango. */
export function formatPeriodLabel(filter: DateRangeFilter): string | null
```

`formatPeriodLabel` solo la usa F1.

```ts
type DateBounds = { min_date: string; max_date: string }
type DateRangeIssue = 'incomplete' | 'outOfBounds' | 'inverted'

/**
 * (v1.4, DEC-25, DEC-26) Motivo por el que el filtro no se puede pedir, o null si se puede.
 * En orden: 'incomplete' si alguna fecha tiene el ano con cero inicial (0001, 0019, 0190:
 * el navegador entrega esos valores mientras se escribe el ano); 'outOfBounds' si alguna
 * fecha queda fuera de [min_date, max_date] (solo si bounds es conocido); 'inverted' si
 * isValidDateRange es false.
 */
export function getDateRangeIssue(filter: DateRangeFilter, bounds: DateBounds | null): DateRangeIssue | null
```

**Regla unica para pedir datos (v1.4, DEC-26):** F1, F2 y F3 solo piden cuando `getDateRangeIssue(filter, bounds) === null`; en cualquier otro caso no hay peticion y se conserva el ultimo resultado. En F2 y F3, "rango valido" o "rango invalido" se refiere a esta regla.

### Capa de datos compartida (v1.1, DEC-05)

Las tres funcionalidades repiten el mismo ciclo de peticion (carga, error, conservar el ultimo dato con rango invalido, descartar respuestas fuera de orden). Se escribe una vez:

```ts
// @/lib/api.ts
/** Base de la API: import.meta.env.VITE_API_BASE_URL ?? "" (se mueve desde App.tsx). */
export const API_BASE_URL: string
/** "" sin parametros; si no, "?a=b&..." en el orden de las claves. Omite undefined y ''. */
export function buildQuery(params: AlertsParams | TopCategoriesParams): string
/** fetch GET de API_BASE_URL + path; !response.ok lanza Error; devuelve response.json() tipado. */
export function getJson<T>(path: string): Promise<T>

// @/lib/use-api-resource.ts
/**
 * Pide `path` (ruta con query, que sirve de clave) y expone el ultimo resultado.
 * - path null: no pide nada y conserva el ultimo `data` (rango invalido o vista inactiva).
 * - loading: true mientras el ultimo resultado no corresponde a `path`.
 * - error: la ultima peticion fallo; en ese caso data es null.
 * - Solo cuenta la respuesta del `path` vigente (las anteriores se descartan).
 * - (v1.9, DEC-33) Mientras carga una ruta nueva, `data` conserva el ultimo resultado.
 * - (v1.9, DEC-33) Si `path` pasa a null con una peticion en curso, su respuesta se descarta;
 *   con path null, loading es false.
 * - (v1.9, DEC-33) Si `path` vuelve a ser igual al del ultimo resultado (pasando antes por null,
 *   por ejemplo al volver a `Dashboard` sin cambiar el filtro), se pide de nuevo; mientras llega,
 *   loading es false y se ve el ultimo resultado: los datos anteriores o, si la ultima peticion
 *   fallo, el error (v1.10, DEC-41).
 */
export function useApiResource<T>(path: string | null): { data: T | null; loading: boolean; error: boolean }
```

`App` y `ComparisonPage` siguen siendo quienes deciden que pedir; los componentes de presentacion siguen sin fetch. El hook no hace `setState` sincrono en el cuerpo de un `useEffect` (lo prohibe la regla `react-hooks/set-state-in-effect` del lint del proyecto).

### Disposicion de la pagina (v1.2, DEC-19)

Orden y marcado de `App`, de arriba abajo:

| Bloque | Marcado |
| --- | --- |
| `DashboardHeader` | Sin cambios |
| `ViewTabs` | `role="tablist"`; pestanas con `id="tab-dashboard"` e `id="tab-comparison"` y `aria-controls="view-panel"` |
| `DateRangePicker` | `div` con `role="group"` y `aria-label="Date range"` (no `section`). Queda fuera del panel de vista porque es comun a las dos |
| Panel de vista | `div id="view-panel" role="tabpanel"` con `aria-labelledby` igual al `id` de la pestana activa |
| Vista `Dashboard` (dentro del panel) | Aviso `No movements found...`, banner de error, `section` de KPI, `section` de graficos y `<section aria-label="Anomaly alerts" aria-busy={loading}>` con `AlertsTable` |
| Vista `B2B vs B2C` (dentro del panel) | `<section aria-label="Income by business type" aria-busy={loading de algun grupo}>` con los dos `GroupTopTable` en dos columnas, y debajo `<section aria-label="Income comparison" aria-busy={loading de algun grupo}>` con `GroupComparisonChart` |

## F1 - Filtro de rango de fechas

### Componentes

| Componente | Archivo | Responsabilidad |
| --- | --- | --- |
| `DateRangePicker` | `date-range-picker.tsx` | Dos inputs de fecha (inicio y fin), referencia del rango disponible, boton para limpiar y avisos de validacion (fecha fuera de rango, rango invertido) |
| `App` (pagina) | `App.tsx` | Estado del filtro, carga de facets y de movimientos, regla unica de peticion (`getDateRangeIssue`) antes de pedir datos, aviso de rango sin movimientos |

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

Los inputs llevan las etiquetas visibles `Start date` y `End date` (v1.1, DEC-04).

### Presentacion (v1.4, DEC-27, DEC-28)

Requisitos visuales salidos de la prueba de F1. Las clases son las de Tailwind del proyecto; los colores salen de los tokens existentes salvo el rojo del aviso, que usa la paleta de Tailwind porque `--destructive` no tiene contraste suficiente como texto sobre el fondo oscuro.

| Elemento | Requisito |
| --- | --- |
| Disposicion | Fila con `Start date`, `End date` y `Clear dates`; debajo, en lineas propias y en este orden, `Available data` y el aviso de error si lo hay |
| Etiquetas | Texto de 14 px (`text-sm`), color `foreground` |
| Inputs | Alto 44 px (`h-11`), texto de 16 px (`text-base`), ancho minimo 176 px, fondo `card`, `color-scheme: dark` para que el icono del calendario se vea; con `aria-invalid` el borde pasa a rojo |
| `Clear dates` | Mismo alto que los inputs, borde y fondo del color primario (`border-primary/60`, `bg-primary/15`), texto `foreground` e icono `X` |
| Foco | Anillo visible con `ring` en inputs y boton al navegar con teclado |
| Aviso de error | Caja con borde y fondo rojo translucido (`border-red-500/40`, `bg-red-500/10`), texto rojo claro (`text-red-300`), icono `AlertCircle` y `role="alert"` |
| `Available data` | Texto de 14 px, color `muted-foreground` |
| Carga de `Available data` | (v1.9, DEC-40) Una barra `Skeleton` de `h-4 w-64` en su linea |
| Aviso `No movements found...` | (v1.9, DEC-40) Texto `text-sm` en `muted-foreground`, sin caja ni icono: no es un error |

### Renderizado condicional

| Condicion | Que se muestra |
| --- | --- |
| `boundsLoading` | `Skeleton` en la linea de referencia; los inputs siguen activos, sin atributos `min` / `max` |
| `bounds` presente | Texto `Available data: {min_date} to {max_date}` en una linea **bajo** los inputs (v1.4, DEC-27); ambos inputs con `min={min_date}` y `max={max_date}` |
| Ano a medio escribir (`incomplete`) | Ningun mensaje ni `aria-invalid`; no se piden datos (v1.4, DEC-25) |
| Fecha completa fuera de `bounds` (`outOfBounds`) | Aviso de error `Dates must be between {min_date} and {max_date}.` con `role="alert"` bajo los inputs; `aria-invalid` solo en el input fuera de rango (v1.4, DEC-26) |
| `bounds` null y sin carga (facets fallo) | La linea de referencia se oculta, sin banner de error; los inputs funcionan sin `min` / `max` |
| Ninguna fecha informada | Boton `Clear dates` oculto |
| Alguna fecha informada | Boton `Clear dates` visible; al pulsarlo llama `onChange({})` y mueve el foco al input `Start date`, porque el boton desaparece y el foco se perderia (v1.3, DEC-24) |
| `start_date` > `end_date` | Mensaje `Start date must be on or before end date.` con `role="alert"` bajo los inputs, e inputs con `aria-invalid` |
| Cualquier error de validacion | Se muestra como aviso (ver [Presentacion](#presentacion-v14-dec-27-dec-28)), no como texto suelto (v1.4, DEC-28). Se muestra un solo aviso, el del primer problema segun el orden de `getDateRangeIssue`: una fecha fuera de rango se avisa antes que un rango invertido. `aria-invalid` sigue al aviso mostrado: con una fecha fuera de rango y ademas el rango invertido, solo lo lleva el input fuera de rango (v1.9, DEC-37) |
| `start_date` = `end_date` | Valido (limites inclusivos: un solo dia) |

### Comportamiento de la pagina

1. Al montar, pide `GET /api/metrics/facets` y `GET /api/metrics` (sin filtros) en paralelo. `bounds` sale de `min_date` y `max_date`; el rango no se escribe fijo porque depende de la fecha de hoy.
2. Cada cambio del filtro que cumple la regla unica de peticion (`getDateRangeIssue(filter, bounds) === null`, v1.4) vuelve a pedir `GET /api/metrics` con `start_date` y/o `end_date` (solo los informados, sin `category` ni `operation_type`). Los KPI y los dos graficos se recalculan con la respuesta. El mismo filtro se pasa a la tabla de alertas (F2) y a la vista B2B vs B2C (F3), que lo reciben por props y piden sus propios datos.
3. **Un solo input de fecha.** Si solo hay `start_date`, el filtro va desde esa fecha hasta el final del dataset; si solo hay `end_date`, desde el inicio hasta esa fecha. Se aplica de inmediato, sin esperar a la otra fecha.
4. **Filtro que no se puede pedir** (ano a medio escribir, fecha fuera de `bounds` o rango invertido; v1.4). No se lanza ninguna peticion y se mantienen en pantalla los ultimos datos validos. `DateRangePicker` muestra el aviso que corresponde, salvo con el ano a medio escribir, que no muestra ninguno (DEC-25). Al corregir el filtro se vuelve a pedir.
5. **Rango sin movimientos** (respuesta `[]` para un rango dentro de `bounds`, o con `bounds` desconocido): los KPI reciben `metrics={null}` y muestran `—` (no `$0`: distingue "sin datos" de un cero valido); los graficos muestran su estado vacio existente `No data available to display`; bajo los inputs aparece `No movements found for the selected range.` con `role="status"`, solo en la vista `Dashboard` (v1.2, DEC-15). El aviso no se muestra mientras se cargan los movimientos (v1.9, DEC-33).
6. **Cargando.** Durante cada recarga `loading=true`: KPI y graficos muestran sus `Skeleton`. Si llegan respuestas fuera de orden, solo cuenta la del ultimo filtro.
7. **Error de red o respuesta no 2xx.** Se mantiene el banner de error actual de `App` y los KPI muestran `—`. El banner solo se ve en la vista `Dashboard` (v1.2, DEC-15).
8. **Etiqueta de periodo de `DashboardHeader`.** Con filtro activo, la prop `period` muestra el rango efectivo: `{start} — {end}`, `From {start}` o `Until {end}`. Sin filtro conserva su valor actual, `2024 - Full Year` (v1.2, DEC-22). Las fechas se muestran tal cual, en `YYYY-MM-DD`, con `formatPeriodLabel` (v1.1, DEC-02). La etiqueta sigue el texto de los inputs aunque el filtro no se pueda pedir (rango invertido, fecha fuera de rango o ano a medio escribir, que se ve un instante como `From 0019-02-02`); el aviso de error indica que los datos en pantalla son los ultimos validos (v1.1, DEC-03; ampliado en v1.4).

### Casos limite de F1

| Caso | Que debe mostrar la UI |
| --- | --- |
| Solo una fecha | Filtra con extremo abierto y muestra la etiqueta `From ...` o `Until ...` |
| Inicio posterior al fin | Aviso de rango invertido, sin peticion, datos anteriores intactos |
| Inicio fuera de rango y ademas posterior al fin | Solo el aviso de fuera de rango (primer problema); sin peticion |
| Rango sin movimientos | KPI `—`, graficos vacios y aviso `No movements found for the selected range.` |
| Facets falla | Sin linea de referencia ni `min` / `max`; el dashboard funciona igual |
| Fecha tecleada fuera de `bounds` | ~~No es error de validacion; la API responde `[]`~~ (obsoleto desde v1.4). Aviso `Dates must be between ...`, sin peticion y con los datos anteriores intactos (DEC-26). Si `facets` fallo, no se comprueba y la API responde `[]` |
| Ano escrito a mano, digito a digito | El navegador entrega `0001-…`, `0019-…`, `0190-…` antes de `1900-…`; ninguno de esos valores intermedios lanza peticion ni muestra mensaje (DEC-25) |
| Input vaciado a mano | Se omite el parametro (nunca `start_date=`, que daria 422) |
| Cambio de pestana con filtro activo | El filtro se conserva; la pestana activada muestra sus datos ya filtrados y un filtro que no se puede pedir sigue bloqueando las peticiones en ambas |

### Criterios de aceptacion de F1 (EARS)

| ID | Criterio |
| --- | --- |
| AC-F1-01 | El sistema deberá mostrar bajo el encabezado y las pestanas dos inputs de fecha, inicio y fin, ambos opcionales y vacios al cargar |
| AC-F1-02 | Cuando la aplicacion carga, el sistema deberá pedir `facets` y mostrar bajo los inputs `Available data: {min_date} to {max_date}` ("bajo" desde v1.4, DEC-27; la 1.0 decia "junto a") |
| AC-F1-03 | Mientras `facets` se carga, el sistema deberá mostrar un `Skeleton` en la linea de referencia sin bloquear los inputs |
| AC-F1-04 | Si `facets` falla, entonces el sistema deberá ocultar la linea de referencia y los limites `min` / `max` de los inputs sin mostrar un error, y el dashboard deberá funcionar igual |
| AC-F1-05 | Cuando el usuario cambia una fecha y el filtro cumple la regla unica de peticion (v1.4), el sistema deberá pedir `GET /api/metrics` solo con las fechas informadas y recalcular los KPI y los dos graficos con la respuesta |
| AC-F1-06 | Cuando solo hay una fecha informada, el sistema deberá filtrar con el otro extremo abierto, sin esperar a la otra fecha |
| AC-F1-07 | Cuando ambas fechas son iguales, el sistema deberá tratarlo como un rango valido de un solo dia |
| AC-F1-08 | Cuando el usuario vacia un input, el sistema deberá omitir ese parametro de la peticion |
| AC-F1-09 | Mientras la fecha de inicio sea posterior a la de fin, el sistema no deberá pedir datos, deberá mantener los ultimos datos validos y mostrar `Start date must be on or before end date.` |
| AC-F1-10 | Si la respuesta es `[]` (rango valido sin movimientos), entonces el sistema deberá mostrar `—` en los KPI, el estado vacio existente en los graficos y `No movements found for the selected range.` |
| AC-F1-11 | Mientras haya alguna fecha informada, el sistema deberá mostrar el boton `Clear dates`; al pulsarlo deberá vaciar ambas fechas y pedir los datos sin filtro |
| AC-F1-12 | Mientras haya un filtro activo, el sistema deberá mostrar en `DashboardHeader` el rango efectivo: `{start} — {end}`, `From {start}` o `Until {end}` |
| AC-F1-13 | Si la peticion de movimientos falla, entonces el sistema deberá mostrar el banner de error actual de `App` y `—` en los KPI |
| AC-F1-14 | Si llegan respuestas fuera de orden, el sistema deberá mostrar solo la correspondiente al ultimo filtro |
| AC-F1-15 | (v1.1, DEC-03) Mientras la fecha de inicio sea posterior a la de fin, el sistema deberá mostrar en `DashboardHeader` las fechas escritas en los inputs, sin convertirlas |
| AC-F1-16 | (v1.3, DEC-24) Cuando el usuario pulsa `Clear dates`, el sistema deberá mover el foco al input `Start date` |
| AC-F1-17 | (v1.4, DEC-25) Mientras alguna fecha tenga el ano a medio escribir (cero inicial), el sistema no deberá pedir datos ni mostrar un mensaje de error |
| AC-F1-18 | (v1.4, DEC-26) Si una fecha completa queda fuera del rango de `facets`, entonces el sistema no deberá pedir datos, deberá mantener los ultimos datos validos y mostrar `Dates must be between {min_date} and {max_date}.` |
| AC-F1-19 | (v1.4, DEC-28) El sistema deberá mostrar los errores de validacion de fechas como aviso rojo con `role="alert"`, uno solo a la vez |
| AC-F1-20 | (v1.4, DEC-27, DEC-28) El sistema deberá mostrar el filtro con los tamanos y colores de [Presentacion](#presentacion-v14-dec-27-dec-28); se comprueba en la prueba visual, no en tests |

### Restricciones negativas de F1

- No escribir fechas fijas en la interfaz (ni el ano `2024` ni el rango del dataset): salen de `facets`. Unica excepcion: la etiqueta del encabezado sin filtro conserva su valor actual `2024 - Full Year`, gap conocido y fuera de alcance (v1.2, DEC-22).
- No enviar `category` ni `operation_type` a `GET /api/metrics`.
- No montar un segundo selector de fechas en ninguna vista.
- No enviar un parametro con cadena vacia.
- No pedir datos con un ano a medio escribir ni, si `facets` cargo, con una fecha fuera de su rango (v1.4).
- No modificar el backend ni la firma de `DashboardHeader` (la prop `period` ya existe y es un `string`).

## F2 - Tabla de alertas de anomalias

Se muestra en la pestana del dashboard principal, **debajo de los graficos existentes**. Usa el filtro de fechas compartido de F1.

### Componentes

| Componente | Archivo | Responsabilidad |
| --- | --- | --- |
| `AlertsTable` | `alerts-table.tsx` | `Card` con titulo `Anomaly Alerts` (v1.1, DEC-06), input de umbral y la tabla de cuatro columnas, o su estado de carga, vacio o error |
| `ThresholdInput` | `threshold-input.tsx` | Input numerico del umbral con su etiqueta y su ayuda; lo renderiza `AlertsTable`, que coloca tambien su aviso de error (v1.7, DEC-31; antes lo renderizaba `ThresholdInput`) |
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

La peticion es `GET /api/metrics/alerts` con los parametros de `AlertsParams`: `threshold` y, si estan informados, `start_date` y `end_date` del filtro compartido. **Nunca** se envia `group_by` (la API agrupa por mes) ni `business_type`. Ejemplo con el orden fijo (v1.1, DEC-07): `/api/metrics/alerts?threshold=0.3&start_date=2026-01-01&end_date=2026-01-31`.

### Tabla

| Columna | Campo (`AlertEntry`) | Formato |
| --- | --- | --- |
| `Period` | `period` | Tal cual, `YYYY-MM` |
| `Outcome` | `outcome_total` | `formatCurrency` |
| `Avg. of previous periods` | `baseline_average` | `formatCurrency` |
| `Increase` | `increase_ratio` | `formatPercent(increase_ratio * 100)`; el ratio `0.5917` se muestra `59.2%` |

Es una tabla HTML (`table`, `thead`, `tbody`); los mensajes de vacio y las filas de `Skeleton` van dentro de `tbody`, de modo que la cabecera no desaparece (v1.1, DEC-09). Las filas conservan el orden de la API (cronologico ascendente); no se reordena en el cliente. Bajo el titulo, una linea de ayuda: `Average outcome of all earlier periods in the selected range.` (la API promedia todos los periodos anteriores, no una media movil de 3; ver verification.md).

### `ThresholdInput`

`<input type="number">` con `min=0.01`, `max=1`, `step=0.01`, etiqueta `Alert threshold` y ayuda `Ratio between 0.01 and 1.0 (default 0.3).` Valor inicial `'0.3'`. Los extremos 0.01 y 1.0 son validos. Un texto vacio o que el navegador no reconoce como numero (entonces entrega `''`) es invalido. Si `0,3` es un numero depende del idioma del navegador: con un idioma que usa coma decimal (por ejemplo, espanol) el navegador lo acepta y entrega `0.3`, que es valido; con otros entrega `''` (corregido en v1.8: la 1.0 decia que `0,3` siempre era invalido; la prueba visual de F2 mostro `0,28` aceptado como `0.28`). La validez la decide solo `parseThreshold`, no el `step` del navegador: `0.015` es valido y se pide con ese valor (v1.9, DEC-40).

El umbral es el incremento minimo (ratio) que debe superar un periodo: se muestran los periodos con `increase_ratio > threshold`. Solo afecta a la tabla de alertas, no a los KPI ni a los graficos.

### Presentacion de F2 (v1.6, DEC-30)

| Elemento | Requisito |
| --- | --- |
| Disposicion de la tarjeta | (v1.7, DEC-31) Cabecera con el titulo y su linea de ayuda a la izquierda y la fila del umbral a la derecha, a la misma altura; debajo, a todo el ancho, el aviso de error del umbral si lo hay; despues la tabla (o su estado). En pantallas estrechas la fila del umbral pasa bajo el titulo. El aviso no va dentro del control: si lo hiciera, alargaria la cabecera y volveria el hueco entre el titulo y la tabla |
| Fila del umbral | Etiqueta, input y ayuda en una sola linea (se apilan si no caben) |
| Etiqueta `Alert threshold` | Color `muted-foreground`, distinto del titulo de la tarjeta (`foreground`), para que no compita con el (v1.8, DEC-32) |
| Input | Alto 44 px y texto de 16 px, como los inputs de fecha de F1; fondo `secondary` (mas claro que la tarjeta) para distinguir el campo dentro de la tarjeta (v1.7, DEC-31); anillo de foco y borde rojo con `aria-invalid` |
| Errores | Aviso rojo de DEC-29 |
| Tabla | (v1.9, DEC-40) Texto `text-sm`; cabecera `text-xs` en mayusculas, `muted-foreground` y `font-medium`; `Period` alineada a la izquierda y las columnas de importes y porcentaje a la derecha; cada fila con borde superior `border-border/60` y celdas con `py-2` |
| Carga | (v1.9, DEC-40) 3 filas `tr`, cada una con una sola celda que ocupa las 4 columnas y una barra `Skeleton` `h-5` a todo el ancho |
| Vacio | (v1.9, DEC-40) Una fila con una celda que ocupa las 4 columnas; los dos textos centrados, `text-sm` en `muted-foreground` |

### Renderizado condicional

| Condicion | Que se muestra |
| --- | --- |
| `loading` | Titulo e input visibles; el cuerpo muestra 3 filas de `Skeleton`; el input sigue activo |
| `error` | Cuerpo: `Could not load anomaly alerts.` con `role="alert"` (v1.2, DEC-18), como aviso rojo (v1.5, DEC-29); la tabla se oculta; el input sigue activo |
| `alerts` con filas | Tabla de cuatro columnas |
| **`alerts` vacio (`[]`)** | Titulo, input y cabecera de la tabla siguen visibles; el cuerpo muestra `No anomalies detected for the current threshold ({formatPercent(appliedThreshold * 100)}).` y debajo `Try a lower threshold or a wider date range.`, con `role="status"` (v1.2, DEC-18). La tabla **no desaparece** |
| `parseThreshold(thresholdText)` es null | Bajo la cabecera de la tarjeta, sobre la tabla (v1.7, DEC-31): `Enter a value between 0.01 and 1.0.` con `role="alert"`, como aviso rojo (v1.5, DEC-29); el input con `aria-invalid`; la tabla sigue mostrando el ultimo resultado valido |

### Comportamiento de la pagina

1. Al montar pide las alertas con `threshold=0.3` y el filtro vigente.
2. Cada cambio de texto: si `parseThreshold` da un numero **y** el rango de fechas es valido, se vuelve a pedir; si no, no hay peticion y se conserva el ultimo resultado. `appliedThreshold` solo cambia cuando se aplica un valor valido. Un umbral valido escrito mientras el rango de fechas es invalido se guarda como aplicado y se usa en la peticion en cuanto el rango vuelve a ser valido (v1.1, DEC-08).
3. Un cambio del filtro de fechas (F1) vuelve a pedir las alertas con el umbral aplicado. Con rango invertido no hay peticion. Si el texto del umbral es invalido en ese momento, se pide igual con el umbral aplicado y el aviso del umbral sigue visible: la tabla sigue al filtro, como los KPI y los graficos (v1.9, DEC-34).
4. Si llegan respuestas fuera de orden, solo cuenta la del ultimo umbral y filtro.
5. Un fallo de esta peticion solo afecta a la tabla (`error`); no activa el banner global de `App` ni vacia los KPI.

### Casos limite de F2

| Caso | Que debe mostrar la UI |
| --- | --- |
| Ningun periodo supera el umbral (con el dataset completo y `1.0` la API aun da una alerta, 2025-12 con ratio 1.4968; un `[]` aparece al acotar las fechas) | Estado vacio con el umbral aplicado y la sugerencia; titulo, input y cabecera permanecen |
| Rango con un solo periodo o sin movimientos (la API da `[]`: el primer periodo nunca genera alerta) | El mismo estado vacio y la sugerencia de ampliar el rango |
| Umbral fuera de rango (`0`, `5`, `-0.1`) | Error bajo el input, sin peticion, tabla con el ultimo resultado valido |
| Input vacio o texto que el navegador no reconoce como numero | Se trata como invalido igual que el caso anterior. `0,3` es invalido o vale `0.3` segun el idioma del navegador (v1.8) |
| Umbral en un extremo (`0.01` o `1.0`) | Valido; se pide a la API |
| Fallo de red o respuesta no 2xx | `Could not load anomaly alerts.` solo en la tarjeta de alertas |
| Rango de fechas invertido | Sin peticion; la tabla conserva el ultimo resultado y el filtro muestra su error |

### Criterios de aceptacion de F2 (EARS)

| ID | Criterio |
| --- | --- |
| AC-F2-01 | El sistema deberá mostrar bajo los graficos del dashboard una tarjeta de alertas con titulo, un input de umbral con valor inicial `0.3` y una tabla de cuatro columnas: `Period`, `Outcome`, `Avg. of previous periods` e `Increase` |
| AC-F2-02 | Cuando la aplicacion carga, el sistema deberá pedir `GET /api/metrics/alerts` con `threshold=0.3` y el filtro de fechas vigente |
| AC-F2-03 | Cuando el usuario cambia el umbral a un valor de `0.01` a `1.0` (ambos inclusive) y el rango de fechas es valido, el sistema deberá pedir las alertas con ese umbral y mostrar el resultado |
| AC-F2-04 | Si el texto del umbral esta vacio, no es un numero o esta fuera de `0.01` a `1.0`, entonces el sistema no deberá pedir datos por ese cambio del umbral, deberá mostrar `Enter a value between 0.01 and 1.0.` y conservar el ultimo resultado valido. Un cambio de fechas posterior se rige por AC-F2-05 (ajustado en v1.9, DEC-34) |
| AC-F2-05 | Cuando cambia el filtro de fechas, el sistema deberá volver a pedir las alertas con el ultimo umbral aplicado y las fechas informadas, tambien si el texto del umbral es invalido (v1.9, DEC-34) |
| AC-F2-06 | Mientras el rango de fechas sea invalido, el sistema no deberá pedir alertas y deberá conservar el ultimo resultado |
| AC-F2-07 | El sistema deberá mostrar cada alerta con su periodo `YYYY-MM`, el outcome y el promedio con `formatCurrency` y el incremento como `increase_ratio * 100` con `formatPercent`, en el orden de la API |
| AC-F2-08 | El sistema deberá mostrar bajo el titulo de la tarjeta la linea `Average outcome of all earlier periods in the selected range.` |
| AC-F2-09 | Si la respuesta es `[]`, entonces el sistema deberá mostrar `No anomalies detected for the current threshold ({umbral aplicado}).` y `Try a lower threshold or a wider date range.`, manteniendo visibles el titulo, el input y la cabecera de la tabla |
| AC-F2-10 | Mientras se cargan las alertas, el sistema deberá mostrar 3 filas de `Skeleton` y mantener el input activo |
| AC-F2-11 | Si falla la peticion de alertas, entonces el sistema deberá mostrar `Could not load anomaly alerts.` solo en la tarjeta, sin activar el banner global ni vaciar los KPI |
| AC-F2-12 | Si llegan respuestas fuera de orden, el sistema deberá mostrar solo la correspondiente al ultimo umbral y filtro |
| AC-F2-13 | (v1.1, DEC-08) Cuando el usuario escribe un umbral valido mientras el rango de fechas es invalido, el sistema no deberá pedir datos; cuando el rango vuelva a ser valido, deberá pedir las alertas con ese umbral |
| AC-F2-14 | (v1.6, DEC-30) El sistema deberá mostrar la tarjeta de alertas con la disposicion y el input de [Presentacion de F2](#presentacion-de-f2-v16-dec-30), sin espacio vacio entre el titulo y la tabla; se comprueba en la prueba visual, no en tests |

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
| `ViewTabs` | `view-tabs.tsx` | Barra de dos pestanas (`Dashboard` y `B2B vs B2C`) bajo `DashboardHeader`; `role="tablist"` con dos `button role="tab"` y `aria-selected`, sin navegacion por flechas (v1.1, DEC-10) |
| `ComparisonPage` | `comparison-page.tsx` | Pagina de la vista: pide los datos de ambos grupos, los transforma y compone paneles y grafico. `App` la carga en diferido con `lazy` + `Suspense` (v1.1, DEC-13) |
| `GroupTopTable` | `group-top-table.tsx` | Panel de un grupo: titulo y tabla de categorias, o su estado de carga, vacio o error |
| `GroupComparisonChart` | `group-comparison-chart.tsx` | Grafico unico de dos barras con el total de ingresos de cada grupo |
| `App` (pagina) | `App.tsx` | Estado `view` y `filter`; renderiza el dashboard o `ComparisonPage` segun la pestana |

### Tipos y utilidades

`AppView`, `GroupCategoryRow` y `GroupTotal` van en `src/lib/financial-types.ts`; `toGroupRows`, `sumTotals` y `formatCategoryLabel`, en `src/lib/financial-utils.ts`, como las utilidades de F1 y F2 (v1.2, DEC-21).

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

/** (v1.1, DEC-11) Nombre de categoria con la primera letra en mayuscula: 'sales' -> 'Sales'. */
export function formatCategoryLabel(category: Category): string
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
  /** (v1.4, DEC-26) Rango de facets, para aplicar la regla unica de peticion. null si facets no cargo. */
  bounds: DateBounds | null
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

`ComparisonPage` hace **dos peticiones en paralelo** a `GET /api/metrics/categories/top`, una por grupo, con los parametros de `TopCategoriesParams`: `operation_type: 'income'`, `limit: 5`, `business_type: 'B2B'` o `'B2C'`, y `start_date` / `end_date` del filtro compartido si estan informados. La respuesta es `TopCategoriesResponse`. Ejemplo con el orden fijo (v1.1, DEC-07): `/api/metrics/categories/top?operation_type=income&limit=5&business_type=B2B&start_date=2026-01-01`.

Las filas de cada tabla salen **de la respuesta de `top`**, no de `facets.categories` (lista global que incluye categorias sin ingresos; ver verification.md). Las dos secciones son siempre B2B y B2C, en ese orden; `facets.business_types` confirma esos dos valores pero la vista no lo consulta.

Si la vista se abre con un filtro que no se puede pedir (rango invertido, fecha fuera de rango o ano a medio escribir; v1.9, DEC-35) y todavia no hay ningun resultado, no se pide nada y cada panel muestra su estado vacio (`No income in the selected range for {group}.`), y el grafico el suyo; el aviso del filtro, si lo hay, ya se ve en `DateRangePicker` (v1.1, DEC-14). "Sin resultado previo" cuenta desde que se abre la vista: `ComparisonPage` se desmonta al cambiar de pestana y no conserva sus datos, de modo que al reabrirla con un filtro que no se puede pedir muestra de nuevo los estados vacios. El dashboard, en cambio, conserva los suyos porque sus peticiones viven en `App` (v1.10, DEC-42).

### Navegacion entre vistas (v1.1, DEC-12)

Mientras la vista activa es `comparison`, `App` no pide movimientos ni alertas (pasa `null` como ruta a `useApiResource`). Al volver a `Dashboard` los pide con el filtro vigente.

El banner de error de movimientos y el aviso `No movements found for the selected range.` solo se muestran en la vista `Dashboard`: describen datos que la vista comparativa no ensena (v1.2, DEC-15).

Mientras se descarga el codigo diferido de `ComparisonPage`, el `Suspense` muestra los dos paneles y el grafico en su estado de carga, con el mismo marcado, para que no haya salto de altura (v1.2, DEC-23). Ese fallback vive en `App`: usa `GroupTopTable` con `loading` y el marcado de carga de los graficos existentes, sin importar `GroupComparisonChart`, que devolveria Recharts al chunk principal (v1.9, DEC-36).

### Tablas (`GroupTopTable`)

Titulo `{group} - Top income categories` y descripcion `Top 5 categories by total income`. Mientras carga, titulo y descripcion siguen visibles y el cuerpo muestra 3 filas de `Skeleton`, como `AlertsTable` (v1.2, DEC-17). El vacio `No income in the selected range for {group}.` lleva `role="status"` y el error `Could not load {group} income data.`, `role="alert"` (v1.2, DEC-18), como aviso rojo (v1.5, DEC-29). Columnas:

| Columna | Campo | Formato |
| --- | --- | --- |
| `Category` | `category` | Tal cual, con la primera letra en mayuscula (`Sales`, `Others`), con `formatCategoryLabel` (v1.1, DEC-11) |
| `Total income` | `total_amount` | `formatCurrency` |
| `Share of group` | `share` | `formatPercent(share * 100)` |

El porcentaje es sobre el total del grupo. Ese total es la suma de las filas porque el dataset solo tiene 5 categorias y `limit=5` las cubre todas (comprobado: 615540.72 en B2B y 642606.15 en B2C).

### Grafico (`GroupComparisonChart`)

`BarChart` de Recharts con una barra por grupo. Color de B2B: `var(--chart-1)`; de B2C: `var(--chart-5)` (se evitan `--chart-2` y `--chart-profit`, que ya significan gasto y beneficio). Eje Y y tooltip con `formatCurrency`. Titulo `Income: B2B vs B2C`.

Detalles (v1.2, DEC-20): eje X con `B2B` y `B2C` (`dataKey="business_type"`); serie `Income` (`<Bar dataKey="total_income" name="Income">`); el `BarChart` lleva `title="Income: B2B vs B2C"` y `desc="Total income of B2B and B2C in the selected range."`, como los graficos existentes. Mientras carga usa el mismo marcado de carga que los graficos existentes (v1.2, DEC-17). El vacio `No income to compare in the selected range.` lleva `role="status"` y el error `Could not load the comparison.`, `role="alert"` (v1.2, DEC-18), como aviso rojo (v1.5, DEC-29).

Etiquetas y descripcion (v1.9, DEC-38, DEC-39): cada barra lleva encima su importe con `formatCurrency`, de modo que un grupo sin ingresos muestra `$0` sin pasar el raton. Bajo el titulo, la descripcion visible `Total income of B2B and B2C in the selected range.` (el mismo texto que `desc`), como los graficos existentes; asi el marcado de carga, que tiene una linea de descripcion, ocupa lo mismo que el grafico cargado. Alto del area del grafico 280 px, sin leyenda (una sola serie) y tooltip con el estilo de los graficos existentes.

### Presentacion de F3 (v1.9, DEC-40)

| Elemento | Requisito |
| --- | --- |
| `ViewTabs` | Barra con borde inferior `border-border`. Cada pestana: `px-4 py-2`, `text-sm`, `font-medium` y borde inferior de 2 px. Activa: borde `primary` y texto `foreground`. Inactiva: borde transparente y texto `muted-foreground` (`foreground` al pasar el raton). Anillo de foco `ring` |
| Paneles | Una columna; dos columnas desde `xl` (1280 px), como los graficos del dashboard |
| `GroupTopTable` | Titulo y descripcion siempre visibles. En carga, vacio o error el contenido sustituye a la tabla (no se pinta tabla). Carga: 3 barras `Skeleton` `h-5` a todo el ancho. Vacio: texto `text-sm` en `muted-foreground` |
| Tabla de `GroupTopTable` | El estilo de la tabla de alertas (ver [Presentacion de F2](#presentacion-de-f2-v16-dec-30)): `Category` a la izquierda y `Total income` y `Share of group` a la derecha |
| Errores | Aviso rojo de DEC-29; en el grafico, centrado en el area de 280 px |
| Vacio del grafico | (v1.10, DEC-43) Como el de los graficos existentes: titulo y descripcion visibles y, en lugar de las barras, el mensaje centrado en el area de 280 px, `text-sm` en `muted-foreground`, con `role="status"` |

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
| AC-F3-10 | Si un grupo esta vacio y el otro no, entonces el grafico deberá mostrar la barra del grupo vacio con total `$0`, visible en su etiqueta (v1.9, DEC-38) |
| AC-F3-11 | Si ambos grupos estan vacios, entonces el grafico deberá mostrar `No income to compare in the selected range.` en lugar de las barras |
| AC-F3-12 | Mientras se cargan los datos de un grupo, el sistema deberá mostrar `Skeleton` en su seccion; mientras falte cualquiera de los dos, el grafico deberá mostrar `Skeleton` |
| AC-F3-13 | Si falla la peticion de un grupo, entonces el sistema deberá mostrar `Could not load {group} income data.` en su seccion y `Could not load the comparison.` en el grafico, y la otra seccion se mostrara con normalidad |
| AC-F3-14 | Si llegan respuestas fuera de orden, el sistema deberá mostrar solo la correspondiente al ultimo filtro |
| AC-F3-15 | (v1.1, DEC-12) Mientras la vista `B2B vs B2C` este activa, el sistema no deberá pedir movimientos ni alertas; cuando el usuario vuelva a `Dashboard`, deberá pedirlos con el filtro vigente |
| AC-F3-16 | (v1.1, DEC-14; ampliado en v1.9, DEC-35) Si la vista se abre con un filtro que no se puede pedir y sin resultado previo, entonces el sistema no deberá pedir datos y deberá mostrar el estado vacio de cada panel y del grafico |
| AC-F3-17 | (v1.2, DEC-15) Mientras la vista `B2B vs B2C` este activa, el sistema no deberá mostrar el banner de error de movimientos ni el aviso `No movements found for the selected range.` |
| AC-F3-18 | (v1.2, DEC-16) Mientras un grupo se carga y el otro ha fallado, el grafico deberá mostrar su estado de carga y no el error |

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
- **INV-7.** (v1.4) Si `facets` cargo, ninguna peticion lleva una fecha fuera de `[min_date, max_date]` ni con el ano con cero inicial.

### Restricciones negativas

- No implementar componentes React ni llamadas a la API como parte de esta entrega: solo especificacion. (Vale para las versiones 1.0 a 1.3 de la spec; la implementacion se hace aparte, con los planes de [docs/plans](../../docs/plans).)
- No usar `any`, `object` ni conversiones de tipo para ocultar diferencias con la API.
- No anadir dependencias nuevas.
- No cambiar el idioma, la moneda ni el formato de `formatCurrency` y `formatPercent`.
- No cambiar el backend: los desajustes con el PM se resuelven en esta spec.

## Decisiones de implementacion

Puntos que la version 1.0 no fijaba y que habia que decidir para implementar y escribir tests con valores exactos. Salieron de la revision de los planes de implementacion del 2026-11-18 y el usuario las acepto: DEC-01 a DEC-14 en la v1.1, DEC-15 a DEC-23 en la v1.2 (tras regenerar los planes sobre la v1.1) y DEC-24 en la v1.3 (tras regenerarlos sobre la v1.2). DEC-25 a DEC-28 salen de la prueba visual y de funcionamiento de F1 hecha por el usuario (v1.4). DEC-29 sale de adaptar los planes de F2 y F3 a la v1.4 (hueco H-11) y la decidio el usuario (v1.5). DEC-30 a DEC-32 salen de las pruebas visuales de F2 (v1.6 a v1.8). DEC-33 a DEC-40 salen de la prueba de traspaso: un agente sin contexto planifico desde la 1.8 y anoto sus dudas (Q-01 a Q-21 de `docs/handover/decisions.md`, en la rama de la fase 9); fijan lo que hace la iteracion 1, aprobada en las pruebas visuales, salvo DEC-38 y DEC-39, que decidio el usuario (v1.9). DEC-41 a DEC-43 salen de las dudas Q-22 a Q-24 del mismo agente al releer la 1.9 y tambien fijan lo que hace la iteracion 1 (v1.10). Los IDs no se renumeran ni se reutilizan; una decision retirada se marca como obsoleta.

| ID | Decision | Motivo | Alternativa descartada |
| --- | --- | --- | --- |
| DEC-01 | Los tipos de `specs/*.ts` se **copian** a `src/lib/` (solo cambia la ruta del import); los de `specs/` quedan como registro | [verification.md](verification.md) y el [README](README.md) enlazan esos archivos y guardan el comando `tsc` que los comprueba; moverlos rompe ese registro | Moverlos y corregir enlaces y comandos de documentos de evidencia ya cerrados |
| DEC-02 | La etiqueta del encabezado muestra las fechas tal cual (`YYYY-MM-DD`), sin convertirlas a `Date` | Convertir a `Date` reintroduce el riesgo de huso horario ya documentado (regla CAL): con un huso negativo, el dia 1 puede mostrarse como el ultimo dia del mes anterior | Un formato legible como `Jan 1, 2026` |
| DEC-03 | Con el rango invertido, la etiqueta muestra lo escrito en los inputs | Es lo mas simple y no anade estado; el mensaje de rango invalido ya avisa de que los datos son los ultimos validos | Guardar el ultimo filtro valido y mostrar ese |
| DEC-04 | Etiquetas visibles `Start date` y `End date` en los inputs | Un input sin etiqueta no es accesible y los tests necesitan un nombre para encontrarlo; la UI esta en ingles | Solo `aria-label`, sin texto visible |
| DEC-05 | Capa de datos compartida: `api.ts` (`API_BASE_URL`, `buildQuery`, `getJson`) y el hook `useApiResource` | Las tres funcionalidades repiten el mismo ciclo de peticion; se escribe y se prueba una vez. Evita `setState` sincrono en un `useEffect`, que el lint rechaza | Repetir `fetch`, carga, error y descarte de respuestas en cada sitio |
| DEC-06 | Titulo de la tarjeta de alertas: `Anomaly Alerts` | La 1.0 pedia un titulo sin dar el texto; sigue el estilo de los titulos existentes (`Income vs. Outcome`) | — |
| DEC-07 | Orden fijo de parametros de query (ver [Convenciones comunes](#convenciones-comunes)) | A la API le da igual, pero los tests comparan la URL exacta | Comparar parametros sin orden en los tests |
| DEC-08 | Un umbral valido escrito con el rango invertido se guarda como aplicado y se usa al corregir el rango | No se pierde lo que escribio el usuario | Descartarlo y obligar a escribirlo otra vez |
| DEC-09 | Tabla HTML real; los mensajes de vacio y las filas de `Skeleton` van dentro de `tbody` | Accesible para lectores de pantalla y mantiene la cabecera visible, como pide la 1.0 | Una lista de `div` con aspecto de tabla |
| DEC-10 | `ViewTabs` con `role="tablist"` / `role="tab"` / `aria-selected`, sin navegacion por flechas | Los lectores de pantalla las anuncian como pestanas sin complicar el componente | Implementar el patron completo de teclado (flechas, tabindex movil) |
| DEC-11 | `formatCategoryLabel` pone la primera letra en mayuscula | Con la clase CSS `capitalize` el texto real seguiria siendo `sales` y los tests no podrian comprobar `Sales` | La clase CSS `capitalize`, que ya usa el tooltip existente |
| DEC-12 | En la vista `B2B vs B2C`, `App` no pide movimientos ni alertas; al volver a `Dashboard` los pide con el filtro vigente | Evita peticiones inutiles en cada cambio de fecha mientras no se ven esos datos | Seguir pidiendolos en segundo plano |
| DEC-13 | `ComparisonPage` se carga en diferido (`lazy` + `Suspense`) | El grafico usa Recharts; importarlo directamente lo devuelve al chunk principal y reaparece el aviso de chunk > 500 kB resuelto en el proyecto 4 | Importacion directa |
| DEC-14 | Vista comparativa abierta con rango invertido y sin datos previos: sin peticiones y estado vacio en paneles y grafico | La 1.0 decia "conservar el ultimo resultado", pero no habia ninguno | Un mensaje propio, por ejemplo `Fix the date range to load data.` |
| DEC-15 | El banner de error de movimientos y el aviso de rango sin movimientos solo se ven en la vista `Dashboard` | Con DEC-12, `App` conserva el ultimo estado de movimientos; mostrarlo en la comparativa hablaria de datos que no se ven | Mostrarlos en las dos vistas |
| DEC-16 | Precedencia de estados: `loading` > `error` > vacio > datos | En el grafico de F3 pueden coincidir un grupo cargando y otro con error; hace falta una regla unica | Mostrar el error en cuanto exista |
| DEC-17 | Carga de `GroupTopTable`: titulo, descripcion y 3 filas de `Skeleton`. Carga del grafico de F3: el marcado de los graficos existentes | La 1.0 solo decia "Skeleton"; se reutiliza lo que ya hacen `AlertsTable` y los graficos | Un unico bloque de `Skeleton` sin titulo |
| DEC-18 | Errores de carga con `role="alert"`; estados vacios con `role="status"` (F2 y F3) | La 1.0 solo lo fijaba en F1; asi los lectores de pantalla anuncian igual en las tres | Sin roles en F2 y F3 |
| DEC-19 | Disposicion y marcado de la pagina (ver [Disposicion de la pagina](#disposicion-de-la-pagina-v12-dec-19)) | Hacia falta fijar contenedores, `aria-label` y la relacion pestana-panel; ademas `App.test.tsx` cuenta las `section` con `aria-busy` | Dejar el marcado a quien implemente |
| DEC-20 | Grafico de F3: eje X `B2B`/`B2C`, serie `Income`, `title` y `desc` accesibles | Mismo patron que los graficos existentes | — |
| DEC-21 | Tipos de F3 en `financial-types.ts` y utilidades en `financial-utils.ts` | F1 y F2 fijaban su archivo; F3 no | Un archivo nuevo para F3 |
| DEC-22 | Sin filtro, el encabezado conserva `2024 - Full Year`, como excepcion explicita a "no escribir fechas fijas" | La 1.0 se contradecia: prohibia el ano `2024` y pedia conservar el valor actual, que lo contiene. Corregir el encabezado es un gap conocido fuera de alcance | Derivar el periodo de `facets` cuando no hay filtro (cambio de producto no pedido) |
| DEC-23 | Fallback de carga de `ComparisonPage`: paneles y grafico en estado de carga | Evita salto de altura al descargar el codigo diferido (DEC-13) | Un `Skeleton` generico |
| DEC-24 | Al pulsar `Clear dates`, el foco pasa al input `Start date` | El boton desaparece al vaciar las fechas; sin esto el foco del teclado vuelve al inicio de la pagina y quien usa teclado o lector de pantalla pierde su posicion | Dejar el boton visible y deshabilitado (contradice la 1.0, que lo oculta sin fechas) |
| DEC-25 | Un ano con cero inicial (`0001`, `0019`, `0190`) es una fecha a medio escribir: no se pide ni se muestra error | Prueba del usuario: al escribir `02-02-1900` a mano, el navegador entrego una fecha valida por cada digito del ano y el backend recibio una peticion por cada uno (`start_date=0001-02-02`, `0019-…`, `0190-…`, `1900-…`, comprobado en sus logs) | Esperar al `blur` del input o un retardo (debounce): anaden estado y no distinguen una fecha incompleta |
| DEC-26 | Una fecha completa fuera de `[min_date, max_date]` es un error de validacion: aviso rojo, sin peticion, datos anteriores intactos. Sustituye el caso de la 1.0 "fecha fuera de bounds no es error" | Peticion del usuario tras la prueba: una fecha muy anterior a los datos debe explicarse, no mostrarse como "sin movimientos" | Mantener la 1.0 (pedir y mostrar el estado vacio) |
| DEC-27 | `Available data` en una linea bajo los inputs; inputs y etiquetas mas grandes (alto 44 px, texto 16 px) | Prueba del usuario: el filtro se veia pequeno y la referencia a la derecha se perdia | — |
| DEC-28 | Errores de validacion como aviso rojo (borde y fondo rojos translucidos, texto rojo claro, icono). `Clear dates` con borde y fondo del color primario y texto claro | Prueba del usuario: el error se veia en blanco (`--destructive-foreground` es casi blanco en el tema oscuro) y el boton, negro con texto gris, se distinguia poco. `--destructive` es demasiado oscuro para texto sobre el fondo oscuro, por eso el texto usa un rojo claro | Usar `--destructive` como color de texto (contraste insuficiente) |
| DEC-29 | Los errores de F2 y F3 (umbral invalido, error de carga de alertas, de un grupo y del grafico comparativo) usan el mismo aviso rojo que F1 | DEC-28 solo cubria los errores de fechas; con `text-destructive-foreground` los de F2 y F3 se verian casi blancos, como paso en F1. Un unico estilo de error en toda la vista | Un estilo propio por tarjeta |
| DEC-30 | ~~Tarjeta de alertas en una columna: titulo, fila del umbral (etiqueta, input y ayuda en linea), aviso y tabla~~ (disposicion obsoleta desde v1.7, la sustituye DEC-31). Sigue vigente: input del umbral con el tamano de los inputs de fecha de F1 | Prueba visual de F2: con el control en una columna lateral de la cabecera, su altura (etiqueta, input, ayuda y aviso) dejaba un hueco vacio entre el titulo y la tabla. El tamano del input no estaba fijado; se igualo al de F1 y el usuario lo vio en la prueba | Mantener la columna lateral y reducir la ayuda a un tooltip |
| DEC-31 | Fila del umbral (etiqueta, input y ayuda) a la derecha del titulo, a la misma altura; el aviso de error del umbral sale del control y lo coloca `AlertsTable` a todo el ancho bajo la cabecera; campo del input con fondo `secondary` | Segunda prueba visual de F2: el usuario prefiere el control a la derecha del titulo, y el campo con fondo `card` no se distinguia de la tarjeta. Lo que provocaba el hueco era el aviso dentro de la columna del control, no la columna en si | La disposicion en una columna de DEC-30 |
| DEC-32 | Etiqueta `Alert threshold` en `muted-foreground` | Tercera prueba visual de F2: en blanco competia con el titulo de la tarjeta. `muted-foreground` es el color de los textos secundarios del proyecto, ya revisado en contraste en el proyecto 4 | El color primario (azul), con menos margen de contraste sobre la tarjeta |
| DEC-33 | Casos limite de `useApiResource` (ver [Capa de datos compartida](#capa-de-datos-compartida-v11-dec-05)): `data` conserva el ultimo resultado mientras carga; una respuesta en curso se descarta si la ruta pasa a null; volver a la ruta del ultimo resultado la pide de nuevo sin `Skeleton`. El aviso `No movements found...` no se muestra mientras carga | Prueba de traspaso (Q-01 a Q-04): la 1.8 no lo fijaba y la iteracion 1 lo resolvio sin anotarlo | `data` a null al cambiar de ruta; `Skeleton` al volver a la misma ruta |
| DEC-34 | AC-F2-04 se refiere al cambio del umbral: un texto invalido no lanza peticion por si mismo, pero un cambio de fechas pide las alertas con el umbral aplicado y el aviso del umbral sigue visible | Q-05: AC-F2-04 y AC-F2-05 se contradecian con un texto invalido y un cambio de fechas. La tabla sigue al filtro, como KPI y graficos | No pedir alertas mientras el texto sea invalido |
| DEC-35 | DEC-14 y AC-F3-16 valen para cualquier filtro que no se puede pedir, no solo el rango invertido | Q-06: la regla unica de la 1.4 ya lo implicaba, pero el texto seguia diciendo "rango invertido" | `Skeleton` hasta que el filtro se pueda pedir |
| DEC-36 | El fallback de `Suspense` de `ComparisonPage` usa `GroupTopTable` con `loading` y el marcado de carga de los graficos existentes, sin importar `GroupComparisonChart` | Q-08: importarlo devuelve Recharts al chunk principal (DEC-13); DEC-17 ya iguala los dos marcados de carga | Importar `GroupComparisonChart` en `App` |
| DEC-37 | `aria-invalid` sigue al aviso mostrado: con una fecha fuera de rango y ademas el rango invertido, solo el input fuera de rango | Q-09: lo que anuncia el lector de pantalla coincide con el aviso visible | Marcar los dos inputs |
| DEC-38 | Cada barra del grafico de F3 lleva encima su importe con `formatCurrency`; el grupo vacio muestra `$0` | Q-07, decidido por el usuario: una barra de valor 0 no tiene altura, y en la iteracion 1 el `$0` solo se veia en el tooltip | Solo el tooltip |
| DEC-39 | Descripcion visible en el grafico de F3, el mismo texto que `desc`; 280 px de alto, sin leyenda, tooltip como los graficos existentes | Q-20, decidido por el usuario: el marcado de carga (DEC-17) tiene una linea de descripcion; sin ella, en la iteracion 1 habia un salto de altura al terminar de cargar | Quitar la linea del marcado de carga |
| DEC-40 | Detalles de presentacion que la 1.8 no fijaba: carga de `Available data`, aviso `No movements found...`, estilo de las tablas y de sus estados, pestanas, columnas de la vista comparativa (desde `xl`, decidido por el usuario) y validez de `0.015` | Q-13 a Q-19 y Q-21: la iteracion 1 los resolvio sin anotarlos; se copian sus valores, ya aprobados en las pruebas visuales | Dejarlos a quien implemente |
| DEC-41 | Al volver a la ruta del ultimo resultado se ve ese resultado mientras se pide de nuevo: los datos o, si la ultima peticion fallo, el error | Q-22: DEC-33 decia "los datos anteriores", que no existen si el ultimo resultado fue un error | Mostrar `Skeleton` o vaciar el error mientras llega |
| DEC-42 | "Sin resultado previo" (DEC-14) cuenta desde que se abre la vista comparativa: al reabrirla con un filtro que no se puede pedir, estados vacios | Q-23: `ComparisonPage` se desmonta al cambiar de pestana y no conserva sus datos; conservarlos exigiria subir sus peticiones a `App` | Subir las peticiones de la comparativa a `App` para conservar el ultimo resultado |
| DEC-43 | Vacio del grafico de F3 como el de los graficos existentes, con titulo y descripcion visibles | Q-24: la spec daba el texto y el rol, no el aspecto | Un aspecto propio |

## Historial de versiones

| Version | Fecha | Cambios |
| --- | --- | --- |
| 1.0 | 2026-11-16 | Especificacion inicial de F1, F2 y F3 (proyecto 3, integrada en `main` via PR #9) |
| 1.1 | 2026-11-18 | Decisiones DEC-01 a DEC-14; nuevos criterios AC-F1-15, AC-F2-13, AC-F3-15 y AC-F3-16; firmas de `formatPeriodLabel`, `formatCategoryLabel`, `buildQuery`, `getJson` y `useApiResource`. Sin cambios en el comportamiento de la 1.0 ni en los tipos |
| 1.2 | 2026-11-18 | Decisiones DEC-15 a DEC-23, que cierran los huecos encontrados al regenerar los planes sobre la 1.1; seccion [Disposicion de la pagina](#disposicion-de-la-pagina-v12-dec-19); reglas comunes de precedencia de estados y roles ARIA; criterios AC-F3-17 y AC-F3-18; se resuelve la contradiccion sobre `2024 - Full Year` (DEC-22). Sin cambios en el comportamiento de la 1.0 ni en los tipos |
| 1.3 | 2026-11-18 | Decision DEC-24 (foco tras `Clear dates`), encontrada al regenerar los planes sobre la 1.2; criterio AC-F1-16. Sin cambios en el comportamiento de la 1.0 ni en los tipos |
| 1.4 | 2026-11-18 | Tras la prueba visual de F1: DEC-25 a DEC-28; `getDateRangeIssue` y regla unica de peticion; criterios AC-F1-17 a AC-F1-20 (AC-F1-02 y AC-F1-05 ajustados); seccion de presentacion de F1; INV-7; prop `bounds` en `ComparisonPage`. **Cambia un comportamiento de la 1.0**: una fecha fuera del rango de `facets` pasa a ser error de validacion (DEC-26). Tipos de la API sin cambios |
| 1.5 | 2026-11-18 | DEC-29: aspecto unico de los errores de F2 y F3 (el aviso rojo de F1), decidido por el usuario al adaptar los planes de F2 y F3 (hueco H-11). Sin cambios de comportamiento ni de tipos |
| 1.6 | 2026-11-18 | Tras la prueba visual de F2: DEC-30 (disposicion de la tarjeta de alertas y tamano del input del umbral), criterio AC-F2-14 y aclaracion de que el umbral solo afecta a la tabla de alertas. Sin cambios de comportamiento ni de tipos |
| 1.7 | 2026-11-19 | Tras la segunda prueba visual de F2: DEC-31 (control del umbral a la derecha del titulo, aviso a todo el ancho colocado por `AlertsTable`, campo con fondo `secondary`); la disposicion de DEC-30 queda obsoleta. Sin cambios de comportamiento ni de tipos |
| 1.8 | 2026-11-19 | Tras la tercera prueba visual de F2: DEC-32 (color de la etiqueta del umbral) y correccion del caso `0,3`, que depende del idioma del navegador. Sin cambios de comportamiento ni de tipos |
| 1.9 | 2026-11-19 | Tras la etapa de planificacion de la prueba de traspaso: DEC-33 a DEC-40; se resuelve la contradiccion entre AC-F2-04 y AC-F2-05 (DEC-34); AC-F2-04, AC-F2-05, AC-F3-10 y AC-F3-16 ajustados; seccion [Presentacion de F3](#presentacion-de-f3-v19-dec-40). **Cambia la presentacion** del grafico de F3 (etiqueta en cada barra y descripcion visible, DEC-38 y DEC-39); el resto fija lo que ya hacia la iteracion 1. Tipos sin cambios |
| 1.10 | 2026-11-19 | Tras la segunda revision de los planes del agente de traspaso: DEC-41 a DEC-43 (resultado visible al volver a una ruta con error, alcance de "sin resultado previo" en la vista comparativa y aspecto del vacio de su grafico). Sin cambios de comportamiento ni de tipos |
