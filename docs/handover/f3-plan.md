# F3 - Vista comparativa B2B vs B2C: plan de implementacion

**Objetivo:** pestanas `Dashboard` / `B2B vs B2C` por estado y una vista con las categorias de ingreso de cada grupo en dos tablas y un grafico de dos barras, desde `GET /api/metrics/categories/top`.

**Arquitectura:** tipos en `financial-types.ts` y utilidades en `financial-utils.ts` (DEC-21); componentes de presentacion `ViewTabs`, `GroupTopTable` y `GroupComparisonChart`; `ComparisonPage` (cargada con `lazy`) hace dos `useApiResource` en paralelo y compone; `App` guarda `view`, monta el panel de vista y deja de pedir movimientos y alertas en la comparativa (DEC-12).

**Stack:** el de F1; Recharts 3.8.1 `BarChart`. Depende de F1 y F2 terminadas.

**Spec:** [README, F3](../../frontend/specs/README.md#f3---vista-comparativa-b2b-vs-b2c) y [components.md, F3](../../frontend/specs/components.md#f3---vista-comparativa-b2b-vs-b2c); disposicion en [DEC-19](../../frontend/specs/components.md#disposicion-de-la-pagina-v12-dec-19). Dudas abiertas en [decisions.md](decisions.md) (Q-01, Q-06 a Q-08, Q-17 a Q-20).

## Restricciones globales

Las de [F1](f1-plan.md#restricciones-globales), mas:

- Toda peticion de la vista lleva `operation_type=income`, `limit=5` y exactamente un `business_type` (INV-F3-1); orden `operation_type`, `limit`, `business_type`, `start_date`, `end_date`.
- Solo `categories/top`: nada de `/b2b`, `/b2c`, `/summary` ni filas desde `facets.categories`; sin filas de relleno.
- Sin router; un unico `DateRangePicker` fuera del panel de vista (INV-5).
- No cambian las firmas de `DashboardHeader`, `KPIRow` ni de los graficos existentes.
- Colores: B2B `var(--chart-1)`, B2C `var(--chart-5)`. Color por barra con la prop `shape` de `Bar` (`Cell` esta obsoleto en 3.8.1).
- Recharts no entra en el chunk principal (DEC-13, Q-08).

## Foco de revision

1. Un grupo cargando y el otro con error: el grafico muestra carga, no error (Tarea 4, test `prefers loading over error`).
2. Cambio rapido de pestana con peticiones en curso: al volver, la vista no muestra datos de otro filtro (cubierto por el hook de F1, test `keeps only the response of the current path`, y Tarea 5, test `refetches the dashboard with the current filter`).
3. Vista abierta con un filtro no pedible y sin resultado previo (Q-06): estados vacios, ninguna peticion (Tarea 5, test `opens with an invalid range`).
4. Un grupo sin ingresos y el otro con datos: tabla del otro intacta y barra `$0` (Tarea 5, test `isolates an empty group`; la barra, en la prueba visual por el limite de jsdom de Q-07).
5. Porcentajes que no suman 100 % por redondeo de presentacion: la suma de `share` sin redondear es 1 (Tarea 1, test INV-F3-2).

---

### Tarea 1: tipos y utilidades de F3

**Archivos:**
- Modificar: `frontend/src/lib/financial-types.ts`, `frontend/src/lib/financial-utils.ts`
- Test: `frontend/src/lib/financial-utils.test.ts`

**Interfaces:**
- Produce: `type AppView = 'dashboard' | 'comparison'`, `interface GroupCategoryRow { category: Category; total_amount: number; share: number }`, `interface GroupTotal { business_type: BusinessType; total_income: number }`, `toGroupRows(entries: TopCategoriesResponse): GroupCategoryRow[]`, `sumTotals(entries: TopCategoriesResponse): number`, `formatCategoryLabel(category: Category): string`.

- [ ] **Paso 1: tests que fallan.** Fixture B2B (verification.md): `sales` 557903.97 y `others` 57636.75, `operation_type: "income"`.

```ts
const rows = toGroupRows(b2b)
expect(rows.map((r) => r.category)).toEqual(["sales", "others"])  // orden de la API
expect(rows[0].share).toBeCloseTo(557903.97 / 615540.72, 10)
expect(rows[0].share + rows[1].share).toBeCloseTo(1, 10)          // INV-F3-2
expect(toGroupRows([])).toEqual([])
expect(toGroupRows([{ category: "sales", operation_type: "income", total_amount: 0 }])[0].share).toBe(0)
expect(sumTotals(b2b)).toBeCloseTo(615540.72, 2)                   // INV-F3-3
expect(sumTotals([])).toBe(0)
expect(formatCategoryLabel("sales")).toBe("Sales")
expect(formatCategoryLabel("others")).toBe("Others")
```

- [ ] **Paso 2:** `npm --prefix frontend test -- src/lib/financial-utils.test.ts` -> FAIL.
- [ ] **Paso 3:** implementar; `toGroupRows` usa `sumTotals` y devuelve `share = 0` si la suma es 0.
- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5:** commit `feat(f3): add group comparison types and utilities`.

### Tarea 2: `ViewTabs`

**Archivos:**
- Crear: `frontend/src/components/dashboard/view-tabs.tsx`
- Test: `frontend/src/components/dashboard/view-tabs.test.tsx` (jsdom)

**Interfaces:**
- Produce: `ViewTabs({ view, onChange }: ViewTabsProps)`.

- [ ] **Paso 1: tests que fallan:**
  - `renders a tablist with two tabs`: `role="tablist"`; dos `button role="tab"` con textos `Dashboard` y `B2B vs B2C`, `id` `tab-dashboard` y `tab-comparison`, ambos `aria-controls="view-panel"`; con `view="dashboard"`, `aria-selected` es `"true"` y `"false"`.
  - `reports the selected view`: clic en `B2B vs B2C` -> `onChange("comparison")`.
- [ ] **Paso 2:** `npm --prefix frontend test -- src/components/dashboard/view-tabs.test.tsx` -> FAIL.
- [ ] **Paso 3:** implementar sin navegacion por flechas (DEC-10); aspecto segun Q-17.
- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5:** commit `feat(f3): add ViewTabs`.

### Tarea 3: `GroupTopTable`

**Archivos:**
- Crear: `frontend/src/components/dashboard/group-top-table.tsx`
- Test: `frontend/src/components/dashboard/group-top-table.test.tsx` (jsdom)

**Interfaces:**
- Consume: `GroupCategoryRow`, `formatCategoryLabel`, `formatCurrency`, `formatPercent`.
- Produce: `GroupTopTable({ businessType, rows, loading, error }: GroupTopTableProps)`.

- [ ] **Paso 1: tests que fallan** (`rows = toGroupRows(b2b)`):
  - `renders title, description and rows`: `h2` `B2B - Top income categories`; texto `Top 5 categories by total income`; cabeceras `Category`, `Total income`, `Share of group`; primera fila `Sales`, `$557,904`, `90.6%`; exactamente 2 filas en `tbody` (AC-F3-07).
  - `shows the empty state without a table`: `rows=[]` -> `role="status"` con `No income in the selected range for B2B.`; sin `table`; titulo visible (Q-19).
  - `shows three skeleton rows while loading`: titulo y descripcion visibles; 3 `tr` con skeleton.
  - `shows the group error`: `error` con `businessType="B2C"` -> `role="alert"` con `Could not load B2C income data.`; sin `table`.
  - `prefers loading over error`: ambos -> skeleton, sin `role="alert"`.
- [ ] **Paso 2:** `npm --prefix frontend test -- src/components/dashboard/group-top-table.test.tsx` -> FAIL.
- [ ] **Paso 3:** implementar con el mismo estilo de tabla y aviso rojo que `AlertsTable` (DEC-29, Q-15).
- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5:** commit `feat(f3): add GroupTopTable`.

### Tarea 4: `GroupComparisonChart`

**Archivos:**
- Crear: `frontend/src/components/dashboard/group-comparison-chart.tsx`
- Test: `frontend/src/components/dashboard/group-comparison-chart.test.tsx` (jsdom)

**Interfaces:**
- Consume: `GroupTotal`, `formatCurrency`.
- Produce: `GroupComparisonChart({ totals, loading, error }: GroupComparisonChartProps)`. `totals` llega siempre como `[B2B, B2C]`.

- [ ] **Paso 1: tests que fallan** (jsdom no pinta barras: Q-07):
  - `uses the existing chart loading markup`: `loading` -> sin texto `Income: B2B vs B2C`, skeleton `h-[280px]`.
  - `shows the comparison error`: `error` -> `role="alert"` con `Could not load the comparison.`
  - `prefers loading over error` (AC-F3-18): ambos -> sin `role="alert"`.
  - `shows the empty state when both totals are zero`: `[{B2B,0},{B2C,0}]` -> `role="status"` con `No income to compare in the selected range.`
  - `renders the chart card when one group has income`: `[{B2B,0},{B2C,642606.15}]` -> `h2` `Income: B2B vs B2C`, sin `role="status"`.
- [ ] **Paso 2:** `npm --prefix frontend test -- src/components/dashboard/group-comparison-chart.test.tsx` -> FAIL.
- [ ] **Paso 3:** implementar: `BarChart` con `title="Income: B2B vs B2C"` y `desc="Total income of B2B and B2C in the selected range."`; `XAxis dataKey="business_type"`; `YAxis` con `formatCurrency`; `<Bar dataKey="total_income" name="Income">` con color por grupo via `shape`; etiqueta `$0`/total segun Q-07; tooltip y alto segun Q-20.
- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5:** commit `feat(f3): add GroupComparisonChart`.

### Tarea 5: `ComparisonPage`, pestanas y panel de vista en `App`

**Archivos:**
- Crear: `frontend/src/components/dashboard/comparison-page.tsx`
- Modificar: `frontend/src/App.tsx`, `frontend/src/App.test.tsx`

**Interfaces:**
- Consume: `useApiResource`, `buildQuery`, `getDateRangeIssue`, `DateBounds` (F1); Tareas 1-4.
- Produce: `ComparisonPage({ filter, bounds }: ComparisonPageProps)`, exportada tambien como `default` para `lazy`.

Comportamiento: `ComparisonPage` calcula la ruta de cada grupo (`/api/metrics/categories/top` + `buildQuery({ operation_type: "income", limit: 5, business_type, start_date, end_date })`) o `null` si `getDateRangeIssue(filter, bounds) !== null`. Sin resultado previo y con ruta `null`, `rows=[]` y totales 0: estados vacios (DEC-14, Q-06). El grafico: `loading` si algun grupo carga; `error` si alguno fallo. `App`: estado `view`; disposicion de DEC-19 (`ViewTabs`, picker, `div id="view-panel" role="tabpanel" aria-labelledby`); en la comparativa las rutas de movimientos y alertas son `null` y no se muestran banner ni `No movements found...` (DEC-12, DEC-15). `Suspense` con el fallback de Q-08 dentro de las dos `section` (`Income by business type`, `Income comparison`).

- [ ] **Paso 1: tests que fallan** (`describe("F3 B2B vs B2C view")`; `routeFetch` responde `top` segun `business_type`):
  - `starts on the dashboard tab` (AC-F3-01): `Dashboard` con `aria-selected="true"`; `tabpanel` con `aria-labelledby="tab-dashboard"`.
  - `requests both groups when the view opens` (AC-F3-04): clic en `B2B vs B2C` -> `requested` contiene `/api/metrics/categories/top?operation_type=income&limit=5&business_type=B2B` y la de `B2C`; filas `Sales` en ambos paneles.
  - `replaces the dashboard content` (AC-F3-02): en la comparativa no hay `section` `Key performance indicators` ni `Anomaly alerts`; el grupo `Date range` sigue presente.
  - `sends the shared filter to both groups`: start `2026-01-01` en la comparativa -> ambas URLs con `&start_date=2026-01-01`.
  - `does not request dashboard data while comparing` (AC-F3-15): en la comparativa, cambiar start -> ninguna URL nueva de `/api/metrics?` ni de alertas.
  - `refetches the dashboard with the current filter` (AC-F3-03, AC-F3-15): volver a `Dashboard` -> se piden `/api/metrics?start_date=2026-01-01` y `/api/metrics/alerts?threshold=0.3&start_date=2026-01-01`; los inputs conservan `2026-01-01`.
  - `keeps the last result on an invalid range` (AC-F3-05): tras cargar, rango invertido -> ninguna URL nueva de `top`; filas visibles.
  - `opens with an invalid range` (AC-F3-16, Q-06): rango invertido antes de abrir -> ninguna URL de `top`; `No income in the selected range for B2B.`, la de `B2C` y `No income to compare in the selected range.`
  - `isolates an empty group` (AC-F3-08): B2B `[]` -> su mensaje; B2C con filas.
  - `isolates a failed group` (AC-F3-13): B2C 500 -> `Could not load B2C income data.` y `Could not load the comparison.`; B2B con filas.
  - `hides dashboard notices while comparing` (AC-F3-17): movimientos 500 -> en la comparativa no aparece `No se pudo cargar`.
- [ ] **Paso 2:** `npm --prefix frontend test -- src/App.test.tsx` -> FAIL en los nuevos.
- [ ] **Paso 3:** implementar `comparison-page.tsx` y los cambios de `App.tsx`.
- [ ] **Paso 4:** mismo comando -> PASS; `npm --prefix frontend test` completo -> PASS.
- [ ] **Paso 5:** commit `feat(f3): add the B2B vs B2C comparison view`.

### Tarea 6: verificacion de F3 y parada para la prueba visual

Sigue [verify-frontend-change](../../.skills/verify-frontend-change/SKILL.md).

- [ ] `git diff --stat` muestra los archivos de F3.
- [ ] Lint, tests completos y build. El build debe mostrar un chunk propio para `comparison-page` y el principal sin aviso de 500 kB (DEC-13); comparar tamanos con F2.
- [ ] Mutaciones (Q-11): (1) omitir `operation_type=income`; (2) pedir movimientos en la comparativa; (3) mostrar error del grafico mientras un grupo carga; (4) rellenar filas hasta 5; (5) importar `GroupComparisonChart` sin `lazy` (el build vuelve a avisar del chunk). Cada una con lo que falla y restauracion.
- [ ] `curl -s http://localhost:5173/src/App.tsx | grep -c ComparisonPage` > 0 (si no, reiniciar el contenedor `frontend`).
- [ ] Registrar y **parar** para la prueba visual. Lista: pestanas y foco con teclado; dos columnas en escritorio y apiladas en estrecho; colores de las barras; etiquetas de importe y barra `$0` acotando fechas hasta que un grupo quede sin ingresos (AC-F3-09, AC-F3-10); sin salto de altura al abrir la vista por primera vez (DEC-23).
