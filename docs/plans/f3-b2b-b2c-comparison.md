# F3 - Vista comparativa B2B vs B2C: plan de implementacion

**Version:** 4.0 | **Fecha:** 2026-11-18 | **Estado:** pendiente de revision | **Spec:** v1.3

> **Pendiente antes de ejecutar:** adaptar a la spec v1.4. `ComparisonPage` recibe tambien `bounds` y decide sus peticiones con `getDateRangeIssue(filter, bounds) === null` (DEC-26), igual que `App`.

**Como ejecutar:** tarea por tarea y en orden; marcar cada paso (`- [ ]`) al completarlo. No empezar una tarea sin que la anterior tenga sus tests en verde.

**Sobre los ejemplos de codigo:** muestran la implementacion propuesta para cada tarea, con el estilo del archivo que se toca. No se han ejecutado: lo que valida cada tarea son sus tests. Las clases de Tailwind son orientativas.

**Objetivo:** segunda vista, accesible con pestanas por estado, con las categorias de ingreso de B2B y B2C en paralelo y un grafico de dos barras con el total de cada grupo.

**Arquitectura:** utilidades puras (`toGroupRows`, `sumTotals`, `formatCategoryLabel`), tres componentes de presentacion (`ViewTabs`, `GroupTopTable`, `GroupComparisonChart`) y `ComparisonPage`, que hace dos `useApiResource` en paralelo. `App` guarda `view`, coloca las pestanas sobre el filtro compartido y carga `ComparisonPage` en diferido (DEC-13).

**Stack:** React 19.2, TypeScript ~6.0, Recharts 3.8 (`BarChart`), Vitest 4 + jsdom, Tailwind 4.

**Spec:** [components.md v1.3](../../frontend/specs/components.md): F3, convenciones comunes, disposicion de la pagina y DEC-07, DEC-10 a DEC-21 y DEC-23. Evidencia de la API en [verification.md](../../frontend/specs/verification.md#f3---vista-comparativa-b2b-vs-b2c).

**Depende de:** [plan F1](f1-date-range-filter.md) y [plan F2](f2-anomaly-alerts.md) completos.

**Reglas del proyecto:** WF, FE (componentes, grafico, tokens, tests), API (consumo de `/categories/top`), FIN (porcentaje y totales en cliente).

**Rama:** `feature/frontend-specs-v2-fase8-f3` desde `feature/frontend-specs-v2` con F1 y F2 integrados (ver [ROADMAP-Project-3](../entregables/ROADMAP-Project-3.md#9-ampliacion-v2-planes-implementacion-y-prueba-de-traspaso)). Commits solo con autorizacion del usuario (WF 8).

## Restricciones globales

- Sin router ni dependencias nuevas; `AppView = 'dashboard' | 'comparison'`.
- Cada peticion: `operation_type=income`, `limit=5`, exactamente un `business_type` (INV-F3-1), fechas si estan informadas, en el orden de DEC-07.
- Datos solo de `/categories/top`; nunca `/b2b`, `/b2c`, `/summary` ni `facets.categories`.
- De 0 a 5 filas, orden de la API, sin relleno; secciones B2B y luego B2C.
- Colores B2B `var(--chart-1)`, B2C `var(--chart-5)`; eje Y y tooltip con `formatCurrency`.
- Estados con precedencia `loading` > `error` > vacio > datos (DEC-16); errores `role="alert"`, vacios `role="status"` (DEC-18).
- Un unico selector de fechas (INV-5). Sin cambios de firma en `DashboardHeader`, `KPIRow` ni graficos existentes; sin backend.
- Build sin aviso de chunk > 500 kB (DEC-13).

## Decisiones propias del plan (implementacion, no producto)

- jsdom no da tamano a `ResponsiveContainer`, asi que las barras no se dibujan en los tests: se prueban estados y textos, y las barras, los colores y la barra de `$0` se observan en el navegador (Tarea 7).
- Fixture B2B verificada (verification.md): `sales` 557903.97 y `others` 57636.75; suma 615540.72 -> `Sales`, `$557,904`, `90.6%`; `Others`, `$57,637`, `9.4%`.
- El fallback de `Suspense` (DEC-23) reutiliza `GroupTopTable` con `loading` y el `ChartFallback` existente de `App`, con el mismo marcado que el estado de carga real.

## Foco de revision

1. **Un grupo falla y el otro esta vacio.** Test en Tarea 5.
2. **Respuesta pendiente al salir de la pestana:** no pinta nada ni genera errores en consola. Test en Tarea 6.
3. **Volver a `Dashboard` tras cambiar el filtro en la comparativa:** KPI y alertas se piden con el filtro nuevo (AC-F3-15). Test en Tarea 6.
4. **Total de grupo 0 con filas:** `share` 0, sin `NaN%`. Test en Tarea 1.
5. **Abrir la comparativa con rango invertido:** sin peticiones y estados vacios (AC-F3-16). Test en Tarea 5.

---

### Tarea 1: Tipos y utilidades de grupo

**Archivos:** modificar `frontend/src/lib/financial-types.ts` y `frontend/src/lib/financial-utils.ts` (DEC-21); test `financial-utils.test.ts`.

**Interfaces:**
- Produce: `AppView`, `GroupCategoryRow`, `GroupTotal`; `toGroupRows`, `sumTotals`, `formatCategoryLabel` (DEC-11).

- [ ] **Paso 1: tests que fallan**

```ts
const b2b: TopCategoriesResponse = [
  { category: "sales", operation_type: "income", total_amount: 557903.97 },
  { category: "others", operation_type: "income", total_amount: 57636.75 },
];
it("sums group totals", () => {
  expect(sumTotals(b2b)).toBeCloseTo(615540.72, 2);               // INV-F3-3
  expect(sumTotals([])).toBe(0);
});
it("builds rows with shares in API order", () => {
  const rows = toGroupRows(b2b);
  expect(rows.map((r) => r.category)).toEqual(["sales", "others"]);
  expect(rows[0].share).toBeCloseTo(557903.97 / 615540.72, 6);
  expect(rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1, 10); // INV-F3-2
  expect(toGroupRows([])).toEqual([]);
});
it("uses a zero share when the group total is zero", () => {
  expect(toGroupRows([{ category: "sales", operation_type: "income", total_amount: 0 }])[0].share).toBe(0);
});
it("capitalizes category labels", () => {                         // DEC-11
  expect(formatCategoryLabel("sales")).toBe("Sales");
  expect(formatCategoryLabel("others")).toBe("Others");
});
```

- [ ] **Paso 2:** `npm --prefix frontend test -- src/lib/financial-utils.test.ts` -> FAIL.
- [ ] **Paso 3: implementar.**

  En `financial-types.ts` (estilo del archivo: comillas simples, sin punto y coma):

```ts
export type AppView = 'dashboard' | 'comparison'

export interface GroupCategoryRow {
  category: Category
  total_amount: number
  /** Share of the group total, 0 to 1. */
  share: number
}

export interface GroupTotal {
  business_type: BusinessType
  total_income: number
}
```

  En `financial-utils.ts`:

```ts
import type { TopCategoriesResponse } from "./api-types";

/** Sum of total_amount; 0 for an empty response. */
export function sumTotals(entries: TopCategoriesResponse): number {
  return entries.reduce((sum, entry) => sum + entry.total_amount, 0);
}

/** Rows with share = total_amount / group sum (0 when the sum is 0), in API order. */
export function toGroupRows(entries: TopCategoriesResponse): GroupCategoryRow[] {
  const total = sumTotals(entries);
  return entries.map(({ category, total_amount }) => ({
    category,
    total_amount,
    share: total > 0 ? total_amount / total : 0,
  }));
}

export function formatCategoryLabel(category: Category): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}
```

- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5: commit** `feat(f3): add group rows and totals helpers`.

### Tarea 2: Componente `ViewTabs`

**Archivos:** crear `frontend/src/components/dashboard/view-tabs.tsx`; test `view-tabs.test.tsx` (jsdom).

**Interfaces:**
- Produce: `ViewTabs({ view, onChange }: ViewTabsProps)` (DEC-10; ids `tab-${view}` de DEC-19).

- [ ] **Paso 1: tests que fallan.** Ejemplo:

```tsx
it('marks the active tab', async () => {
  view.root.render(<ViewTabs view="comparison" onChange={vi.fn()} />)
  await vi.waitFor(() => {
    const tabs = [...view.container.querySelectorAll('[role="tab"]')]
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['false', 'true'])
    expect(tabs.map((tab) => tab.id)).toEqual(['tab-dashboard', 'tab-comparison'])
  })
})
```

  Lista completa:
  - `it("renders Dashboard and B2B vs B2C tabs")` (AC-F3-01): `role="tablist"`, dos `role="tab"` con `aria-controls="view-panel"`.
  - `it("marks the active tab")`.
  - `it("emits the selected view")`: click en `B2B vs B2C` -> `onChange("comparison")`.
- [ ] **Paso 2:** `npm --prefix frontend test -- src/components/dashboard/view-tabs.test.tsx` -> FAIL.
- [ ] **Paso 3: implementar** `view-tabs.tsx`:

```tsx
import { type AppView } from '@/lib/financial-types'
import { cn } from '@/lib/utils'

interface ViewTabsProps {
  view: AppView
  onChange: (view: AppView) => void
}

const TABS: { view: AppView; label: string }[] = [
  { view: 'dashboard', label: 'Dashboard' },
  { view: 'comparison', label: 'B2B vs B2C' },
]

export function ViewTabs({ view, onChange }: ViewTabsProps) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-border">
      {TABS.map((tab) => {
        const selected = tab.view === view
        return (
          <button
            key={tab.view}
            id={`tab-${tab.view}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls="view-panel"
            onClick={() => onChange(tab.view)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              selected
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5: commit** `feat(f3): add ViewTabs component`.

### Tarea 3: Componente `GroupTopTable`

**Archivos:** crear `frontend/src/components/dashboard/group-top-table.tsx`; test `group-top-table.test.tsx` (jsdom).

**Interfaces:**
- Produce: `GroupTopTable(props: GroupTopTableProps)` con las props de la spec.

Textos exactos (spec): `{group} - Top income categories`, `Top 5 categories by total income`, cabeceras `Category`, `Total income`, `Share of group`, vacio `No income in the selected range for {group}.` (`role="status"`), error `Could not load {group} income data.` (`role="alert"`). Carga: titulo, descripcion y 3 filas de `Skeleton` (DEC-17).

- [ ] **Paso 1: tests que fallan.** Ejemplo:

```tsx
it('formats rows in API order', async () => {
  view.root.render(<GroupTopTable businessType="B2B" rows={toGroupRows(B2B_ENTRIES)} />)
  await vi.waitFor(() => {
    const rows = [...view.container.querySelectorAll('tbody tr')].map((row) =>
      [...row.querySelectorAll('td')].map((cell) => cell.textContent),
    )
    expect(rows).toEqual([
      ['Sales', '$557,904', '90.6%'],
      ['Others', '$57,637', '9.4%'],
    ])
  })
})
```

  Lista completa:
  - `it("renders the group title, description and headers")`.
  - `it("formats rows in API order")` (AC-F3-06).
  - `it("renders only the rows it receives")` (AC-F3-07).
  - `it("shows the empty message without a table")` (AC-F3-08, DEC-18).
  - `it("shows the title and three skeleton rows while loading")` (AC-F3-12, DEC-17).
  - `it("shows the group error")` (AC-F3-13, DEC-18).
  - `it("prefers loading over error")` (DEC-16).
- [ ] **Paso 2:** `npm --prefix frontend test -- src/components/dashboard/group-top-table.test.tsx` -> FAIL.
- [ ] **Paso 3: implementar** `group-top-table.tsx`:

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { type BusinessType, type GroupCategoryRow } from '@/lib/financial-types'
import { formatCategoryLabel, formatCurrency, formatPercent } from '@/lib/financial-utils'

interface GroupTopTableProps {
  businessType: BusinessType
  rows: GroupCategoryRow[]
  loading?: boolean
  error?: boolean
}

function GroupBody({ businessType, rows, loading, error }: GroupTopTableProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-5 w-full" />
        ))}
      </div>
    )
  }
  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive-foreground">
        Could not load {businessType} income data.
      </p>
    )
  }
  if (rows.length === 0) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        No income in the selected range for {businessType}.
      </p>
    )
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase text-muted-foreground">
          <th scope="col" className="pb-2 font-medium">Category</th>
          <th scope="col" className="pb-2 text-right font-medium">Total income</th>
          <th scope="col" className="pb-2 text-right font-medium">Share of group</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.category} className="border-t border-border/60">
            <td className="py-2">{formatCategoryLabel(row.category)}</td>
            <td className="py-2 text-right">{formatCurrency(row.total_amount)}</td>
            <td className="py-2 text-right">{formatPercent(row.share * 100)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function GroupTopTable(props: GroupTopTableProps) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">{props.businessType} - Top income categories</CardTitle>
        <CardDescription>Top 5 categories by total income</CardDescription>
      </CardHeader>
      <CardContent>
        <GroupBody {...props} />
      </CardContent>
    </Card>
  )
}
```

- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5: commit** `feat(f3): add GroupTopTable component`.

### Tarea 4: Componente `GroupComparisonChart`

**Archivos:** crear `frontend/src/components/dashboard/group-comparison-chart.tsx`; test `group-comparison-chart.test.tsx` (jsdom).

**Interfaces:**
- Produce: `GroupComparisonChart(props: GroupComparisonChartProps)` con los detalles de DEC-20 y la carga de DEC-17.

Textos exactos (spec): `Income: B2B vs B2C`, `No income to compare in the selected range.` (`role="status"`), `Could not load the comparison.` (`role="alert"`).

- [ ] **Paso 1: tests que fallan.** Ejemplo:

```tsx
it('prefers loading over error', async () => {
  view.root.render(<GroupComparisonChart totals={TOTALS} loading error />)
  await vi.waitFor(() => {
    expect(view.container.querySelector('[data-slot="skeleton"]')).not.toBeNull()
    expect(view.container.textContent).not.toContain('Could not load the comparison.')
  })
})
```

  Lista completa:
  - `it("shows the title and no empty message when a group has income")` (AC-F3-09/10): `[{ B2B, 615540.72 }, { B2C, 0 }]`.
  - `it("shows the empty message when both totals are zero")` (AC-F3-11, DEC-18).
  - `it("shows a skeleton while loading")` (AC-F3-12, DEC-17).
  - `it("shows the comparison error")` (AC-F3-13, DEC-18).
  - `it("prefers loading over error")` (AC-F3-18, DEC-16).
- [ ] **Paso 2:** `npm --prefix frontend test -- src/components/dashboard/group-comparison-chart.test.tsx` -> FAIL.
- [ ] **Paso 3: implementar** `group-comparison-chart.tsx` (la carga copia el marcado de los graficos existentes, para no causar salto de altura):

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { type BusinessType, type GroupTotal } from '@/lib/financial-types'
import { formatCurrency } from '@/lib/financial-utils'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface GroupComparisonChartProps {
  totals: GroupTotal[]
  loading?: boolean
  error?: boolean
}

const BAR_COLORS: Record<BusinessType, string> = {
  B2B: 'var(--chart-1)',
  B2C: 'var(--chart-5)',
}

const MESSAGE_CLASS = 'flex h-[280px] items-center justify-center text-sm'

export function GroupComparisonChart({ totals, loading, error }: GroupComparisonChartProps) {
  if (loading) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <Skeleton className="h-5 w-52 my-0.5" />
          <Skeleton className="h-3 w-64 my-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  const hasIncome = totals.some((total) => total.total_income > 0)

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">Income: B2B vs B2C</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div role="alert" className={`${MESSAGE_CLASS} text-destructive-foreground`}>
            Could not load the comparison.
          </div>
        ) : !hasIncome ? (
          <div role="status" className={`${MESSAGE_CLASS} text-muted-foreground`}>
            No income to compare in the selected range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={totals}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              title="Income: B2B vs B2C"
              desc="Total income of B2B and B2C in the selected range."
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.6} vertical={false} />
              <XAxis
                dataKey="business_type"
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value: number) => formatCurrency(value)}
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                width={88}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                cursor={{ fill: 'var(--color-border)', opacity: 0.3 }}
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}
              />
              <Bar dataKey="total_income" name="Income" radius={[6, 6, 0, 0]}>
                {totals.map((total) => (
                  <Cell key={total.business_type} fill={BAR_COLORS[total.business_type]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5: commit** `feat(f3): add GroupComparisonChart component`.

### Tarea 5: Pagina `ComparisonPage`

**Archivos:** crear `frontend/src/components/dashboard/comparison-page.tsx`; test `comparison-page.test.tsx` (jsdom, `fetch` enrutado por URL).

**Interfaces:**
- Produce: `ComparisonPage({ filter }: ComparisonPageProps)`.

- [ ] **Paso 1: tests que fallan.** Ejemplo:

```tsx
const TOP = '/api/metrics/categories/top?operation_type=income&limit=5&business_type='

it('shows the chart loading while one group loads and the other failed', async () => {
  const pendingB2c = deferred<Response>()
  vi.stubGlobal('fetch', vi.fn((url: string) =>
    url === `${TOP}B2B` ? Promise.resolve(jsonResponse(null, 500)) : pendingB2c.promise,
  ))
  view.root.render(<ComparisonPage filter={{}} />)
  await vi.waitFor(() => {
    expect(view.container.textContent).toContain('Could not load B2B income data.')
    expect(view.container.textContent).not.toContain('Could not load the comparison.')
    expect(view.container.querySelector('section[aria-label="Income comparison"]')?.getAttribute('aria-busy')).toBe('true')
  })
})
```

  Lista completa:
  - `it("requests income top categories for each group")` (AC-F3-04, INV-F3-1): exactamente `${TOP}B2B` y `${TOP}B2C`.
  - `it("adds informed dates to both requests")`: `&start_date=2026-01-01` en ambas.
  - `it("shows empty states without requests on an inverted range")` (AC-F3-16, DEC-14, foco 5).
  - `it("keeps the last result when the range becomes invalid")` (AC-F3-05).
  - `it("renders both groups side by side in order")` (AC-F3-06).
  - `it("shows one empty group while the other renders")` (AC-F3-08).
  - `it("isolates a failed group")` (AC-F3-13, foco 1): B2B `[]`, B2C 500.
  - `it("shows the chart loading while one group loads and the other failed")` (AC-F3-18).
  - `it("marks both sections busy while loading")` (DEC-19).
  - `it("renders only the latest response")` (AC-F3-14).
- [ ] **Paso 2:** `npm --prefix frontend test -- src/components/dashboard/comparison-page.test.tsx` -> FAIL.
- [ ] **Paso 3: implementar** `comparison-page.tsx`:

```tsx
import { buildQuery } from '@/lib/api'
import { type TopCategoriesResponse } from '@/lib/api-types'
import { type BusinessType, type GroupTotal } from '@/lib/financial-types'
import { isValidDateRange, sumTotals, toGroupRows } from '@/lib/financial-utils'
import { type DateRangeFilter } from '@/lib/param-types'
import { useApiResource } from '@/lib/use-api-resource'
import { GroupComparisonChart } from './group-comparison-chart'
import { GroupTopTable } from './group-top-table'

interface ComparisonPageProps {
  filter: DateRangeFilter
}

function topPath(filter: DateRangeFilter, businessType: BusinessType): string | null {
  if (!isValidDateRange(filter)) return null
  const query = buildQuery({ operation_type: 'income', limit: 5, business_type: businessType, ...filter })
  return `/api/metrics/categories/top${query}`
}

export function ComparisonPage({ filter }: ComparisonPageProps) {
  const b2b = useApiResource<TopCategoriesResponse>(topPath(filter, 'B2B'))
  const b2c = useApiResource<TopCategoriesResponse>(topPath(filter, 'B2C'))
  const loading = b2b.loading || b2c.loading
  const totals: GroupTotal[] = [
    { business_type: 'B2B', total_income: sumTotals(b2b.data ?? []) },
    { business_type: 'B2C', total_income: sumTotals(b2c.data ?? []) },
  ]

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Income by business type" aria-busy={loading} className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <GroupTopTable businessType="B2B" rows={toGroupRows(b2b.data ?? [])} loading={b2b.loading} error={b2b.error} />
        <GroupTopTable businessType="B2C" rows={toGroupRows(b2c.data ?? [])} loading={b2c.loading} error={b2c.error} />
      </section>
      <section aria-label="Income comparison" aria-busy={loading}>
        <GroupComparisonChart totals={totals} loading={loading} error={b2b.error || b2c.error} />
      </section>
    </div>
  )
}
```

  Con rango invertido y sin datos previos, las dos rutas son `null`: `data` es `null`, `loading` y `error` son `false`, y los paneles y el grafico muestran su estado vacio (DEC-14).
- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5: commit** `feat(f3): add ComparisonPage`.

### Tarea 6: Integracion en `App`

**Archivos:** modificar `frontend/src/App.tsx`; test `frontend/src/App.test.tsx`.

**Interfaces:**
- Produce: estado `view: AppView` y la disposicion final de DEC-19.

Los tests existentes no cambian (las pestanas y el panel no anaden `section` ni `h2`).

- [ ] **Paso 1: tests que fallan** (`describe("view tabs")`). Ejemplo:

```tsx
it("does not request dashboard data while comparing", async () => {
  const fetchMock = stubApi();
  root.render(<App />);
  await vi.waitFor(() => expect(container.textContent).toContain("$1,000"));

  buttonByText(container, "B2B vs B2C").click();
  await vi.waitFor(() => expect(container.textContent).toContain("B2B - Top income categories"));
  const dashboardCalls = calledUrls(fetchMock).filter((url) => isMovementsUrl(url) || url.startsWith("/api/metrics/alerts")).length;

  setInputValue(inputByLabel(container, "Start date"), "2026-01-01");
  await vi.waitFor(() =>
    expect(calledUrls(fetchMock)).toContain(
      "/api/metrics/categories/top?operation_type=income&limit=5&business_type=B2B&start_date=2026-01-01",
    ),
  );
  expect(
    calledUrls(fetchMock).filter((url) => isMovementsUrl(url) || url.startsWith("/api/metrics/alerts")),
  ).toHaveLength(dashboardCalls);
});
```

  Lista completa:
  - `it("starts on the dashboard tab")` (AC-F3-01): `[role="tabpanel"]` con `aria-labelledby="tab-dashboard"`.
  - `it("switches to the comparison view and keeps the date picker")` (AC-F3-02, INV-5, DEC-19): sin seccion de KPI ni `Anomaly Alerts`; 2 `input[type=date]` en todo el documento, fuera del `tabpanel`.
  - `it("does not request dashboard data while comparing")` (AC-F3-04, AC-F3-15).
  - `it("returns to the dashboard with the same filter")` (AC-F3-03, AC-F3-15, foco 3).
  - `it("hides the movements banner and empty notice in the comparison view")` (AC-F3-17, DEC-15).
  - `it("ignores comparison responses after leaving the tab")` (foco 2): `vi.spyOn(console, "error")` sin llamadas.
- [ ] **Paso 2:** `npm --prefix frontend test -- src/App.test.tsx` -> FAIL en los nuevos.
- [ ] **Paso 3: implementar.** Cambios en `App.tsx` sobre la version de F2:

```tsx
import { GroupTopTable } from "@/components/dashboard/group-top-table";
import { ViewTabs } from "@/components/dashboard/view-tabs";
import { type AppView, type FinancialMovement } from "@/lib/financial-types";

// Recharts goes in its own chunk, like the existing charts (DEC-13).
const ComparisonPage = lazy(() =>
  import("@/components/dashboard/comparison-page").then((m) => ({
    default: m.ComparisonPage,
  })),
);

/** Same markup as the comparison loading state, so the swap causes no layout shift (DEC-23). */
function ComparisonFallback() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <GroupTopTable businessType="B2B" rows={[]} loading />
        <GroupTopTable businessType="B2C" rows={[]} loading />
      </div>
      <ChartFallback />
    </div>
  );
}

function App() {
  const [view, setView] = useState<AppView>("dashboard");
  const [filter, setFilter] = useState<DateRangeFilter>({});
  const onDashboard = view === "dashboard";
  const requestable = onDashboard && isValidDateRange(filter);

  const facets = useApiResource<FacetsResponse>("/api/metrics/facets");
  const movements = useApiResource<FinancialMovement[]>(
    requestable ? `/api/metrics${buildQuery(filter)}` : null,
  );
  // ... thresholdText, appliedThreshold y handleThresholdChange como en F2 ...
  const alerts = useApiResource<AlertsResponse>(
    requestable
      ? `/api/metrics/alerts${buildQuery({ threshold: appliedThreshold, ...filter })}`
      : null,
  );
  // ... metrics, monthlyData, noMovements y bounds como en F1 ...

  return (
    <main className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          <DashboardHeader period={formatPeriodLabel(filter) ?? "2024 - Full Year"} />
          <ViewTabs view={view} onChange={setView} />
          <DateRangePicker
            value={filter}
            onChange={setFilter}
            bounds={bounds}
            boundsLoading={facets.loading}
          />

          <div
            id="view-panel"
            role="tabpanel"
            aria-labelledby={`tab-${view}`}
            className="flex flex-col gap-8"
          >
            {onDashboard ? (
              <>
                {/* aviso de rango vacio, banner, KPI, graficos y alertas: el mismo JSX de F1 y F2 */}
              </>
            ) : (
              <Suspense fallback={<ComparisonFallback />}>
                <ComparisonPage filter={filter} />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
```

  El aviso `No movements found...` y el banner pasan de estar tras el picker a estar dentro de la rama `onDashboard`, al principio del panel (DEC-15, DEC-19).
- [ ] **Paso 4:** mismo comando -> PASS (incluidos F1 y F2). `npm --prefix frontend run build` -> `comparison-page-*.js` en un chunk propio, sin aviso > 500 kB.
- [ ] **Paso 5: commit** `feat(f3): add view tabs and comparison view to App`.

### Tarea 7: Verificacion final y evidencia

**Archivos:** `docs/validations/08-features-checks.md` (seccion F3), `memory-bank/status.md` (F1-F3 implementados), `memory-bank/stack.md` (tests y chunks).

Procedimiento del repositorio para verificar cambios del frontend: [.skills/verify-frontend-change/SKILL.md](../../.skills/verify-frontend-change/SKILL.md).

- [ ] **Paso 1:** lint, tests y build -> sin errores; tamanos de chunk frente a la linea base.
- [ ] **Paso 2: app en ejecucion** (confirmar con `curl -s http://localhost:5173/src/components/dashboard/comparison-page.tsx` que Vite sirve el codigo nuevo): comparar con `curl "http://localhost:8000/api/metrics/categories/top?operation_type=income&limit=5&business_type=B2B"` y B2C; porcentajes que suman ~100 %; dos barras con sus colores y tooltip (pasar el raton); rango futuro -> ambos vacios; anotar si se pudo reproducir un grupo vacio y el otro no (barra `$0`, AC-F3-10) o dejarlo como no verificado; cambio de pestana sin salto de altura (DEC-23).
- [ ] **Paso 3: los tests detectan la rotura:** quitar temporalmente `operation_type: 'income'` en `topPath` y la condicion `onDashboard` de `requestable` en `App`; ver fallar; restaurar; diff vacio.
- [ ] **Paso 4:** registrar evidencia y limites (sin lector de pantalla, sin flechas en pestanas); actualizar memory-bank; `git diff --check`.
- [ ] **Paso 5: commit** `docs(f3): record verification evidence`.

## Historial del plan

| Version | Fecha | Cambios |
| --- | --- | --- |
| 1.0 | 2026-11-18 | Plan inicial sobre la spec 1.0, con decisiones propias |
| 2.0 | 2026-11-18 | Regenerado sobre la spec 1.1; huecos H-01 a H-07 y H-09 provisionales |
| 3.0 | 2026-11-18 | Regenerado sobre la spec 1.2: los huecos pasan a DEC-15 a DEC-21 y DEC-23; tests de AC-F3-17 y AC-F3-18; sin referencias a herramientas externas al repositorio; sin huecos pendientes |
| 3.1 | 2026-11-18 | Referencia a la spec 1.3; sin cambios de contenido (DEC-24 solo afecta a F1) |
| 4.0 | 2026-11-18 | Ejemplos de codigo de implementacion en cada tarea (incluida la version final de `App`) y tests representativos |
