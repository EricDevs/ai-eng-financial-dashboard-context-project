# F1 - Filtro de rango de fechas: plan de implementacion

**Objetivo:** un unico filtro de fechas (inicio y fin, opcionales) que filtra KPI y graficos, con el rango de `facets` como referencia y validacion antes de pedir.

**Arquitectura:** utilidades puras de fechas en `financial-utils.ts`; capa de datos compartida (`api.ts` + hook `useApiResource`) que tambien usaran F2 y F3; componente controlado `DateRangePicker`; `App` guarda `filter`, deriva la ruta de movimientos con la regla unica de peticion y la pasa al hook.

**Stack:** React 19, TypeScript 6, Tailwind 4, Vitest 4 + jsdom (sin Testing Library: no se anaden dependencias).

**Spec:** v1.10. [README](../../frontend/specs/README.md#f1---filtro-de-rango-de-fechas) y [components.md, F1](../../frontend/specs/components.md#f1---filtro-de-rango-de-fechas). La v1.9 y la v1.10 cierran las dudas que afectan a F1 (Q-01 a Q-04, Q-09, Q-13, Q-14 y Q-22). Las de proceso (Q-10 a Q-12) las respondio el mantenedor. No queda ninguna abierta ([decisions.md](decisions.md)).

## Cambios respecto a la version anterior

### Spec v1.9 a v1.10

- Tarea 2: la variante con error del test `refetches when the same path comes back after null` queda fijada por DEC-41: mientras llega la nueva peticion se ve el error. Antes dependia de Q-22. No cambia el codigo previsto.

### Spec v1.8 a v1.9

- Tarea 2: los casos limite del hook dejan de depender de respuestas (DEC-33). Hay un test nuevo, `keeps the previous data while a new path loads`, y el de volver a la misma ruta fija `loading: false` con los datos anteriores visibles. Se anade una variante con error, que depende de Q-22.
- Tarea 3: `aria-invalid` solo en el input fuera de rango cuando ademas el rango esta invertido (DEC-37). El `Skeleton` de `Available data` mide `h-4 w-64` (DEC-40; la propuesta era `h-5`).
- Tarea 4: el aviso `No movements found...` es texto `text-sm` en `muted-foreground`, sin caja ni icono (DEC-40). No se muestra mientras cargan los movimientos (DEC-33), con un test nuevo: `hides the empty notice while reloading`.
- Proceso. Q-10: los tests existentes se adaptan en la Tarea 4 sin relajar las comparaciones exactas. Q-11: hay una mutacion nueva (6) y cada mutacion se registra con el test que fallo. Q-12: se anade al final la seccion `Registro de ejecucion`.

## Restricciones globales

Valen para F1, F2 y F3.

- Sin dependencias nuevas, sin router, sin cambios de backend (`backend/` no se toca).
- Textos de la interfaz en ingles; `formatCurrency` y `formatPercent` sin cambios.
- Sin `any`, `object` ni conversiones de tipo para ocultar diferencias con la API.
- Un parametro `undefined` o `''` no se envia (INV-1). Orden fijo de parametros: propios del endpoint y luego `start_date`, `end_date` (DEC-07).
- Los componentes de `components/dashboard/` no hacen fetch; archivos kebab-case, export PascalCase, imports con `@`.
- Ningun `setState` sincrono en el cuerpo de un `useEffect` (regla `react-hooks/set-state-in-effect`).
- Fechas como cadenas `YYYY-MM-DD`; nunca se convierten a `Date` (DEC-02, regla CAL). Ninguna fecha fija salvo `2024 - Full Year` sin filtro (DEC-22).
- Reglas leidas: WF (todas las tareas), API (consumo de endpoints y tipos), CAL (fechas y etiqueta de periodo), FE (TSX, estilos, tests), FIN (fixtures de KPI en tests).

## Foco de revision

Casos que la spec implica y que pueden fallar a un usuario aunque los criterios pasen; cada uno tiene su test en la tarea indicada.

1. Ano tecleado digito a digito (`0001`, `0019`, `0190`, `1900`): ninguna peticion intermedia (Tarea 4, test `does not request while the year is being typed`).
2. `facets` llega despues de que el usuario escribio una fecha fuera de rango: la peticion ya salio, pero al llegar `bounds` el filtro pasa a no pedible y aparece el aviso (Tarea 4, test `blocks a date that becomes out of bounds when facets arrives`).
3. Respuestas fuera de orden al cambiar fechas deprisa (Tarea 2, test del hook `keeps only the response of the current path`).
4. Vaciar un input con el boton nativo del navegador entrega `''`: la clave se omite y no se envia `start_date=` (Tarea 3, test `omits the key of an emptied input`).
5. Rango valido sin movimientos frente a error de red: `—` en ambos, pero el aviso `No movements found...` solo en el primero (Tarea 4, tests de vacio y de error).

---

### Tarea 1: tipos copiados y utilidades de fechas

**Archivos:**
- Crear: `frontend/src/lib/api-types.ts`, `frontend/src/lib/param-types.ts` (copia de `specs/`, import cambiado a `./financial-types`; DEC-01)
- Modificar: `frontend/src/lib/financial-utils.ts`
- Test: `frontend/src/lib/financial-utils.test.ts`

**Interfaces:**
- Produce (en `financial-utils.ts`): `type DateBounds = { min_date: string; max_date: string }`, `type DateRangeIssue = 'incomplete' | 'outOfBounds' | 'inverted'`, `isValidDateRange(filter: DateRangeFilter): boolean`, `formatPeriodLabel(filter: DateRangeFilter): string | null`, `getDateRangeIssue(filter: DateRangeFilter, bounds: DateBounds | null): DateRangeIssue | null`. Los dos tipos se exportan.

- [ ] **Paso 1: tests que fallan** (`describe("date range utilities")`, `bounds = { min_date: "2025-11-01", max_date: "2026-10-28" }`):

```ts
expect(isValidDateRange({})).toBe(true)
expect(isValidDateRange({ start_date: "2026-02-01" })).toBe(true)
expect(isValidDateRange({ start_date: "2026-01-31", end_date: "2026-01-31" })).toBe(true)
expect(isValidDateRange({ start_date: "2026-02-01", end_date: "2026-01-31" })).toBe(false)

expect(formatPeriodLabel({})).toBeNull()
expect(formatPeriodLabel({ start_date: "2026-01-01", end_date: "2026-01-31" })).toBe("2026-01-01 — 2026-01-31")
expect(formatPeriodLabel({ start_date: "2026-01-01" })).toBe("From 2026-01-01")
expect(formatPeriodLabel({ end_date: "2026-01-31" })).toBe("Until 2026-01-31")
expect(formatPeriodLabel({ start_date: "2026-02-01", end_date: "2026-01-01" })).toBe("2026-02-01 — 2026-01-01")

expect(getDateRangeIssue({}, bounds)).toBeNull()
expect(getDateRangeIssue({ start_date: "2025-11-01", end_date: "2026-10-28" }, bounds)).toBeNull() // limites inclusivos
expect(getDateRangeIssue({ start_date: "0019-02-02" }, null)).toBe("incomplete")
expect(getDateRangeIssue({ end_date: "0190-02-02", start_date: "2026-01-01" }, bounds)).toBe("incomplete") // antes que inverted
expect(getDateRangeIssue({ start_date: "2025-10-31" }, bounds)).toBe("outOfBounds")
expect(getDateRangeIssue({ end_date: "2026-10-29" }, bounds)).toBe("outOfBounds")
expect(getDateRangeIssue({ start_date: "2025-10-31" }, null)).toBeNull() // sin bounds no se comprueba
expect(getDateRangeIssue({ start_date: "2026-02-01", end_date: "2026-01-01" }, bounds)).toBe("inverted")
expect(getDateRangeIssue({ start_date: "2030-01-01", end_date: "2026-01-01" }, bounds)).toBe("outOfBounds") // primer problema
```

- [ ] **Paso 2:** `npm --prefix frontend test -- src/lib/financial-utils.test.ts` -> FAIL (funciones no exportadas).
- [ ] **Paso 3:** implementar las tres funciones con comparacion de cadenas (sin `Date`). `incomplete`: alguna fecha empieza por `0`. Separador de la etiqueta: espacio, raya `—`, espacio.
- [ ] **Paso 4:** mismo comando -> PASS (6 tests previos + nuevos). Sin `Date`, el huso horario no interviene; no hace falta repetir con otro `TZ` (regla CAL, se anota en el registro).
- [ ] **Paso 5:** commit `feat(f1): add date range utilities and API types`.

### Tarea 2: capa de datos compartida

**Archivos:**
- Crear: `frontend/src/lib/api.ts`, `frontend/src/lib/use-api-resource.ts`
- Test: `frontend/src/lib/api.test.ts`, `frontend/src/lib/use-api-resource.test.tsx` (`// @vitest-environment jsdom`)

**Interfaces:**
- Produce: `API_BASE_URL: string`, `buildQuery(params: AlertsParams | TopCategoriesParams): string`, `getJson<T>(path: string): Promise<T>`, `useApiResource<T>(path: string | null): { data: T | null; loading: boolean; error: boolean }`.

- [ ] **Paso 1: tests que fallan.** `api.test.ts`:

```ts
expect(buildQuery({})).toBe("")
expect(buildQuery({ threshold: 0.3, start_date: "2026-01-01", end_date: "2026-01-31" }))
  .toBe("?threshold=0.3&start_date=2026-01-01&end_date=2026-01-31")
expect(buildQuery({ start_date: "", end_date: "2026-01-31" })).toBe("?end_date=2026-01-31")
expect(buildQuery({ start_date: undefined })).toBe("")
expect(buildQuery({ operation_type: "income", limit: 5, business_type: "B2B", start_date: "2026-01-01" }))
  .toBe("?operation_type=income&limit=5&business_type=B2B&start_date=2026-01-01")
// getJson: fetch stub
await expect(getJson("/api/metrics")).resolves.toEqual([])         // 200 con []
expect(fetchMock).toHaveBeenCalledWith("/api/metrics")              // API_BASE_URL vacia en test
await expect(getJson("/api/metrics")).rejects.toThrow()             // 500
```

`use-api-resource.test.tsx`: un componente `Probe({ path })` pinta `JSON.stringify(useApiResource(path))`; fetch con promesas controladas a mano. Tests:
  - `does not fetch with a null path`: sin llamadas; `{ data: null, loading: false, error: false }`.
  - `loads and exposes the data`: `loading: true` y luego `{ data: [1], loading: false, error: false }`.
  - `reports an error with null data`: 500 -> `{ data: null, loading: false, error: true }`.
  - `keeps only the response of the current path`: ruta A (pendiente), cambio a B, B resuelve `"b"`, A resuelve `"a"` despues -> `data` es `"b"`.
  - `keeps the previous data while a new path loads` (DEC-33): tras cargar A con `[1]`, ruta B pendiente -> `{ data: [1], loading: true, error: false }`.
  - `keeps the last data when the path becomes null`: tras cargar A, ruta `null` -> mismo `data`, `loading: false`, sin fetch nuevo.
  - `discards an in-flight response when the path becomes null` (DEC-33): tras cargar A con `[1]`, ruta B pendiente y despues `null`; B resuelve `[2]` -> `{ data: [1], loading: false, error: false }`.
  - `refetches when the same path comes back after null` (DEC-33): tras cargar A con `[1]`, ruta `null` y otra vez A -> segunda llamada a fetch con A y, mientras esta pendiente, `{ data: [1], loading: false, error: false }`; al resolver `[3]`, `data` es `[3]`. Variante con error (DEC-41): A falla, `null`, A otra vez -> mientras esta pendiente, `{ data: null, loading: false, error: true }`.

- [ ] **Paso 2:** `npm --prefix frontend test -- src/lib/api.test.ts src/lib/use-api-resource.test.tsx` -> FAIL.
- [ ] **Paso 3:** implementar. `buildQuery` con `URLSearchParams` sobre `Object.entries`, saltando `undefined` y `''`. El hook guarda `{ path, data, error }` del ultimo resultado asentado; el efecto (dependencia `[path]`) pide si `path !== null` y marca la peticion como obsoleta en el cleanup; `setState` solo en el `then`. Deriva `loading = path !== null && resultado.path !== path`; `data` y `error` son siempre los del ultimo resultado (DEC-33). Con esa derivacion, volver a la ruta del ultimo resultado da `loading` false sin codigo extra.
- [ ] **Paso 4:** mismo comando -> PASS. `npm --prefix frontend run lint` -> sin errores (comprueba la regla del efecto).
- [ ] **Paso 5:** commit `feat(f1): add shared API layer and useApiResource hook`.

### Tarea 3: `DateRangePicker`

**Archivos:**
- Crear: `frontend/src/components/dashboard/date-range-picker.tsx`, `frontend/src/test-utils.ts` (helper `changeInput(input: HTMLInputElement, value: string): void`: setter nativo de `value` + evento `input` con `bubbles`, para inputs controlados de React)
- Test: `frontend/src/components/dashboard/date-range-picker.test.tsx` (jsdom)

**Interfaces:**
- Consume: `getDateRangeIssue`, `DateBounds` (Tarea 1).
- Produce: `DateRangePicker({ value, onChange, bounds, boundsLoading }: DateRangePickerProps)` con las props de la spec. Raiz: `div role="group" aria-label="Date range"` (DEC-19).

- [ ] **Paso 1: tests que fallan** (`bounds` como en la Tarea 1; inputs buscados por su `label`):
  - `renders two empty labelled date inputs`: etiquetas `Start date` y `End date`, `type="date"`, `value === ""`.
  - `shows the available range and sets min and max`: texto `Available data: 2025-11-01 to 2026-10-28`; ambos inputs con `min="2025-11-01"` y `max="2026-10-28"`.
  - `shows a skeleton while bounds load`: `boundsLoading` -> un `[data-slot="skeleton"]`, sin `min`/`max`, inputs no `disabled`.
  - `hides the reference line without bounds`: `bounds={null}` sin carga -> no aparece `Available data`, ni `role="alert"`.
  - `reports a new start date`: `changeInput(start, "2026-01-01")` con `value={{ end_date: "2026-01-31" }}` -> `onChange({ start_date: "2026-01-01", end_date: "2026-01-31" })`.
  - `omits the key of an emptied input`: `value={{ start_date: "2026-01-01", end_date: "2026-01-31" }}`, `changeInput(start, "")` -> `onChange({ end_date: "2026-01-31" })` (`"start_date" in arg` es false).
  - `toggles Clear dates`: sin fechas no hay boton `Clear dates`; con una fecha si; al pulsarlo `onChange({})` y `document.activeElement` es el input `Start date` (AC-F1-16).
  - `warns about an inverted range`: un solo `role="alert"` con `Start date must be on or before end date.`; ambos inputs `aria-invalid="true"`.
  - `warns about an out-of-bounds date`: `start_date: "2025-10-31"` -> alerta `Dates must be between 2025-11-01 and 2026-10-28.`; `aria-invalid` solo en `Start date`.
  - `shows only the first problem`: `start_date: "2030-01-01", end_date: "2026-01-01"` -> un unico `role="alert"`, el de fuera de rango; `aria-invalid="true"` solo en `Start date` y `End date` sin `aria-invalid` (DEC-37).
  - `stays silent while a year is typed`: `start_date: "0019-02-02"` -> ningun `role="alert"` ni `aria-invalid`.
- [ ] **Paso 2:** `npm --prefix frontend test -- src/components/dashboard/date-range-picker.test.tsx` -> FAIL.
- [ ] **Paso 3:** implementar con las clases de la [presentacion de F1](../../frontend/specs/components.md#presentacion-v14-dec-27-dec-28): fila con inputs y boton; debajo `Available data` y el aviso. Inputs `h-11 text-base min-w-44 bg-card scheme-dark`, borde rojo con `aria-invalid:border-red-500`; etiquetas `text-sm text-foreground`; boton `h-11 border-primary/60 bg-primary/15 text-foreground` con icono `X`; aviso `border-red-500/40 bg-red-500/10 text-red-300` con `AlertCircle`; anillo de foco `focus-visible:ring-ring`; `Skeleton` de `Available data` `h-4 w-64` (DEC-40). El foco tras `Clear dates` se mueve con un `ref` al input de inicio.
- [ ] **Paso 4:** mismo comando -> PASS; lint sin errores.
- [ ] **Paso 5:** commit `feat(f1): add DateRangePicker component`.

### Tarea 4: integracion en `App`

**Archivos:**
- Modificar: `frontend/src/App.tsx`, `frontend/src/App.test.tsx`

**Interfaces:**
- Consume: Tareas 1-3. `API_BASE_URL` sale de `App.tsx` y pasa a `@/lib/api`.
- Produce para F2/F3: en `App`, `filter: DateRangeFilter`, `bounds: DateBounds | null` y `dateIssue = getDateRangeIssue(filter, bounds)`.

Comportamiento: `facets = useApiResource<FacetsResponse>("/api/metrics/facets")`; ruta de movimientos `dateIssue === null ? "/api/metrics" + buildQuery({ start_date, end_date }) : null`. KPI: `metrics = data && data.length > 0 ? computeKPIs(data) : null`; graficos con `computeMonthlyData(data ?? [])`. Bajo el picker, `No movements found for the selected range.` con `role="status"` cuando `data` es `[]` y no carga (DEC-33), como texto `text-sm text-muted-foreground` sin caja ni icono (DEC-40). Banner de error actual con `error`. `DashboardHeader period={formatPeriodLabel(filter) ?? "2024 - Full Year"}`. El picker va justo debajo del encabezado; las pestanas y el panel de vista llegan en F3.

- [ ] **Paso 1: tests que fallan.** Helper de test `routeFetch(routes: Record<string, () => Promise<Response>>)` que responde segun la URL y guarda las URLs pedidas en `requested`. Fixture de movimientos (regla FIN): ingreso 100 y gasto 25 -> KPI `$100`, `$25`, `$75`, `75.0%`. Tests en `describe("F1 date range filter")`:
  - `requests facets and unfiltered movements on mount`: `requested` contiene exactamente `/api/metrics/facets` y `/api/metrics`; aparece `Available data: 2025-11-01 to 2026-10-28`; KPI con los cuatro valores.
  - `refetches with only the informed dates`: start `2026-01-01` -> `/api/metrics?start_date=2026-01-01` y cabecera `From 2026-01-01`; luego end `2026-01-31` -> `/api/metrics?start_date=2026-01-01&end_date=2026-01-31` y cabecera `2026-01-01 — 2026-01-31`.
  - `accepts a single-day range` (AC-F1-07): misma fecha en ambos -> se pide.
  - `keeps the last data on an inverted range`: tras cargar, start `2026-02-01` y end `2026-01-01` -> ninguna URL nueva, aviso de rango invertido, KPI siguen en `$100`, cabecera `2026-02-01 — 2026-01-01` (AC-F1-15).
  - `does not request while the year is being typed`: start `0001-02-02`, `0019-02-02`, `0190-02-02` -> ninguna URL nueva ni alerta; `1900-02-02` -> aviso de fuera de rango y ninguna URL nueva (AC-F1-17, AC-F1-18).
  - `blocks a date that becomes out of bounds when facets arrives`: facets pendiente, start `2030-01-01` -> se pide `?start_date=2030-01-01`; resolver facets -> aparece el aviso y no hay URL nueva al cambiar end.
  - `shows the empty range state`: movimientos `[]` -> cuatro `—`, `No movements found for the selected range.` con `role="status"`, los dos graficos con `No data available to display`.
  - `hides the empty notice while reloading` (DEC-33): con movimientos `[]` ya mostrados, cambiar start con la respuesta pendiente -> no aparece `No movements found for the selected range.`; al resolver `[]`, vuelve a aparecer.
  - `works without facets`: facets 500 -> sin `Available data`, sin `role="alert"`, KPI con valores, inputs sin `min`.
  - `clears both dates`: con fechas, pulsar `Clear dates` -> ultima URL `/api/metrics`, cabecera `2024 - Full Year`.
  - `omits an emptied date` (AC-F1-08): start y luego vaciar -> ultima URL `/api/metrics`.
  - Error de movimientos (AC-F1-13): cubierto por el test existente de error, adaptado (Q-10).
- [ ] **Paso 2:** `npm --prefix frontend test -- src/App.test.tsx` -> FAIL en los nuevos.
- [ ] **Paso 3:** implementar en `App.tsx` y adaptar los dos tests existentes a las peticiones nuevas (`fetch` responde 500 a todo: siguen dos secciones `aria-busy` en F1). Segun Q-10, si cambia algun valor esperado se actualiza en esta tarea con la misma comparacion exacta, sin relajarla.
- [ ] **Paso 4:** mismo comando -> PASS; despues `npm --prefix frontend test` completo -> PASS.
- [ ] **Paso 5:** commit `feat(f1): wire the date range filter into the dashboard`.

### Tarea 5: verificacion de F1 y parada para la prueba visual

Sigue [verify-frontend-change](../../.skills/verify-frontend-change/SKILL.md).

- [ ] `git diff --stat main -- frontend/` muestra los archivos de F1.
- [ ] `npm --prefix frontend run lint` -> sin errores; `npm --prefix frontend test` -> todo PASS; `npm --prefix frontend run build` -> sin avisos nuevos frente a la base (chunk principal ~188 kB, sin aviso de 500 kB).
- [ ] Mutaciones (Q-11), cada una con su test que debe fallar y restauracion con `git checkout -- <archivo>`: (1) quitar el filtro de `''` en `buildQuery`; (2) no descartar respuestas obsoletas en el hook; (3) ignorar `outOfBounds` en `getDateRangeIssue`; (4) quitar `role="alert"` del aviso; (5) devolver `computeKPIs([])` en vez de `null` con `[]`; (6) mostrar `No movements found...` tambien mientras carga (DEC-33). En el `Registro de ejecucion` se anota cada mutacion con el cambio, el test que fallo y la restauracion.
- [ ] App en Docker sirviendo el codigo nuevo: `curl -s http://localhost:5173/src/App.tsx | grep -c DateRangePicker` > 0; si no, `docker compose restart frontend` y repetir.
- [ ] Registrar comandos y resultados en el [Registro de ejecucion](#registro-de-ejecucion) (Q-12) y **parar** para la prueba visual en http://localhost:5173. Lista para el mantenedor: tamanos y colores de la [presentacion de F1](../../frontend/specs/components.md#presentacion-v14-dec-27-dec-28) (AC-F1-20), incluidos el `Skeleton` `h-4 w-64` de `Available data` y el aviso `No movements found...` sin caja; foco con teclado; teclear un ano a mano y comprobar en `docker compose logs backend` que no hay peticiones `0001`/`0019`/`0190` (las del montaje salen dobles por `StrictMode`).

## Registro de ejecucion

Se rellena en la etapa 2 (Q-12): por tarea, cada comando con su resultado (tests, lint y build, con el tamano del chunk principal), cada mutacion con el cambio, el test que fallo y la restauracion (Q-11), la comprobacion de que Vite sirve el codigo nuevo y los limites encontrados.

Reglas leidas antes de editar: WF, FIN, API, CAL y FE. DX no aplica (sin cambios de configuracion). Base: 8 tests en 2 archivos, lint limpio.

### Tarea 1 (2026-11-19)

- Tipos copiados con `sed` del import `'../src/lib/financial-types'` a `'./financial-types'`; ningun otro cambio frente a `specs/`.
- Rojo: `npm --prefix frontend test -- src/lib/financial-utils.test.ts` -> 3 fallidos, 6 pasados. Causa: `TypeError: isValidDateRange is not a function` (y lo mismo para `formatPeriodLabel` y `getDateRangeIssue`), es decir, funciones aun no exportadas.
- Verde: mismo comando -> 9 pasados. `npm --prefix frontend run lint` sin errores; `npx tsc -b` sin errores.
- CAL: las funciones comparan cadenas `YYYY-MM-DD` y no crean `Date`, asi que el huso horario no interviene; no se repite con otro `TZ`.

### Tarea 2 (2026-11-19)

- Rojo: `npm --prefix frontend test -- src/lib/api.test.ts src/lib/use-api-resource.test.tsx` -> los 2 archivos fallan: `Cannot find module './api'` y `Failed to resolve import "./use-api-resource"`, porque los modulos aun no existen.
- Primera ejecucion tras implementar: 11 pasados y 2 fallidos (`refetches when the same path comes back after null` y `keeps showing the error while the same path is refetched`), los dos con `expected [...] to have a length of 2 but got 1`.
  - **Causa demostrada antes de corregir:** anadi temporalmente un `console.log` del `path` en cada render de `Probe` y ejecute solo el primero de esos tests. Salida: `RENDER path=A` tres veces y ninguna `RENDER path=null`. Los dos `root.render` seguidos (`null` y despues `A`) caen en el mismo tick y React los agrupa, asi que `null` nunca llega a confirmarse y el efecto no ve cambiar la ruta.
  - El fallo estaba en el montaje del test, no en el hook. En la app, el paso a `null` y la vuelta a la misma ruta salen de acciones distintas del usuario.
  - Log quitado (el archivo de test quedo sin `RENDER`). Correccion: esperar con `await settle()` (20 ms) entre `render(null)` y `render("A")`. Las aserciones no cambian.
  - Ese fallo es tambien la prueba de que esos dos tests detectan un hook que no vuelve a pedir.
- Verde: mismo comando -> 13 pasados. Lint y `npx tsc -b` sin errores. Lint pasa con `react-hooks/set-state-in-effect`: el hook solo llama a `setState` dentro de `then`/`catch`.

### Tarea 3 (2026-11-19)

- Rojo: `npm --prefix frontend test -- src/components/dashboard/date-range-picker.test.tsx` -> `Failed to resolve import "./date-range-picker"`, porque el componente aun no existe.
- Primera ejecucion tras implementar: 10 pasados y 1 fallido. `toggles Clear dates and moves the focus to Start date` falla con `expected undefined to be defined` al buscar el boton.
  - **Causa demostrada antes de corregir:** el test renderiza dos veces. En la segunda, `renderPicker` esperaba a que existiera el `role="group"`, pero ese grupo ya estaba del primer render, asi que volvia antes de que React confirmara las props nuevas.
  - Prueba temporal con aserciones en lugar de la llamada original: `expect(clearButton()).toBeUndefined()` justo despues de `renderPicker` y `expect(clearButton()).toBeDefined()` tras 20 ms. Las dos pasaron (`1 passed`). El archivo se restauro desde una copia en el scratchpad.
  - Correccion en el test: `renderPicker` espera con `settle()` en lugar de buscar el grupo. `settle` pasa a `src/test-utils.ts`, compartido con el test del hook. Las aserciones no cambian.
- Verde: `npm --prefix frontend test` -> 5 archivos, 35 pasados. Lint y `npx tsc -b` sin errores.

### Tarea 4 (2026-11-19)

- Rojo: `npm --prefix frontend test -- src/App.test.tsx` -> 11 fallidos (los nuevos) y 2 pasados (los existentes). Motivos agrupados, todos por funcionalidad ausente:
  - 7 veces `Start date input not found`: no hay picker.
  - 1 vez `expected [ '/api/metrics' ] to deeply equal [ '/api/metrics', …(1) ]`: no se pide `facets`.
  - 1 vez falta `Available data`.
  - 2 veces `expected undefined to be defined`: no hay aviso `No movements found...`.
- Verde: mismo comando -> 13 pasados. Suite completa `npm --prefix frontend test` -> 5 archivos, 46 pasados. Lint y `npx tsc -b` sin errores.
- Q-10: los dos tests existentes pasan sin cambiar ninguna expectativa. El picker es un `div` (no `section`) y no tiene `h2`; con `fetch` a 500, `facets` falla sin mostrar ningun `role="alert"`, asi que el primer `role="alert"` sigue siendo el banner.
- `API_BASE_URL` sale de `App.tsx` y queda solo en `@/lib/api`. El texto del banner de error no cambia.
- Comportamiento que cambia, y lo pide la spec (AC-F1-10): con una respuesta `[]` los KPI muestran `—`. Antes mostraban `$0`, porque se calculaba `computeKPIs([])`.
