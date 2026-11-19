# F1 - Filtro de rango de fechas: plan de implementacion

**Version:** 8.1 | **Fecha:** 2026-11-19 | **Estado:** version de entrega, sin codigo | **Spec:** v1.9

**Como ejecutar:** tarea por tarea y en orden; marcar cada paso (`- [ ]`) al completarlo. No empezar una tarea sin que la anterior tenga sus tests en verde. Cada test se ve fallar antes de implementar.

**Sobre esta version:** el plan dice que construir, con que interfaces y con que tests; no incluye el codigo. La version 7.0 (con codigo) es la que se uso en la iteracion 1 y queda en el historial de git (commit `9297324`).

**Objetivo:** un unico filtro de fechas (inicio/fin, opcionales) bajo el encabezado que filtra KPI y graficos, con el rango disponible de `facets` como referencia, que solo pide datos cuando el filtro es completo, esta dentro del rango y no esta invertido.

**Arquitectura:** utilidades puras en `src/lib` (validacion, etiqueta de periodo, query string), la capa de datos compartida de la spec (`api.ts` + `useApiResource`, DEC-05), un componente controlado `DateRangePicker` con sus avisos y la orquestacion en `App`. Este plan crea la base que usan F2 y F3.

**Stack:** React 19.2, TypeScript ~6.0, Vitest 4 + jsdom (patron `createRoot` de `App.test.tsx`, sin librerias de test nuevas), Tailwind 4, lucide-react.

**Spec:** [components.md v1.4](../../frontend/specs/components.md): F1 (incluida su seccion de presentacion), convenciones comunes, utilidades compartidas y regla unica de peticion, capa de datos, disposicion de la pagina y DEC-01 a DEC-05, DEC-07, DEC-19, DEC-22 y DEC-24 a DEC-28.

**Reglas del proyecto:** WF (todas), FE (TSX, formatters, tests), API (consumo de `/api/metrics` y `/facets`), CAL (fechas y etiqueta de periodo), FIN (KPI recalculados en tests).

**Rama:** `feature/frontend-specs-v2-fase6-f1` desde `feature/frontend-specs-v2` (ver [ROADMAP-Project-3](../entregables/ROADMAP-Project-3.md#9-ampliacion-v2-planes-implementacion-y-prueba-de-traspaso)). Commits solo con autorizacion del usuario (WF 8).

## Restricciones globales

- Componentes en `frontend/src/components/dashboard/`, kebab-case, export PascalCase, imports con `@`. Sin fetch en componentes.
- Estilo de cada archivo: comillas simples y sin punto y coma en `components/dashboard`; comillas dobles y punto y coma en `App.tsx` y `src/lib`.
- Textos de UI en ingles. Importes con `formatCurrency`, porcentajes con `formatPercent`.
- Regla unica de peticion: solo se pide si `getDateRangeIssue(filter, bounds) === null` (DEC-26). Nunca un parametro `undefined` o `''` (INV-1), nunca `start_date > end_date` (INV-2), nunca, si `facets` cargo, una fecha fuera de su rango o con el ano con cero inicial (INV-7). `/api/metrics` solo con fechas.
- Orden de query fijo (DEC-07). Tipos de `specs/` copiados a `src/lib`, no movidos (DEC-01).
- Unica fecha fija permitida: `2024 - Full Year` en el encabezado sin filtro (DEC-22).
- Presentacion segun la seccion de la spec (DEC-27, DEC-28).
- Sin dependencias nuevas, sin `any` explicito ni casts, sin backend, sin cambiar la firma de `DashboardHeader`.
- Sin `setState` sincrono en el cuerpo de un `useEffect`: lo rechaza la regla `react-hooks/set-state-in-effect` del lint (DEC-05).

## Mapa de archivos

| Archivo | Responsabilidad | Tarea |
| --- | --- | --- |
| `src/lib/api-types.ts`, `src/lib/param-types.ts` | Copia de los tipos de `specs/` con el import `./financial-types` | 1 |
| `src/lib/financial-utils.ts` | `isValidDateRange`, `formatPeriodLabel`, `getDateRangeIssue`, tipos `DateBounds` y `DateRangeIssue` | 1 |
| `src/lib/api.ts` | `API_BASE_URL`, `buildQuery`, `getJson` | 2 |
| `src/lib/use-api-resource.ts` | Hook `useApiResource` | 3 |
| `src/test-helpers.ts` | Helpers de test compartidos | 3 |
| `src/components/dashboard/date-range-picker.tsx` | Componente `DateRangePicker` | 4 |
| `src/App.tsx` | Estado del filtro, `facets`, movimientos y render | 5 |

## Decisiones propias del plan (implementacion, no producto)

- Helpers de test en `src/test-helpers.ts`: `jsonResponse(body, status = 200)`, `deferred<T>()` (promesa resuelta a mano), `setInputValue(input, value)` (setter nativo de `value` mas evento `input` con `bubbles: true`, para que React detecte el cambio), `inputByLabel(container, text)` y `buttonByText(container, text)` (lanzan un error si no encuentran el elemento, para que `vi.waitFor` reintente) y `mountRoot()` (contenedor en `document.body`, `createRoot` y `cleanup`).
- En `App.test.tsx`, un `stubApi(route?)` comun simula `fetch` segun la URL: `facets` de prueba con rango `2025-11-01` a `2026-10-28`; `/api/metrics` sin filtro devuelve `income` 1000 y `outcome` 250; `/api/metrics?...` devuelve `income` 100 y `outcome` 25; cualquier otra URL, `[]`. `route` permite sustituir la respuesta de una URL.
- `LAZY_CHARTS = { timeout: 5000 }` en las esperas que dependen de los graficos diferidos.
- Evidencia en `docs/validations/08-features-checks.md`.

## Notas para la ejecucion (de la iteracion 1)

- Con el limite por defecto de `vi.waitFor` (1000 ms), el test existente `announces a load error…` puede fallar antes de cualquier cambio: los graficos diferidos tardan unos 1100 ms en jsdom. Comprobarlo antes de empezar y usar `LAZY_CHARTS` en esas esperas, sin cambiar aserciones.
- Chrome entrega una fecha valida por cada digito del ano cuando se escribe a mano (`0001`, `0019`, `0190`, `1900`): es el caso de DEC-25 y de su test.
- Vite en Docker puede seguir sirviendo un modulo antiguo tras editarlo: antes de cada prueba visual, comprobar con `curl` el modulo servido y, si hace falta, `docker compose restart frontend`.

## Foco de revision

1. **Ano escrito a mano:** ninguna peticion ni aviso con los valores intermedios; aviso al completar un ano fuera de rango.
2. **Error y recuperacion:** si `/api/metrics` falla y el siguiente filtro responde bien, desaparece el banner y vuelven los KPI.
3. **Filtro no pedible y vuelta al mismo rango valido:** no debe quedar `Skeleton` colgado.
4. **Cambios rapidos de fecha:** respuestas en orden inverso; solo cuenta la ultima (AC-F1-14).
5. **Facets falla:** sin referencia, sin banner y sin comprobar el rango; el dashboard funciona.

---

### Tarea 1: Tipos y utilidades de fecha

**Archivos:** crear `src/lib/api-types.ts` y `src/lib/param-types.ts`; modificar `src/lib/financial-utils.ts`; test `src/lib/financial-utils.test.ts`.

**Interfaces (produce):**
- `isValidDateRange(filter: DateRangeFilter): boolean`: true si falta una fecha o si `start_date <= end_date` (comparacion de cadenas, sin `Date`).
- `formatPeriodLabel(filter: DateRangeFilter): string | null`: `{start} — {end}` (raya U+2014 con espacios), `From {start}`, `Until {end}` o `null`, con las fechas tal cual.
- `type DateBounds = { min_date: string; max_date: string }` y `type DateRangeIssue = "incomplete" | "outOfBounds" | "inverted"`.
- `getDateRangeIssue(filter: DateRangeFilter, bounds: DateBounds | null): DateRangeIssue | null`, en este orden: `incomplete` si alguna fecha empieza por `0`; `outOfBounds` si `bounds` existe y alguna fecha queda fuera de `[min_date, max_date]`; `inverted` si `isValidDateRange` es false; si no, `null`.

- [ ] **Paso 1: tests que fallan.** `bounds` = `2025-11-01` a `2026-10-28`.

| Test | Entrada | Esperado |
| --- | --- | --- |
| `accepts empty, single-ended, equal and ordered ranges` | `{}`, solo inicio, solo fin, `2026-01-15`/`2026-01-15`, `2025-12-31`/`2026-01-01` | `isValidDateRange` true |
| `rejects a start date after the end date` | `2026-01-02`/`2026-01-01` | false |
| `labels the period with raw dates` (DEC-02) | `{}`; ambas; solo inicio; solo fin | `null`; `2026-01-01 — 2026-01-31`; `From 2026-01-01`; `Until 2026-01-31` |
| `labels an inverted range as typed` (DEC-03) | `2026-02-01`/`2026-01-01` | `2026-02-01 — 2026-01-01` |
| `accepts ranges inside the bounds, including the limits` | `{}`; `2025-11-01`/`2026-10-28` | `null` |
| `treats a zero-padded year as a date still being typed` (DEC-25) | inicio `0001-02-02`, `0019-02-02`, `0190-02-02`, con `bounds` y con `null` | `incomplete` |
| `rejects complete dates outside the bounds` (DEC-26) | inicio `1900-02-02`; fin `2026-10-29`; inicio `2025-10-31` | `outOfBounds` |
| `does not check bounds when they are unknown` | inicio `1900-02-02`, `bounds` null | `null` |
| `reports out of bounds before an inverted range` | `2027-01-01`/`2026-01-01` | `outOfBounds` |
| `reports an inverted range inside the bounds` | `2026-02-01`/`2026-01-01` | `inverted` |

- [ ] **Paso 2:** `npm --prefix frontend test -- src/lib/financial-utils.test.ts` -> FAIL (funciones no exportadas).
- [ ] **Paso 3: implementar.** Copiar los dos archivos de `specs/` cambiando solo el import. Anadir las funciones y tipos en `financial-utils.ts` con un docstring breve cada una.
- [ ] **Paso 4:** mismo comando -> PASS, incluidos los 6 tests previos.
- [ ] **Paso 5:** `npm --prefix frontend run build` -> exit 0, sin avisos nuevos.
- [ ] **Paso 6: commit** `feat(f1): add date range types and helpers`.

### Tarea 2: Cliente API (`api.ts`)

**Archivos:** crear `src/lib/api.ts`; test `src/lib/api.test.ts`.

**Interfaces (produce):**
- `API_BASE_URL: string` = `import.meta.env.VITE_API_BASE_URL ?? ""` (se mueve desde `App.tsx`).
- `buildQuery(params: AlertsParams | TopCategoriesParams): string`: `""` sin parametros o `?a=b&...` en el orden de las claves; omite `undefined` y `''` (con `URLSearchParams`).
- `getJson<T>(path: string): Promise<T>`: `fetch(API_BASE_URL + path)`; si `!response.ok` lanza un `Error` cuyo mensaje incluye el status.

- [ ] **Paso 1: tests que fallan**

| Test | Entrada | Esperado |
| --- | --- | --- |
| `omits undefined and empty values` | `{}`; `{ start_date: undefined }`; `{ start_date: "", end_date: "2026-01-31" }` | `""`; `""`; `?end_date=2026-01-31` |
| `keeps key order and serializes numbers` (DEC-07) | `{ threshold: 0.3, start_date: "2026-01-01" }`; `{ operation_type: "income", limit: 5, business_type: "B2B" }` | `?threshold=0.3&start_date=2026-01-01`; `?operation_type=income&limit=5&business_type=B2B` |
| `returns the parsed body` | `fetch` simulado con cuerpo `{ ok: 1 }` | resuelve `{ ok: 1 }`; `fetch` llamado con `/api/x` |
| `rejects on a non-2xx response` | `fetch` simulado con 422 | rechaza con un mensaje que contiene `422` |

- [ ] **Paso 2:** `npm --prefix frontend test -- src/lib/api.test.ts` -> FAIL (modulo no encontrado).
- [ ] **Paso 3: implementar** `api.ts`.
- [ ] **Paso 4:** mismo comando -> PASS (4 tests).
- [ ] **Paso 5: commit** `feat(f1): add api query builder and json fetch`.

### Tarea 3: Hook `useApiResource` y helpers de test

**Archivos:** crear `src/lib/use-api-resource.ts` y `src/test-helpers.ts`; test `src/lib/use-api-resource.test.tsx` (`// @vitest-environment jsdom`).

**Interfaces (produce):**
- `useApiResource<T>(path: string | null): { data: T | null; loading: boolean; error: boolean }`, con la semantica de la spec (DEC-05).
- Implementacion: guardar en estado el ultimo resultado `{ path, data, error }`; un `useEffect` sobre `path` pide con `getJson` si no es `null` y descarta respuestas viejas con una variable `ignore` que el cleanup pone a true; el estado solo cambia dentro de `.then` / `.catch`. Derivados: `loading = path !== null && path !== ultimo.path`; `error = !loading && ultimo.error`; un error deja `data = null`.
- Helpers de test: ver "Decisiones propias del plan".

- [ ] **Paso 1: tests que fallan,** con un componente `Probe({ path })` que pinta `JSON.stringify(useApiResource<string>(path))`:

| Test | Escenario | Esperado |
| --- | --- | --- |
| `loads data and clears loading` | `/a` pendiente y despues resuelto con `"a"` | primero `{ data: null, loading: true, error: false }`; despues `{ data: "a", loading: false, error: false }` |
| `sets error and drops data on a failed request` | `/a` responde 500 | `{ data: null, loading: false, error: true }` |
| `keeps the last data and does not fetch when path is null` | `/a` resuelto, despues `null` | `data: "a"`, `loading: false`, `fetch` llamado 1 vez |
| `shows only the response for the latest path` | `/a` -> `/b`; se resuelve `/b` y despues `/a` | `data` queda en `"b"` |
| `does not stay loading when returning to the last loaded path` (DEC-33) | `/a` -> `null` -> `/a` | `loading: false`, `data: "a"` y `fetch` llamado 2 veces: la ruta se pide de nuevo |
| `keeps the last data while a new path loads` (DEC-33) | `/a` resuelto con `"a"`, despues `/b` pendiente | `{ data: "a", loading: true, error: false }` |
| `discards a pending response when path becomes null` (DEC-33) | `/a` resuelto con `"a"`, `/b` pendiente, `null` y despues se resuelve `/b` | `{ data: "a", loading: false, error: false }` |

- [ ] **Paso 2:** `npm --prefix frontend test -- src/lib/use-api-resource.test.tsx` -> FAIL (import no resuelto).
- [ ] **Paso 3: implementar** el hook y los helpers.
- [ ] **Paso 4:** mismo comando -> PASS (7 tests); `npm --prefix frontend run lint` -> sin errores.
- [ ] **Paso 5: commit** `feat(f1): add useApiResource hook and test helpers`.

### Tarea 4: Componente `DateRangePicker`

**Archivos:** crear `src/components/dashboard/date-range-picker.tsx`; test `date-range-picker.test.tsx` (jsdom).

**Interfaces:**
- Consume: `getDateRangeIssue` (Tarea 1).
- Produce: `DateRangePicker(props: DateRangePickerProps)` con las props de la spec. Controlado: no guarda fechas en estado propio.

**Comportamiento a implementar:**
- Dos inputs `type="date"` con etiqueta visible (`useId` para asociar etiqueta e input). Un input vacio emite el filtro sin su clave.
- `Clear dates` solo con alguna fecha: llama `onChange({})` y mueve el foco al input `Start date` (con una `ref`), porque el boton desaparece.
- `Available data` en su linea bajo los inputs; `Skeleton` `h-4 w-64` mientras `boundsLoading` (DEC-40); nada si `bounds` es `null`. `min` y `max` solo con `bounds`.
- `issue = getDateRangeIssue(value, bounds)`. Un solo aviso: `outOfBounds` -> `Dates must be between {min_date} and {max_date}.`; `inverted` -> `Start date must be on or before end date.`; `incomplete` -> ninguno.
- `aria-invalid`: en los dos inputs si `inverted`; solo en el input fuera de rango si `outOfBounds`; en ninguno si `incomplete`.
- Aviso: componente interno con `role="alert"`, icono `AlertCircle` y los estilos de la seccion de presentacion de la spec. Contenedor `div role="group" aria-label="Date range"` (DEC-19).

- [ ] **Paso 1: tests que fallan.** `BOUNDS` = `2025-11-01` a `2026-10-28`.

| Test | Escenario | Esperado |
| --- | --- | --- |
| `renders two empty optional date inputs` (AC-F1-01) | `value={}` | dos inputs `date` con etiquetas `Start date` y `End date`, vacios, sin `required` |
| `emits the new start date keeping the end date` | `value={ end_date: 2026-01-31 }`, escribir inicio `2026-01-01` | `onChange({ start_date: "2026-01-01", end_date: "2026-01-31" })` |
| `omits the key of an emptied input` (AC-F1-08) | ambas fechas, vaciar inicio | el argumento solo tiene la clave `end_date` |
| `shows the available range and sets min/max` (AC-F1-02) | `bounds=BOUNDS` | texto `Available data: 2025-11-01 to 2026-10-28`; ambos inputs con `min` y `max` |
| `shows a skeleton while bounds load without blocking inputs` (AC-F1-03) | `boundsLoading` | hay `[data-slot="skeleton"]`; sin texto de referencia; input sin `disabled` ni `min` |
| `hides the reference line when bounds failed` (AC-F1-04) | `bounds={null}` | sin texto, sin skeleton, sin `role="alert"`, sin `min`/`max` |
| `shows Clear dates only with a date and clears both` (AC-F1-11) | sin fechas; despues con fin | sin boton; con boton, el click llama `onChange({})` |
| `moves focus to the start date after clearing` (AC-F1-16) | con inicio, click en `Clear dates` | `document.activeElement` es el input `Start date` |
| `flags an inverted range` (AC-F1-09) | `2026-02-01`/`2026-01-01` | `role="alert"` con el texto del rango invertido; ambos inputs `aria-invalid="true"` |
| `flags a date outside the available range` (AC-F1-18) | inicio `1900-02-02`, `BOUNDS` | `role="alert"` con `Dates must be between 2025-11-01 and 2026-10-28.`; solo inicio `aria-invalid` |
| `shows one notice at a time, out of range first` (AC-F1-19) | `2027-01-01`/`2026-01-01`, `BOUNDS` | un unico `role="alert"`, el de fuera de rango; `aria-invalid` solo en `Start date` (DEC-37) |
| `shows no message while a year is being typed` (AC-F1-17) | inicio `0019-02-02`, `BOUNDS` | sin `role="alert"` ni `aria-invalid` |
| `accepts a single-day range` (AC-F1-07) | `2026-01-15`/`2026-01-15` | sin `role="alert"` ni `aria-invalid` |
| `is a labelled group, not a section` (DEC-19) | `value={}` | existe `[role="group"][aria-label="Date range"]`; ninguna `section` |

- [ ] **Paso 2:** `npm --prefix frontend test -- src/components/dashboard/date-range-picker.test.tsx` -> FAIL.
- [ ] **Paso 3: implementar** el componente.
- [ ] **Paso 4:** mismo comando -> PASS (14 tests).
- [ ] **Paso 5: commit** `feat(f1): add DateRangePicker component`.

### Tarea 5: Integracion en `App`

**Archivos:** modificar `src/App.tsx`; test `src/App.test.tsx` (en los 2 tests existentes solo se anade `LAZY_CHARTS` a la espera de los graficos; nuevo `describe("date range filter")`).

**Interfaces (produce, para F2/F3):** en `App`, el estado `filter: DateRangeFilter` (inicial `{}`); `facets = useApiResource<FacetsResponse>("/api/metrics/facets")`; `bounds` con `min_date`/`max_date` de `facets.data` o `null`; `movements = useApiResource<FinancialMovement[]>(getDateRangeIssue(filter, bounds) === null ? "/api/metrics" + buildQuery(filter) : null)`. En `App.test.tsx`: `stubApi`, `calledUrls`, `movementCalls`, `kpiValues` (valores de las 4 tarjetas KPI), `renderLoaded` y `setDate`.

**Render:** `DashboardHeader` con `formatPeriodLabel(filter) ?? "2024 - Full Year"`; `DateRangePicker` bajo el encabezado; aviso `No movements found for the selected range.` (`role="status"`) si no carga y la respuesta es `[]`; banner actual en espanol si `movements.error`; KPI con `computeKPIs` solo si hay movimientos (si no, `null` y se ven `—`); graficos con `computeMonthlyData` o `[]`; `loading` y `aria-busy` de las secciones desde `movements.loading`. Se eliminan de `App.tsx` `API_BASE_URL`, `fetchFinancialData` y los estados `metrics`, `monthlyData`, `loading` y `error`.

- [ ] **Paso 1: tests que fallan**

| Test | Escenario | Esperado |
| --- | --- | --- |
| `requests facets and unfiltered movements on load` (AC-F1-02) | carga | se pide `/api/metrics/facets`; movimientos solo `/api/metrics`; texto `Available data: 2025-11-01 to 2026-10-28` |
| `refetches with only the informed dates and recalculates KPIs` (AC-F1-05/06/12) | inicio `2026-01-01`; despues fin `2026-01-31` | `/api/metrics?start_date=2026-01-01`, encabezado `From 2026-01-01`, KPI `$100`, `$25`, `$75`, `75.0%`; despues `...&end_date=2026-01-31` y `2026-01-01 — 2026-01-31` |
| `blocks requests and keeps data on an inverted range` (AC-F1-09, AC-F1-15, INV-2) | fin `2026-01-01`, inicio `2026-02-01`, despues vaciar inicio | sin llamadas nuevas, KPI anteriores, aviso, encabezado `2026-02-01 — 2026-01-01`; al vaciar, `Until 2026-01-01` y sin `Skeleton` en KPI |
| `shows dashes, empty charts and a notice for an empty range` (AC-F1-10) | inicio `2026-10-28` con respuesta `[]` | KPI `—` x4, dos `No data available to display`, `role="status"` con el aviso |
| `hides the empty-range notice while reloading` (DEC-33) | inicio `2026-10-28` con `[]`; despues inicio `2026-01-01` con la respuesta pendiente | aviso visible con `[]`; sin aviso mientras carga |
| `clears both dates and reloads without filters` (AC-F1-11, DEC-22) | inicio y despues `Clear dates` | ultima llamada `/api/metrics`, encabezado `2024 - Full Year`, KPI `$1,000`, `$250`, `$750`, `75.0%` |
| `works without the reference line when facets fails` (AC-F1-04) | `facets` 500 | sin `Available data`, sin `role="alert"`, input sin `min`, KPI con valores |
| `shows dashes and the banner when movements fail, and recovers` (AC-F1-13) | `/api/metrics` 500; despues inicio con 200 | banner `No se pudo cargar…` y KPI `—`; despues sin banner y KPI del filtro |
| `renders only the latest response` (AC-F1-14) | dos inicios con respuestas resueltas en orden inverso | KPI de la ultima |
| `does not request while a year is typed nor for a date outside the range` (AC-F1-17/18, INV-7) | inicio `0001-02-02`, `0019-02-02`, `0190-02-02`, `1900-02-02` | aviso `Dates must be between 2025-11-01 and 2026-10-28.`; movimientos solo `/api/metrics`; KPI sin cambios |
| `never sends empty or invalid date params` (INV-1, INV-4) | inicio y fin, despues vaciar inicio | ultima `/api/metrics?end_date=2026-01-31`; ninguna URL con `=&`, `=` final, `undefined`, `category` ni `operation_type` |

- [ ] **Paso 2:** `npm --prefix frontend test -- src/App.test.tsx` -> FAIL en los nuevos; los 2 existentes pasan.
- [ ] **Paso 3: implementar** los cambios de `App.tsx`.
- [ ] **Paso 4:** mismo comando -> PASS (13 tests).
- [ ] **Paso 5: commit** `feat(f1): wire date range filter into App`.

### Tarea 6: Verificacion final y evidencia

**Archivos:** `docs/validations/08-features-checks.md` (seccion F1), `memory-bank/status.md`, `memory-bank/stack.md`.

Procedimiento del repositorio para verificar cambios del frontend: [.skills/verify-frontend-change/SKILL.md](../../.skills/verify-frontend-change/SKILL.md).

- [ ] **Paso 1:** `npm --prefix frontend run lint`, `npm --prefix frontend test`, `npm --prefix frontend run build` -> sin errores ni avisos (linea base: chunk principal 187.77 kB).
- [ ] **Paso 2:** comprobacion de tipos de specs (comando 2 del [README de specs](../../frontend/specs/README.md#verificacion-de-tipos)) -> exit 0.
- [ ] **Paso 3: los tests detectan la rotura.** Aplicar cada rotura sola, ejecutar el test y restaurar:

| Rotura | Test que debe fallar |
| --- | --- |
| Sin `role="alert"` en el aviso | `flags an inverted range` |
| Sin mover el foco en `Clear dates` | `moves focus to the start date after clearing` |
| `App` pide sin la regla unica | `blocks requests and keeps data on an inverted range` |
| Sin la guarda `ignore` del hook | `shows only the response for the latest path` |
| Sin la deteccion de ano incompleto | `treats a zero-padded year…` y `shows no message while a year is being typed` |
| Aviso de invertido calculado aparte de `getDateRangeIssue` | `shows one notice at a time, out of range first` |

- [ ] **Paso 4: app en ejecucion** (usuario). `docker compose up --build`; confirmar con `curl -s http://localhost:5173/src/components/dashboard/date-range-picker.tsx` que Vite sirve el codigo nuevo. Comprobar: referencia real de `facets` bajo los inputs, una sola fecha, ano escrito a mano sin peticiones (pestana Red), fecha fuera de rango, rango invertido, rango sin datos, `Clear dates` con teclado y el aspecto del filtro (AC-F1-20). Comparar los KPI con los totales que devuelve `curl` para el mismo rango.
- [ ] **Paso 5:** registrar comandos, salidas, roturas y prueba visual en `08-features-checks.md`; actualizar memory-bank; `git diff --check`.
- [ ] **Paso 6: commit** `docs(f1): record verification evidence`.

## Historial del plan

| Version | Fecha | Cambios |
| --- | --- | --- |
| 1.0 | 2026-11-18 | Plan inicial sobre la spec 1.0, con decisiones propias |
| 2.0 | 2026-11-18 | Regenerado sobre la spec 1.1; huecos H-05 y H-08 provisionales |
| 3.0 | 2026-11-18 | Regenerado sobre la spec 1.2: H-05 y H-08 pasan a DEC-19 y DEC-22; sin referencias a herramientas externas al repositorio; nuevo hueco H-10 |
| 4.0 | 2026-11-18 | Regenerado sobre la spec 1.3: H-10 pasa a DEC-24; sin huecos pendientes |
| 5.0 | 2026-11-18 | Ejemplos de codigo de implementacion en cada tarea |
| 6.0 | 2026-11-18 | Iteracion 1 ejecutada; tarea 7 con los cambios de la prueba visual |
| 7.0 | 2026-11-18 | Regenerado sobre la spec 1.4; cambios de la prueba visual integrados en sus tareas; codigo igual al implementado (commit `9297324`) |
| 8.0 | 2026-11-18 | Version de entrega sin codigo: interfaces y comportamiento en texto, casos de test en tablas con sus valores exactos, mapa de archivos y notas de la iteracion 1 |
| 8.1 | 2026-11-19 | Spec 1.9, tras la planificacion de la prueba de traspaso: tests de los casos limite de `useApiResource` y del aviso de rango vacio durante la recarga (DEC-33), `aria-invalid` con dos problemas (DEC-37) y tamano del `Skeleton` de `Available data` (DEC-40). Las versiones 1.5 a 1.8 de la spec no afectaban a F1 |
