# F2 - Tabla de alertas de anomalias: plan de implementacion

**Version:** 4.0 | **Fecha:** 2026-11-18 | **Estado:** pendiente de revision | **Spec:** v1.3

> **Pendiente antes de ejecutar:** adaptar a la spec v1.4. Donde el plan usa `isValidDateRange(filter)` para decidir la peticion de alertas debe usar la regla unica `getDateRangeIssue(filter, bounds) === null` (DEC-26), ya implementada en F1.

**Como ejecutar:** tarea por tarea y en orden; marcar cada paso (`- [ ]`) al completarlo. No empezar una tarea sin que la anterior tenga sus tests en verde.

**Sobre los ejemplos de codigo:** muestran la implementacion propuesta para cada tarea, con el estilo del archivo que se toca. No se han ejecutado: lo que valida cada tarea son sus tests. Las clases de Tailwind son orientativas.

**Objetivo:** tarjeta bajo los graficos del dashboard con los periodos cuyo gasto supera un umbral configurable, consumiendo `GET /api/metrics/alerts` con el filtro de fechas compartido.

**Arquitectura:** utilidad pura `parseThreshold`, dos componentes de presentacion (`ThresholdInput` dentro de `AlertsTable`) y estado en `App` (`thresholdText`, `appliedThreshold`) con un segundo `useApiResource`. El error de esta peticion se queda en la tarjeta.

**Stack:** React 19.2, TypeScript ~6.0, Vitest 4 + jsdom, Tailwind 4.

**Spec:** [components.md v1.3](../../frontend/specs/components.md): F2, convenciones comunes (precedencia de estados y roles ARIA), disposicion de la pagina y DEC-06 a DEC-09, DEC-16, DEC-18 y DEC-19. Evidencia de la API en [verification.md](../../frontend/specs/verification.md#f2---tabla-de-alertas-de-anomalias).

**Depende de:** [plan F1](f1-date-range-filter.md) completo (`buildQuery`, `useApiResource`, `isValidDateRange`, `AlertsResponse`, `test-helpers.ts`, `stubApi` de `App.test.tsx`).

**Reglas del proyecto:** WF, FE, API (consumo de `/alerts`), FIN (formato de importes y ratio).

**Rama:** `feature/frontend-specs-v2-fase7-f2` desde `feature/frontend-specs-v2` con F1 integrado (ver [ROADMAP-Project-3](../entregables/ROADMAP-Project-3.md#9-ampliacion-v2-planes-implementacion-y-prueba-de-traspaso)). Commits solo con autorizacion del usuario (WF 8).

## Restricciones globales

- `GET /api/metrics/alerts?threshold=...[&start_date][&end_date]` en ese orden (DEC-07). **Nunca** `group_by` ni `business_type`.
- `threshold` siempre en `0.01`-`1.0` inclusive (INV-3); por defecto `0.3`.
- Filas en el orden de la API; sin calcular alertas en el cliente; columna `Avg. of previous periods`.
- Estados con precedencia `loading` > `error` > vacio > datos (DEC-16); error con `role="alert"`, vacio con `role="status"` (DEC-18).
- La tarjeta no aparece en `B2B vs B2C` (lo cubre el plan F3).
- Un fallo de alertas no activa el banner global ni vacia los KPI (INV-6).
- Sin dependencias nuevas, sin `any` explicito, sin backend.

## Decisiones propias del plan (implementacion, no producto)

- **Actualizacion de tests existentes (cambio de producto, no debilitamiento):** en `App.test.tsx`, `busyStates()` pasa de 2 a 3 secciones (la nueva `section` de DEC-19) y la lista de `h2` anade `"Anomaly Alerts"`. El primer `[role="alert"]` sigue siendo el banner en espanol, porque va antes en el DOM.
- Fixture de fila: `{ period: "2026-03", outcome_total: 88075.59, baseline_average: 55334.29, increase_ratio: 0.5917 }` -> `2026-03`, `$88,076`, `$55,334`, `59.2%`.

## Foco de revision

1. **Umbral valido con el rango invertido:** sin peticion; al corregir el rango se pide con ese umbral (AC-F2-13). Test en Tarea 4.
2. **Error y recuperacion:** tras un fallo, un umbral valido nuevo con 200 quita el error. Test en Tarea 4.
3. **El estado vacio muestra el umbral aplicado, no el escrito.** Test en Tarea 3.
4. **Input vaciado mientras se escribe:** `''` -> error y ninguna peticion con `threshold=`. Test en Tarea 4.
5. **Extremos `0.01` y `1.0`:** validos y enviados. Tests en Tareas 1 y 4.

---

### Tarea 1: Constantes y `parseThreshold`

**Archivos:** modificar `frontend/src/lib/financial-utils.ts`; test `frontend/src/lib/financial-utils.test.ts`.

**Interfaces:**
- Produce: `THRESHOLD_MIN = 0.01`, `THRESHOLD_MAX = 1`, `THRESHOLD_DEFAULT = 0.3`, `parseThreshold(text: string): number | null`.

- [ ] **Paso 1: tests que fallan**

```ts
it("parses thresholds within 0.01 and 1 inclusive", () => {
  expect(parseThreshold("0.3")).toBe(0.3);
  expect(parseThreshold("0.01")).toBe(0.01);
  expect(parseThreshold("1")).toBe(1);
  expect(parseThreshold("1.0")).toBe(1);
});
it("rejects empty, non-numeric and out-of-range text", () => {
  for (const text of ["", " ", "abc", "0", "0.009", "1.01", "5", "-0.1", "Infinity"]) {
    expect(parseThreshold(text)).toBeNull();
  }
});
```

- [ ] **Paso 2:** `npm --prefix frontend test -- src/lib/financial-utils.test.ts` -> FAIL.
- [ ] **Paso 3: implementar** en `financial-utils.ts`:

```ts
export const THRESHOLD_MIN = 0.01;
export const THRESHOLD_MAX = 1;
export const THRESHOLD_DEFAULT = 0.3;

/** Threshold if the text is a finite number within THRESHOLD_MIN..THRESHOLD_MAX (inclusive); otherwise null. */
export function parseThreshold(text: string): number | null {
  if (text.trim() === "") return null;
  const value = Number(text);
  const inRange = Number.isFinite(value) && value >= THRESHOLD_MIN && value <= THRESHOLD_MAX;
  return inRange ? value : null;
}
```

  `Number("")` y `Number(" ")` dan `0`; por eso el texto en blanco se descarta antes.
- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5: commit** `feat(f2): add threshold parsing`.

### Tarea 2: Componente `ThresholdInput`

**Archivos:** crear `frontend/src/components/dashboard/threshold-input.tsx`; test `threshold-input.test.tsx` (jsdom).

**Interfaces:**
- Produce: `ThresholdInput({ value, onChange }: ThresholdInputProps)`.

Textos exactos (spec): etiqueta `Alert threshold`, ayuda `Ratio between 0.01 and 1.0 (default 0.3).`, error `Enter a value between 0.01 and 1.0.` (`role="alert"`, `aria-invalid="true"`).

- [ ] **Paso 1: tests que fallan.** Ejemplo:

```tsx
it('shows an error for invalid text', async () => {
  for (const text of ['', '0', '5']) {
    view.root.render(<ThresholdInput value={text} onChange={vi.fn()} />)
    await vi.waitFor(() => {
      expect(view.container.querySelector('[role="alert"]')?.textContent).toBe('Enter a value between 0.01 and 1.0.')
      expect(inputByLabel(view.container, 'Alert threshold').getAttribute('aria-invalid')).toBe('true')
    })
  }
})
```

  Lista completa:
  - `it("renders a labelled number input with limits")`: `type="number"`, `min="0.01"`, `max="1"`, `step="0.01"`; con `value="0.3"`, `input.value` es `"0.3"`; ayuda visible.
  - `it("emits the raw text on change")`: `setInputValue(input, "0.5")` -> `onChange("0.5")`.
  - `it("shows an error for invalid text")` (AC-F2-04).
  - `it("shows no error at the limits")`: `"0.01"` y `"1.0"`.
- [ ] **Paso 2:** `npm --prefix frontend test -- src/components/dashboard/threshold-input.test.tsx` -> FAIL.
- [ ] **Paso 3: implementar** `threshold-input.tsx`:

```tsx
import { useId } from 'react'
import { parseThreshold, THRESHOLD_MAX, THRESHOLD_MIN } from '@/lib/financial-utils'

interface ThresholdInputProps {
  value: string
  onChange: (text: string) => void
}

export function ThresholdInput({ value, onChange }: ThresholdInputProps) {
  const id = useId()
  const invalid = parseThreshold(value) === null

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        Alert threshold
      </label>
      <input
        id={id}
        type="number"
        min={THRESHOLD_MIN}
        max={THRESHOLD_MAX}
        step={0.01}
        value={value}
        aria-invalid={invalid || undefined}
        aria-describedby={`${id}-help`}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-28 rounded-md border border-border bg-background px-3 text-sm text-foreground aria-[invalid=true]:border-destructive"
      />
      <p id={`${id}-help`} className="text-xs text-muted-foreground">
        Ratio between 0.01 and 1.0 (default 0.3).
      </p>
      {invalid ? (
        <p role="alert" className="text-xs text-destructive-foreground">
          Enter a value between 0.01 and 1.0.
        </p>
      ) : null}
    </div>
  )
}
```

- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5: commit** `feat(f2): add ThresholdInput component`.

### Tarea 3: Componente `AlertsTable`

**Archivos:** crear `frontend/src/components/dashboard/alerts-table.tsx`; test `alerts-table.test.tsx` (jsdom).

**Interfaces:**
- Produce: `AlertsTable(props: AlertsTableProps)` con las props de la spec.

Textos exactos (spec): titulo `Anomaly Alerts` (DEC-06); ayuda `Average outcome of all earlier periods in the selected range.`; cabeceras `Period`, `Outcome`, `Avg. of previous periods`, `Increase`; vacio `No anomalies detected for the current threshold ({formatPercent(appliedThreshold * 100)}).` + `Try a lower threshold or a wider date range.` (`role="status"`); error `Could not load anomaly alerts.` (`role="alert"`). Tabla HTML con estados en `tbody` (DEC-09).

- [ ] **Paso 1: tests que fallan.** Ejemplo:

```tsx
const ALERT = { period: '2026-03', outcome_total: 88075.59, baseline_average: 55334.29, increase_ratio: 0.5917 }

it('formats each alert row', async () => {
  view.root.render(
    <AlertsTable alerts={[ALERT]} appliedThreshold={0.3} thresholdText="0.3" onThresholdChange={vi.fn()} />,
  )
  await vi.waitFor(() => {
    const cells = [...view.container.querySelectorAll('tbody td')].map((cell) => cell.textContent)
    expect(cells).toEqual(['2026-03', '$88,076', '$55,334', '59.2%'])
  })
})

it('prefers loading over error', async () => {
  view.root.render(
    <AlertsTable alerts={null} appliedThreshold={0.3} thresholdText="0.3" onThresholdChange={vi.fn()} loading error />,
  )
  await vi.waitFor(() => {
    expect(view.container.querySelectorAll('tbody [data-slot="skeleton"]')).toHaveLength(3)
    expect(view.container.textContent).not.toContain('Could not load anomaly alerts.')
  })
})
```

  Lista completa:
  - `it("renders title, help line, input and four headers")` (AC-F2-01, AC-F2-08).
  - `it("formats each alert row")` (AC-F2-07).
  - `it("keeps the API row order")`: `["2026-03", "2025-12"]` se mantiene.
  - `it("keeps the table visible with an empty result")` (AC-F2-09, DEC-09, DEC-18): cabeceras en `thead`; mensaje con `(30.0%)` dentro de `tbody`, en un elemento con `role="status"`.
  - `it("uses the applied threshold in the empty message")` (foco 3): `thresholdText="5"` -> sigue `(30.0%)`.
  - `it("shows three skeleton rows while loading")` (AC-F2-10): input activo.
  - `it("shows the card error and hides the table")` (AC-F2-11, DEC-18).
  - `it("prefers loading over error")` (DEC-16).
  - `it("keeps the last rows while the input is invalid")` (AC-F2-04).
- [ ] **Paso 2:** `npm --prefix frontend test -- src/components/dashboard/alerts-table.test.tsx` -> FAIL.
- [ ] **Paso 3: implementar** `alerts-table.tsx`:

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { type AlertsResponse } from '@/lib/api-types'
import { formatCurrency, formatPercent } from '@/lib/financial-utils'
import { ThresholdInput } from './threshold-input'

interface AlertsTableProps {
  alerts: AlertsResponse | null
  appliedThreshold: number
  thresholdText: string
  onThresholdChange: (text: string) => void
  loading?: boolean
  error?: boolean
}

const HEADERS = ['Period', 'Outcome', 'Avg. of previous periods', 'Increase']

function AlertsBody({ alerts, appliedThreshold, loading }: Pick<AlertsTableProps, 'alerts' | 'appliedThreshold' | 'loading'>) {
  if (loading) {
    return [0, 1, 2].map((row) => (
      <tr key={row}>
        <td colSpan={HEADERS.length} className="py-2">
          <Skeleton className="h-5 w-full" />
        </td>
      </tr>
    ))
  }

  if (!alerts?.length) {
    return (
      <tr>
        <td colSpan={HEADERS.length} className="py-6 text-center text-sm text-muted-foreground">
          <div role="status">
            <p>No anomalies detected for the current threshold ({formatPercent(appliedThreshold * 100)}).</p>
            <p>Try a lower threshold or a wider date range.</p>
          </div>
        </td>
      </tr>
    )
  }

  return alerts.map((alert) => (
    <tr key={alert.period} className="border-t border-border/60">
      <td className="py-2">{alert.period}</td>
      <td className="py-2 text-right">{formatCurrency(alert.outcome_total)}</td>
      <td className="py-2 text-right">{formatCurrency(alert.baseline_average)}</td>
      <td className="py-2 text-right">{formatPercent(alert.increase_ratio * 100)}</td>
    </tr>
  ))
}

export function AlertsTable({ alerts, appliedThreshold, thresholdText, onThresholdChange, loading, error }: AlertsTableProps) {
  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold">Anomaly Alerts</CardTitle>
          <CardDescription>Average outcome of all earlier periods in the selected range.</CardDescription>
        </div>
        <ThresholdInput value={thresholdText} onChange={onThresholdChange} />
      </CardHeader>
      <CardContent>
        {!loading && error ? (
          <p role="alert" className="text-sm text-destructive-foreground">
            Could not load anomaly alerts.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                {HEADERS.map((header) => (
                  <th key={header} scope="col" className="pb-2 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AlertsBody alerts={alerts} appliedThreshold={appliedThreshold} loading={loading} />
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5: commit** `feat(f2): add AlertsTable component`.

### Tarea 4: Integracion en `App`

**Archivos:** modificar `frontend/src/App.tsx`; test `frontend/src/App.test.tsx`.

**Interfaces:**
- Produce: `thresholdText`, `appliedThreshold`, `handleThresholdChange` y `alerts` en `App`. F3 anadira la condicion de vista a la ruta de `alerts`.

- [ ] **Paso 1: actualizar los 2 tests existentes y anadir `describe("anomaly alerts")`.**

  Cambios en los tests existentes:

```tsx
// "marks both sections busy while data is loading" -> pasa a tres secciones
expect(busyStates()).toEqual(["true", "true", "true"]);
// "announces a load error ...": busyStates y lista de h2
expect(busyStates()).toEqual(["false", "false", "false"]);
expect([...container.querySelectorAll("h2")].map((h) => h.textContent)).toEqual([
  "Total Income",
  "Total Outcome",
  "Profit",
  "Profit Margin",
  "Income vs. Outcome",
  "Profit Margin %",
  "Anomaly Alerts",
]);
```

  Test nuevo de ejemplo (usa `stubApi` del plan F1):

```tsx
const alertCalls = (fetchMock: ReturnType<typeof stubApi>) =>
  calledUrls(fetchMock).filter((url) => url.startsWith("/api/metrics/alerts"));

it("applies a threshold typed during an inverted range once fixed", async () => {
  const fetchMock = stubApi();
  root.render(<App />);
  await vi.waitFor(() => expect(alertCalls(fetchMock)).toEqual(["/api/metrics/alerts?threshold=0.3"]));

  // Wait for each re-render: the picker builds the next filter from its current `value` prop.
  setInputValue(inputByLabel(container, "Start date"), "2026-02-01");
  await vi.waitFor(() => expect(container.textContent).toContain("From 2026-02-01"));
  setInputValue(inputByLabel(container, "End date"), "2026-01-01");
  await vi.waitFor(() => expect(container.textContent).toContain("Start date must be on or before end date."));
  setInputValue(inputByLabel(container, "Alert threshold"), "0.4");
  await new Promise((done) => setTimeout(done, 0));
  expect(alertCalls(fetchMock).every((url) => !url.includes("threshold=0.4"))).toBe(true);

  setInputValue(inputByLabel(container, "Start date"), "2025-12-01");
  await vi.waitFor(() =>
    expect(alertCalls(fetchMock).at(-1)).toBe(
      "/api/metrics/alerts?threshold=0.4&start_date=2025-12-01&end_date=2026-01-01",
    ),
  );
});
```

  Lista completa:
  - `it("requests alerts with the default threshold on load")` (AC-F2-02).
  - `it("refetches with a valid threshold")` (AC-F2-03, foco 5): `0.5`, `0.01`, `1.0` -> `?threshold=0.5`, `?threshold=0.01`, `?threshold=1`.
  - `it("does not request with an invalid threshold")` (AC-F2-04, INV-3, foco 4).
  - `it("refetches alerts when the date filter changes")` (AC-F2-05).
  - `it("does not request alerts with an inverted range")` (AC-F2-06).
  - `it("applies a threshold typed during an inverted range once fixed")` (AC-F2-13, DEC-08, foco 1).
  - `it("keeps alert errors inside the card")` (AC-F2-11, INV-6, foco 2): `stubApi((url) => url.startsWith("/api/metrics/alerts") ? Promise.resolve(jsonResponse(null, 500)) : undefined)`.
  - `it("renders only the latest alerts response")` (AC-F2-12).
  - `it("never sends group_by or business_type to alerts")`.
- [ ] **Paso 2:** `npm --prefix frontend test -- src/App.test.tsx` -> FAIL en los nuevos y en los 2 actualizados.
- [ ] **Paso 3: implementar.** Cambios en `App.tsx` sobre la version de F1:

```tsx
import { AlertsTable } from "@/components/dashboard/alerts-table";
import { type AlertsResponse, type FacetsResponse } from "@/lib/api-types";
import {
  computeKPIs,
  computeMonthlyData,
  formatPeriodLabel,
  isValidDateRange,
  parseThreshold,
  THRESHOLD_DEFAULT,
} from "@/lib/financial-utils";

function App() {
  // ... filter, facets y movements como en F1 ...
  const [thresholdText, setThresholdText] = useState(String(THRESHOLD_DEFAULT));
  const [appliedThreshold, setAppliedThreshold] = useState(THRESHOLD_DEFAULT);
  const alerts = useApiResource<AlertsResponse>(
    isValidDateRange(filter)
      ? `/api/metrics/alerts${buildQuery({ threshold: appliedThreshold, ...filter })}`
      : null,
  );

  /** Keeps the typed text; applies it only when valid, even with an inverted range (DEC-08). */
  function handleThresholdChange(text: string) {
    setThresholdText(text);
    const threshold = parseThreshold(text);
    if (threshold !== null) setAppliedThreshold(threshold);
  }

  return (
    // ... igual que en F1 hasta la section de graficos, y despues:
    <section aria-label="Anomaly alerts" aria-busy={alerts.loading}>
      <AlertsTable
        alerts={alerts.data}
        appliedThreshold={appliedThreshold}
        thresholdText={thresholdText}
        onThresholdChange={handleThresholdChange}
        loading={alerts.loading}
        error={alerts.error}
      />
    </section>
  );
}
```

- [ ] **Paso 4:** mismo comando -> PASS (incluidos los de F1).
- [ ] **Paso 5: commit** `feat(f2): wire anomaly alerts into App`.

### Tarea 5: Verificacion final y evidencia

**Archivos:** `docs/validations/08-features-checks.md` (seccion F2), `memory-bank/status.md`, `memory-bank/stack.md`.

Procedimiento del repositorio para verificar cambios del frontend: [.skills/verify-frontend-change/SKILL.md](../../.skills/verify-frontend-change/SKILL.md).

- [ ] **Paso 1:** lint, tests y build -> sin errores ni avisos nuevos.
- [ ] **Paso 2: app en ejecucion** (confirmar con `curl -s http://localhost:5173/src/components/dashboard/alerts-table.tsx` que Vite sirve el codigo nuevo): comparar fila a fila con `curl "http://localhost:8000/api/metrics/alerts?threshold=0.3"` (el dataset depende de la fecha de hoy); `1.0`; `0`, `5`, `0,3` y vacio sin peticion (pestana Red del navegador); un rango de un mes -> vacio; backend parado -> error solo en la tarjeta.
- [ ] **Paso 3: los tests detectan la rotura:** quitar temporalmente `role="alert"` de `ThresholdInput` y el `if (threshold !== null)` de `handleThresholdChange`; ver fallar; restaurar; diff vacio.
- [ ] **Paso 4:** registrar evidencia y limites; actualizar memory-bank; `git diff --check`.
- [ ] **Paso 5: commit** `docs(f2): record verification evidence`.

## Historial del plan

| Version | Fecha | Cambios |
| --- | --- | --- |
| 1.0 | 2026-11-18 | Plan inicial sobre la spec 1.0, con decisiones propias |
| 2.0 | 2026-11-18 | Regenerado sobre la spec 1.1; huecos H-02, H-04 y H-05 provisionales |
| 3.0 | 2026-11-18 | Regenerado sobre la spec 1.2: los huecos pasan a DEC-16, DEC-18 y DEC-19; sin referencias a herramientas externas al repositorio; sin huecos pendientes |
| 3.1 | 2026-11-18 | Referencia a la spec 1.3; sin cambios de contenido (DEC-24 solo afecta a F1) |
| 4.0 | 2026-11-18 | Ejemplos de codigo de implementacion en cada tarea, cambios exactos en los tests existentes y tests representativos |
