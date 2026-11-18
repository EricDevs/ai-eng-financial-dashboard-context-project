# F1 - Filtro de rango de fechas: plan de implementacion

**Version:** 7.0 | **Fecha:** 2026-11-18 | **Estado:** implementado (iteracion 1) y aprobado en las dos rondas de prueba visual; el codigo se integra en la fase 6 | **Spec:** v1.4

**Como ejecutar:** tarea por tarea y en orden; marcar cada paso (`- [ ]`) al completarlo. No empezar una tarea sin que la anterior tenga sus tests en verde. Los pasos marcados `[x]` ya se ejecutaron; su evidencia esta en `docs/validations/08-features-checks.md` (se integra con el codigo de F1 en la fase 6).

**Sobre los ejemplos de codigo:** son el codigo implementado en la rama, con el estilo de cada archivo (comillas simples y sin punto y coma en `components/dashboard`; comillas dobles y punto y coma en `App.tsx` y `src/lib`).

**Objetivo:** un unico filtro de fechas (inicio/fin, opcionales) bajo el encabezado que filtra KPI y graficos, con el rango disponible de `facets` como referencia, que solo pide datos cuando el filtro es completo, esta dentro del rango y no esta invertido.

**Arquitectura:** utilidades puras en `src/lib` (validacion con `getDateRangeIssue`, etiqueta de periodo, query string), la capa de datos compartida (`api.ts` + `useApiResource`, DEC-05), un componente controlado `DateRangePicker` con sus avisos y la orquestacion en `App`. Este plan crea la base que usan F2 y F3.

**Stack:** React 19.2, TypeScript ~6.0, Vitest 4 + jsdom (patron `createRoot` de `App.test.tsx`, sin librerias de test nuevas), Tailwind 4, lucide-react.

**Spec:** [components.md v1.4](../../frontend/specs/components.md): F1 (incluida su seccion de presentacion), convenciones comunes, utilidades compartidas con la regla unica de peticion, capa de datos, disposicion de la pagina y DEC-01 a DEC-05, DEC-07, DEC-19, DEC-22 y DEC-24 a DEC-28. Contexto en el [README](../../frontend/specs/README.md) y [verification.md](../../frontend/specs/verification.md).

**Reglas del proyecto:** WF (todas), FE (TSX, formatters, tests), API (consumo de `/api/metrics` y `/facets`), CAL (fechas y etiqueta de periodo), FIN (KPI recalculados en tests).

**Rama:** `feature/frontend-specs-v2-fase6-f1` desde `feature/frontend-specs-v2` (ver [ROADMAP-Project-3](../entregables/ROADMAP-Project-3.md#9-ampliacion-v2-planes-implementacion-y-prueba-de-traspaso)). Los commits requieren autorizacion explicita del usuario (WF 8).

## Restricciones globales

- Componentes en `frontend/src/components/dashboard/`, kebab-case, export PascalCase, imports con `@`. Sin fetch en componentes.
- Textos de UI en ingles. Importes con `formatCurrency`, porcentajes con `formatPercent`.
- Regla unica de peticion: solo se pide si `getDateRangeIssue(filter, bounds) === null` (DEC-26). Nunca un parametro `undefined` o `''` (INV-1), nunca `start_date > end_date` (INV-2), nunca, si `facets` cargo, una fecha fuera de su rango ni con el ano con cero inicial (INV-7). `/api/metrics` solo con fechas.
- Orden de query fijo (DEC-07). Tipos copiados, no movidos (DEC-01).
- Unica fecha fija permitida: `2024 - Full Year` en el encabezado sin filtro (DEC-22).
- Presentacion segun la seccion de la spec (DEC-27, DEC-28); el rojo del aviso es `red-300` sobre `red-500/10`, no `--destructive`.
- Sin dependencias nuevas, sin `any` explicito ni casts, sin backend, sin cambiar la firma de `DashboardHeader`.
- Sin `setState` sincrono en el cuerpo de un `useEffect` (DEC-05).

## Decisiones propias del plan (implementacion, no producto)

- Helpers de test en `src/test-helpers.ts` (Tarea 3): `jsonResponse`, `deferred`, `setInputValue`, `inputByLabel`, `buttonByText` y `mountRoot`.
- En `App.test.tsx`, un `stubApi` comun enruta el `fetch` simulado por URL; una URL desconocida responde `[]`, para que los tests sigan validos cuando F2 y F3 anadan endpoints.
- Fixtures (FIN): sin filtro, `income` 1000 y `outcome` 250 (KPI `$1,000`, `$250`, `$750`, `75.0%`); con filtro, `income` 100 y `outcome` 25 (KPI `$100`, `$25`, `$75`, `75.0%`). `facets` de prueba: `2025-11-01` a `2026-10-28`.
- `LAZY_CHARTS = { timeout: 5000 }` en las esperas que dependen de los graficos diferidos (ver hallazgos).
- Evidencia en `docs/validations/08-features-checks.md`.

## Hallazgos de la ejecucion

| Hallazgo | Tratamiento |
| --- | --- |
| Antes de tocar codigo, `announces a load error…` ya fallaba: espera los graficos diferidos con el limite de 1000 ms de `vi.waitFor` y tardan ~1100 ms en esta maquina | Comprobado con una copia temporal (limite 10 s: 2 de 2 pasan). `LAZY_CHARTS` solo en esas esperas; aserciones sin cambios |
| Prueba visual, ronda 1: una peticion por cada digito al escribir el ano a mano (`0001`, `0019`, `0190`, `1900`, en los logs del backend) | DEC-25 (Tarea 1 y 5) |
| Prueba visual, ronda 1: fecha muy anterior a los datos sin explicacion; mensaje en blanco; filtro pequeno; `Available data` a la derecha; `Clear dates` poco visible | DEC-26, DEC-27, DEC-28 (Tareas 1, 4 y 5) |
| El test de rango vacio usaba `2030-01-01`, que con DEC-26 ya no lanza peticion | Usa `2026-10-28`, dentro de `bounds` |
| Quitar la deteccion de ano incompleto no rompe el test de `App` (con `bounds` conocido esos anos ya estan fuera de rango) | La protegen el test de utilidades y `shows no message while a year is being typed` |
| Vite en Docker siguio sirviendo el `date-range-picker.tsx` anterior | `docker compose restart frontend` antes de cada prueba visual |

## Foco de revision

1. **Ano escrito a mano:** ninguna peticion ni aviso con los valores intermedios; aviso al completar un ano fuera de rango. Tests en Tareas 1, 4 y 5.
2. **Error y recuperacion:** si `/api/metrics` falla y el siguiente filtro responde bien, desaparece el banner y vuelven los KPI. Test en Tarea 5.
3. **Filtro no pedible y vuelta al mismo rango valido:** no debe quedar `Skeleton` colgado. Tests en Tareas 3 y 5.
4. **Cambios rapidos de fecha:** respuestas en orden inverso; solo cuenta la ultima (AC-F1-14). Tests en Tareas 3 y 5.
5. **Facets falla:** sin referencia, sin banner y sin comprobar el rango; el dashboard funciona. Tests en Tareas 1 y 5.

---

### Tarea 1: Tipos y utilidades de fecha

**Archivos:**
- Crear: `frontend/src/lib/api-types.ts`, `frontend/src/lib/param-types.ts` (copia de `specs/`; DEC-01)
- Modificar: `frontend/src/lib/financial-utils.ts`
- Test: `frontend/src/lib/financial-utils.test.ts`

**Interfaces:**
- Produce: `isValidDateRange(filter): boolean`, `formatPeriodLabel(filter): string | null`, `getDateRangeIssue(filter, bounds): DateRangeIssue | null` y los tipos `DateBounds`, `DateRangeIssue` (firmas de la spec), mas los tipos de API y de parametros.

- [x] **Paso 1: tests que fallan.** `describe("date range")` y `describe("getDateRangeIssue")`:

```ts
it("accepts empty, single-ended, equal and ordered ranges", () => {
  expect(isValidDateRange({})).toBe(true);
  expect(isValidDateRange({ start_date: "2026-01-01" })).toBe(true);
  expect(isValidDateRange({ end_date: "2026-01-31" })).toBe(true);
  expect(isValidDateRange({ start_date: "2026-01-15", end_date: "2026-01-15" })).toBe(true);
  expect(isValidDateRange({ start_date: "2025-12-31", end_date: "2026-01-01" })).toBe(true);
});
it("labels the period with raw dates", () => {                 // DEC-02
  expect(formatPeriodLabel({})).toBeNull();
  expect(formatPeriodLabel({ start_date: "2026-01-01", end_date: "2026-01-31" })).toBe("2026-01-01 — 2026-01-31");
  expect(formatPeriodLabel({ start_date: "2026-01-01" })).toBe("From 2026-01-01");
  expect(formatPeriodLabel({ end_date: "2026-01-31" })).toBe("Until 2026-01-31");
});

describe("getDateRangeIssue", () => {
  const bounds = { min_date: "2025-11-01", max_date: "2026-10-28" };

  it("treats a zero-padded year as a date still being typed", () => {   // DEC-25
    for (const start_date of ["0001-02-02", "0019-02-02", "0190-02-02"]) {
      expect(getDateRangeIssue({ start_date }, bounds)).toBe("incomplete");
      expect(getDateRangeIssue({ start_date }, null)).toBe("incomplete");
    }
  });
  it("rejects complete dates outside the bounds", () => {              // DEC-26
    expect(getDateRangeIssue({ start_date: "1900-02-02" }, bounds)).toBe("outOfBounds");
    expect(getDateRangeIssue({ end_date: "2026-10-29" }, bounds)).toBe("outOfBounds");
  });
  it("reports out of bounds before an inverted range", () => {
    expect(getDateRangeIssue({ start_date: "2027-01-01", end_date: "2026-01-01" }, bounds)).toBe("outOfBounds");
  });
});
```

  Resto: `rejects a start date after the end date`, `labels an inverted range as typed` (DEC-03), `accepts ranges inside the bounds, including the limits`, `does not check bounds when they are unknown`, `reports an inverted range inside the bounds`.
- [x] **Paso 2:** `npm --prefix frontend test -- src/lib/financial-utils.test.ts` -> FAIL (`... is not a function`).
- [x] **Paso 3: implementar.** En `api-types.ts` y `param-types.ts` solo cambia el import (`'../src/lib/financial-types'` -> `'./financial-types'`). En `financial-utils.ts` (comparacion de cadenas, sin `Date`, regla CAL):

```ts
import type { DateRangeFilter } from "./param-types";

/** True when a bound is missing or start_date <= end_date (YYYY-MM-DD compares chronologically). */
export function isValidDateRange(filter: DateRangeFilter): boolean {
  const { start_date, end_date } = filter;
  return !start_date || !end_date || start_date <= end_date;
}

export type DateBounds = { min_date: string; max_date: string };
export type DateRangeIssue = "incomplete" | "outOfBounds" | "inverted";

/**
 * Why the filter cannot be requested, or null when it can. A zero-padded year
 * (0001, 0019, 0190) is a date still being typed. Bounds are checked only when known.
 */
export function getDateRangeIssue(
  filter: DateRangeFilter,
  bounds: DateBounds | null,
): DateRangeIssue | null {
  const dates = [filter.start_date, filter.end_date].filter((date) => date !== undefined);
  if (dates.some((date) => date.startsWith("0"))) return "incomplete";
  if (bounds && dates.some((date) => date < bounds.min_date || date > bounds.max_date)) {
    return "outOfBounds";
  }
  return isValidDateRange(filter) ? null : "inverted";
}

/** Header label with raw YYYY-MM-DD dates; null without dates. Does not validate the range. */
export function formatPeriodLabel(filter: DateRangeFilter): string | null {
  const { start_date, end_date } = filter;
  if (start_date && end_date) return `${start_date} — ${end_date}`;
  if (start_date) return `From ${start_date}`;
  if (end_date) return `Until ${end_date}`;
  return null;
}
```

- [x] **Paso 4:** mismo comando -> PASS (16 tests, incluidos los 6 previos).
- [x] **Paso 5:** `npm --prefix frontend run build` -> exit 0, sin avisos nuevos.
- [ ] **Paso 6: commit** `feat(f1): add date range types and helpers` (pendiente de autorizacion).

### Tarea 2: Cliente API (`api.ts`)

**Archivos:**
- Crear: `frontend/src/lib/api.ts`
- Test: `frontend/src/lib/api.test.ts`

**Interfaces:**
- Produce: `API_BASE_URL`, `buildQuery(params: AlertsParams | TopCategoriesParams): string`, `getJson<T>(path: string): Promise<T>` (DEC-05).

- [x] **Paso 1: tests que fallan**

```ts
it("omits undefined and empty values", () => {
  expect(buildQuery({})).toBe("");
  expect(buildQuery({ start_date: undefined })).toBe("");
  expect(buildQuery({ start_date: "", end_date: "2026-01-31" })).toBe("?end_date=2026-01-31");
});
it("keeps key order and serializes numbers", () => {   // DEC-07
  expect(buildQuery({ threshold: 0.3, start_date: "2026-01-01" })).toBe("?threshold=0.3&start_date=2026-01-01");
  expect(buildQuery({ operation_type: "income", limit: 5, business_type: "B2B" }))
    .toBe("?operation_type=income&limit=5&business_type=B2B");
});
it("rejects on a non-2xx response", async () => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(null, { status: 422 }))));
  await expect(getJson("/api/x")).rejects.toThrow("422");
});
```

  Resto: `returns the parsed body` (resultado `{ ok: 1 }`; `fetch` llamado con `"/api/x"`).
- [x] **Paso 2:** `npm --prefix frontend test -- src/lib/api.test.ts` -> FAIL (`Cannot find module './api'`).
- [x] **Paso 3: implementar** `frontend/src/lib/api.ts`:

```ts
import type { AlertsParams, TopCategoriesParams } from "./param-types";

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";

/** Query string in key order; skips undefined and empty values (an empty value returns 422). */
export function buildQuery(params: AlertsParams | TopCategoriesParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      query.append(key, String(value));
    }
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

/** GET API_BASE_URL + path; throws on a non-2xx response. */
export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${path}`);
  }
  return response.json();
}
```

- [x] **Paso 4:** mismo comando -> PASS (4 tests).
- [ ] **Paso 5: commit** `feat(f1): add api query builder and json fetch` (pendiente de autorizacion).

### Tarea 3: Hook `useApiResource` y helpers de test

**Archivos:**
- Crear: `frontend/src/lib/use-api-resource.ts`, `frontend/src/test-helpers.ts`
- Test: `frontend/src/lib/use-api-resource.test.tsx` (`// @vitest-environment jsdom`)

**Interfaces:**
- Produce: `useApiResource<T>(path: string | null): ApiResource<T>` (DEC-05) y los helpers de test.

- [x] **Paso 1: helpers y tests que fallan.** `test-helpers.ts`:

```ts
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Promise resolved by hand, to control the order of responses. */
export function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** Sets an input value so React's onChange fires (native setter + input event). */
export function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Throws when missing, so vi.waitFor retries until the input renders. */
export function inputByLabel(container: HTMLElement, text: string): HTMLInputElement {
  const label = [...container.querySelectorAll("label")].find((l) => l.textContent === text);
  const input = label ? document.getElementById(label.htmlFor) : null;
  if (!(input instanceof HTMLInputElement)) throw new Error(`No input labelled "${text}"`);
  return input;
}

/** Throws when missing, so vi.waitFor retries until the button renders. */
export function buttonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const button = [...container.querySelectorAll("button")].find((b) => b.textContent?.trim() === text);
  if (!button) throw new Error(`No button "${text}"`);
  return button;
}
```

  Mas `mountRoot()` (contenedor en `document.body`, `createRoot` y `cleanup`). Tests con un `Probe({ path })` que pinta `JSON.stringify(useApiResource<string>(path))`:
  - `loads data and clears loading`; `sets error and drops data on a failed request`; `keeps the last data and does not fetch when path is null`; `does not stay loading when returning to the last loaded path`.
  - `shows only the response for the latest path`: `/a` -> `/b` con `deferred`; se resuelve `/b`, despues `/a`, y `data` sigue en `"b"`.
- [x] **Paso 2:** `npm --prefix frontend test -- src/lib/use-api-resource.test.tsx` -> FAIL (import no resuelto).
- [x] **Paso 3: implementar** `use-api-resource.ts` (`setState` solo en `.then` / `.catch`; `ignore` descarta respuestas viejas):

```ts
export function useApiResource<T>(path: string | null): ApiResource<T> {
  const [settled, setSettled] = useState<Settled<T>>({ path: null, data: null, error: false });

  useEffect(() => {
    if (path === null) return;
    let ignore = false;
    getJson<T>(path)
      .then((data) => {
        if (!ignore) setSettled({ path, data, error: false });
      })
      .catch(() => {
        if (!ignore) setSettled({ path, data: null, error: true });
      });
    return () => {
      ignore = true;
    };
  }, [path]);

  const loading = path !== null && path !== settled.path;
  return { data: settled.data, loading, error: !loading && settled.error };
}
```

- [x] **Paso 4:** mismo comando -> PASS (5 tests); `npm --prefix frontend run lint` -> sin errores.
- [ ] **Paso 5: commit** `feat(f1): add useApiResource hook and test helpers` (pendiente de autorizacion).

### Tarea 4: Componente `DateRangePicker`

**Archivos:**
- Crear: `frontend/src/components/dashboard/date-range-picker.tsx`
- Test: `frontend/src/components/dashboard/date-range-picker.test.tsx` (jsdom)

**Interfaces:**
- Consume: `getDateRangeIssue` (Tarea 1).
- Produce: `DateRangePicker(props: DateRangePickerProps)` con las props de la spec (sin cambios en v1.4). Controlado.

Textos exactos (spec): `Start date`, `End date` (DEC-04); `Available data: {min_date} to {max_date}` bajo los inputs (DEC-27); `Clear dates` (foco a `Start date`, DEC-24); avisos `Dates must be between {min_date} and {max_date}.` (DEC-26) y `Start date must be on or before end date.`, uno solo a la vez y con `role="alert"` (DEC-28). Ningun aviso con el ano a medio escribir (DEC-25). Contenedor `div role="group" aria-label="Date range"` (DEC-19). Estilos de la seccion de presentacion de la spec.

- [x] **Paso 1: tests que fallan.** Ejemplos:

```tsx
it('flags a date outside the available range', async () => {
  view.root.render(<DateRangePicker value={{ start_date: '1900-02-02' }} onChange={vi.fn()} bounds={BOUNDS} />)
  await vi.waitFor(() => {
    expect(view.container.querySelector('[role="alert"]')?.textContent).toBe(
      'Dates must be between 2025-11-01 and 2026-10-28.',
    )
    expect(startInput().getAttribute('aria-invalid')).toBe('true')
    expect(endInput().hasAttribute('aria-invalid')).toBe(false)
  })
})

it('shows one notice at a time, out of range first', async () => {
  view.root.render(
    <DateRangePicker value={{ start_date: '2027-01-01', end_date: '2026-01-01' }} onChange={vi.fn()} bounds={BOUNDS} />,
  )
  await vi.waitFor(() => {
    const alerts = [...view.container.querySelectorAll('[role="alert"]')].map((alert) => alert.textContent)
    expect(alerts).toEqual(['Dates must be between 2025-11-01 and 2026-10-28.'])
  })
})

it('moves focus to the start date after clearing', async () => {
  const onChange = vi.fn()
  view.root.render(<DateRangePicker value={{ start_date: '2026-01-01' }} onChange={onChange} bounds={null} />)
  const clear = await vi.waitFor(() => buttonByText(view.container, 'Clear dates'))
  clear.click()
  expect(onChange).toHaveBeenCalledWith({})
  expect(document.activeElement).toBe(startInput())
})
```

  Lista completa (14): `renders two empty optional date inputs` (AC-F1-01), `emits the new start date keeping the end date`, `omits the key of an emptied input` (AC-F1-08), `shows the available range and sets min/max` (AC-F1-02), `shows a skeleton while bounds load without blocking inputs` (AC-F1-03), `hides the reference line when bounds failed` (AC-F1-04), `shows Clear dates only with a date and clears both` (AC-F1-11), `moves focus to the start date after clearing` (AC-F1-16), `flags an inverted range` (AC-F1-09), `flags a date outside the available range` (AC-F1-18), `shows one notice at a time, out of range first` (AC-F1-19), `shows no message while a year is being typed` (AC-F1-17), `accepts a single-day range` (AC-F1-07), `is a labelled group, not a section` (DEC-19).
- [x] **Paso 2:** `npm --prefix frontend test -- src/components/dashboard/date-range-picker.test.tsx` -> FAIL.
- [x] **Paso 3: implementar** `date-range-picker.tsx`:

```tsx
import { useId, useRef, type Ref } from 'react'
import { AlertCircle, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { type FacetsResponse } from '@/lib/api-types'
import { getDateRangeIssue } from '@/lib/financial-utils'
import { type DateRangeFilter } from '@/lib/param-types'

// ... DateRangePickerProps (spec) y DateFieldProps { label, value?, onChange, invalid, min?, max?, inputRef? }

function DateField({ label, value, onChange, invalid, min, max, inputRef }: DateFieldProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        type="date"
        value={value ?? ''}
        min={min}
        max={max}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 min-w-44 rounded-md border border-border bg-card px-3 text-base text-foreground [color-scheme:dark] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-red-400"
      />
    </div>
  )
}

function ErrorNotice({ children }: { children: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300"
    >
      <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      <p>{children}</p>
    </div>
  )
}

export function DateRangePicker({ value, onChange, bounds, boundsLoading }: DateRangePickerProps) {
  const startRef = useRef<HTMLInputElement>(null)
  const issue = getDateRangeIssue(value, bounds)
  const hasDate = Boolean(value.start_date || value.end_date)

  function isInvalid(date?: string) {
    if (issue === 'inverted') return true
    return issue === 'outOfBounds' && !!date && !!bounds && (date < bounds.min_date || date > bounds.max_date)
  }

  function update(key: keyof DateRangeFilter, text: string) {
    const next = { ...value }
    if (text) next[key] = text
    else delete next[key]
    onChange(next)
  }

  function clear() {
    onChange({})
    startRef.current?.focus()
  }

  return (
    <div role="group" aria-label="Date range" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-4">
        <DateField label="Start date" value={value.start_date} onChange={(text) => update('start_date', text)}
          invalid={isInvalid(value.start_date)} min={bounds?.min_date} max={bounds?.max_date} inputRef={startRef} />
        <DateField label="End date" value={value.end_date} onChange={(text) => update('end_date', text)}
          invalid={isInvalid(value.end_date)} min={bounds?.min_date} max={bounds?.max_date} />
        {hasDate ? (
          <button
            type="button"
            onClick={clear}
            className="inline-flex h-11 items-center gap-1.5 rounded-md border border-primary/60 bg-primary/15 px-4 text-sm font-medium text-foreground transition-colors hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={16} aria-hidden="true" />
            Clear dates
          </button>
        ) : null}
      </div>
      {boundsLoading ? (
        <Skeleton className="h-4 w-64" />
      ) : bounds ? (
        <p className="text-sm text-muted-foreground">{`Available data: ${bounds.min_date} to ${bounds.max_date}`}</p>
      ) : null}
      {issue === 'outOfBounds' && bounds ? (
        <ErrorNotice>{`Dates must be between ${bounds.min_date} and ${bounds.max_date}.`}</ErrorNotice>
      ) : null}
      {issue === 'inverted' ? <ErrorNotice>Start date must be on or before end date.</ErrorNotice> : null}
    </div>
  )
}
```

- [x] **Paso 4:** mismo comando -> PASS (14 tests).
- [ ] **Paso 5: commit** `feat(f1): add DateRangePicker component` (pendiente de autorizacion).

### Tarea 5: Integracion en `App`

**Archivos:**
- Modificar: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx` (los 2 tests existentes solo cambian en `LAZY_CHARTS`; nuevo `describe("date range filter")`)

**Interfaces:**
- Produce (para F2/F3): estado `filter: DateRangeFilter` (inicial `{}`), `facets`, `bounds` y `movements`; en `App.test.tsx`, `stubApi`, `calledUrls`, `movementCalls`, `kpiValues`, `renderLoaded` y `setDate`.

- [x] **Paso 1: tests que fallan.** Helpers al principio de `App.test.tsx` y ejemplo del caso de la prueba visual:

```tsx
const isMovementsUrl = (url: string) => url === "/api/metrics" || url.startsWith("/api/metrics?");

/** Routes the fake fetch by URL; `route` overrides the defaults when it returns a promise. */
function stubApi(route: (url: string) => Promise<Response> | undefined = () => undefined) {
  const fetchMock = vi.fn((url: string) => {
    const custom = route(url);
    if (custom) return custom;
    if (url === "/api/metrics/facets") return Promise.resolve(jsonResponse(FACETS));
    if (url === "/api/metrics") return Promise.resolve(jsonResponse(ALL_MOVEMENTS));
    if (isMovementsUrl(url)) return Promise.resolve(jsonResponse(FILTERED_MOVEMENTS));
    return Promise.resolve(jsonResponse([]));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

it("does not request while a year is typed nor for a date outside the range", async () => {
  const fetchMock = stubApi();
  await renderLoaded();
  await vi.waitFor(() => expect(container.textContent).toContain("Available data"));

  // Chrome emits these values while the user types 02-02-1900 by hand.
  for (const start of ["0001-02-02", "0019-02-02", "0190-02-02", "1900-02-02"]) {
    await setDate("Start date", start);
  }
  await vi.waitFor(() =>
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "Dates must be between 2025-11-01 and 2026-10-28.",
    ),
  );
  await tick();
  expect(movementCalls(fetchMock)).toEqual(["/api/metrics"]);
  expect(kpiValues()).toEqual(["$1,000", "$250", "$750", "75.0%"]);
});
```

  Lista completa (10):
  - `requests facets and unfiltered movements on load` (AC-F1-02).
  - `refetches with only the informed dates and recalculates KPIs` (AC-F1-05/06/12).
  - `blocks requests and keeps data on an inverted range` (AC-F1-09, AC-F1-15, INV-2, foco 3).
  - `shows dashes, empty charts and a notice for an empty range` (AC-F1-10), con inicio `2026-10-28` y respuesta `[]`.
  - `clears both dates and reloads without filters` (AC-F1-11, DEC-22).
  - `works without the reference line when facets fails` (AC-F1-04, foco 5).
  - `shows dashes and the banner when movements fail, and recovers` (AC-F1-13, foco 2).
  - `renders only the latest response` (AC-F1-14, foco 4).
  - `does not request while a year is typed nor for a date outside the range` (AC-F1-17, AC-F1-18, INV-7, foco 1).
  - `never sends empty or invalid date params` (INV-1, INV-4).
- [x] **Paso 2:** `npm --prefix frontend test -- src/App.test.tsx` -> FAIL (`No input labelled "Start date"`; con el filtro ya hecho, el caso del ano fallo con 4 peticiones de mas).
- [x] **Paso 3: implementar.** Se eliminan `API_BASE_URL`, `fetchFinancialData` y los estados `metrics`, `monthlyData`, `loading` y `error`; `ChartFallback` y los `lazy` de los graficos no cambian:

```tsx
function App() {
  const [filter, setFilter] = useState<DateRangeFilter>({});
  const facets = useApiResource<FacetsResponse>("/api/metrics/facets");
  const bounds = facets.data
    ? { min_date: facets.data.min_date, max_date: facets.data.max_date }
    : null;
  const movements = useApiResource<FinancialMovement[]>(
    getDateRangeIssue(filter, bounds) === null ? `/api/metrics${buildQuery(filter)}` : null,
  );

  const metrics = movements.data?.length ? computeKPIs(movements.data) : null;
  const monthlyData = movements.data ? computeMonthlyData(movements.data) : [];
  const noMovements = !movements.loading && movements.data?.length === 0;

  return (
    // DashboardHeader period={formatPeriodLabel(filter) ?? "2024 - Full Year"}
    // DateRangePicker value={filter} onChange={setFilter} bounds={bounds} boundsLoading={facets.loading}
    // aviso role="status" "No movements found for the selected range." si noMovements
    // banner actual en espanol si movements.error
    // secciones de KPI y graficos con loading={movements.loading} y aria-busy={movements.loading}
  );
}
```

- [x] **Paso 4:** mismo comando -> PASS (12 tests).
- [ ] **Paso 5: commit** `feat(f1): wire date range filter into App` (pendiente de autorizacion).

### Tarea 6: Verificacion final y evidencia

**Archivos:** `docs/validations/08-features-checks.md` (seccion F1), `memory-bank/status.md`, `memory-bank/stack.md`.

Procedimiento del repositorio para verificar cambios del frontend: [.skills/verify-frontend-change/SKILL.md](../../.skills/verify-frontend-change/SKILL.md).

- [x] **Paso 1:** `npm --prefix frontend run lint`, `npm --prefix frontend test`, `npm --prefix frontend run build` -> sin errores ni avisos; 5 archivos y 51 tests; chunk principal ~191 kB (linea base 187.77 kB).
- [x] **Paso 2:** comprobacion de tipos de specs (comando 2 del [README de specs](../../frontend/specs/README.md#verificacion-de-tipos)) -> exit 0.
- [x] **Paso 3: los tests detectan la rotura** (cada rotura sola, restaurando desde copia):

| Rotura | Test que falla |
| --- | --- |
| Sin `role="alert"` en el aviso | `flags an inverted range` |
| Sin `startRef.current?.focus()` | `moves focus to the start date after clearing` |
| `App` pide sin la regla unica | `blocks requests and keeps data on an inverted range` |
| Sin la guarda `ignore` del hook | `shows only the response for the latest path` |
| Sin deteccion de ano incompleto | `treats a zero-padded year…` y `shows no message while a year is being typed` |
| Aviso de invertido calculado aparte | `shows one notice at a time, out of range first` |

- [x] **Paso 4: app en ejecucion, ronda 1** (usuario): hallazgos que dieron DEC-25 a DEC-28 (ver tabla de hallazgos).
- [x] **Paso 5: app en ejecucion, ronda 2** (usuario; sin hallazgos), tras `docker compose restart frontend` y confirmar con `curl -s http://localhost:5173/src/components/dashboard/date-range-picker.tsx | grep -c ErrorNotice` que Vite sirve el codigo nuevo. Comprobar: el ano escrito a mano sin peticiones (pestana Red), fecha fuera de rango, inicio fuera de rango y posterior al fin (un solo aviso), rango invertido, aspecto del aviso, del boton y del tamano del filtro (AC-F1-20).
- [ ] **Paso 6:** registrar la ronda 2 en `08-features-checks.md`; actualizar memory-bank; `git diff --check`.
- [ ] **Paso 7: commit** `docs(f1): record verification evidence` (pendiente de autorizacion).

## Historial del plan

| Version | Fecha | Cambios |
| --- | --- | --- |
| 1.0 | 2026-11-18 | Plan inicial sobre la spec 1.0, con decisiones propias |
| 2.0 | 2026-11-18 | Regenerado sobre la spec 1.1; huecos H-05 y H-08 provisionales |
| 3.0 | 2026-11-18 | Regenerado sobre la spec 1.2: H-05 y H-08 pasan a DEC-19 y DEC-22; sin referencias a herramientas externas al repositorio; nuevo hueco H-10 (foco tras `Clear dates`) |
| 4.0 | 2026-11-18 | Regenerado sobre la spec 1.3: H-10 pasa a DEC-24 y su test cubre AC-F1-16; sin huecos pendientes |
| 5.0 | 2026-11-18 | Ejemplos de codigo de implementacion en cada tarea, tests representativos y helpers de test concretos |
| 6.0 | 2026-11-18 | Tareas 1-6 ejecutadas; tarea 7 anadida con los cambios de la prueba visual |
| 7.0 | 2026-11-18 | Regenerado sobre la spec 1.4: los cambios de la prueba visual se integran en las Tareas 1, 4 y 5 (desaparece la Tarea 7); ejemplos de codigo iguales al implementado; tabla de hallazgos de la ejecucion; tests del caso "un solo aviso" (AC-F1-19); estado de cada paso |
