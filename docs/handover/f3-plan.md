# F3 - Vista comparativa B2B vs B2C: plan de implementacion

**Objetivo:** pestanas `Dashboard` / `B2B vs B2C` por estado y una vista con las categorias de ingreso de cada grupo en dos tablas y un grafico de dos barras, desde `GET /api/metrics/categories/top`.

**Arquitectura:** tipos en `financial-types.ts` y utilidades en `financial-utils.ts` (DEC-21); componentes de presentacion `ViewTabs`, `GroupTopTable` y `GroupComparisonChart`; `ComparisonPage` (cargada con `lazy`) hace dos `useApiResource` en paralelo y compone; `App` guarda `view`, monta el panel de vista y deja de pedir movimientos y alertas en la comparativa (DEC-12).

**Stack:** el de F1; Recharts 3.8.1 `BarChart`. Depende de F1 y F2 terminadas.

**Spec:** [README, F3](../../frontend/specs/README.md#f3---vista-comparativa-b2b-vs-b2c) y [components.md, F3](../../frontend/specs/components.md#f3---vista-comparativa-b2b-vs-b2c); disposicion en [DEC-19](../../frontend/specs/components.md#disposicion-de-la-pagina-v12-dec-19) y presentacion en [DEC-40](../../frontend/specs/components.md#presentacion-de-f3-v19-dec-40). La v1.9 cierra las dudas de la etapa 1 que afectan a F3 (Q-01, Q-06 a Q-08 y Q-17 a Q-20). Abiertas: Q-22, Q-23 y Q-24 ([decisions.md](decisions.md)).

## Cambios respecto a la version anterior (spec v1.8 a v1.9)

- Tarea 2: aspecto de `ViewTabs` de DEC-40, en lugar de la propuesta Q-17 (sin alto de 44 px).
- Tarea 3: en la carga de `GroupTopTable` no se pinta tabla: hay 3 barras `Skeleton` `h-5` (DEC-40). El test de carga cambia: comprueba que no hay `table` y que hay 3 skeletons. La tabla usa el estilo de la de alertas.
- Tarea 4: cambios del grafico.
  - Etiqueta con el importe encima de cada barra (DEC-38).
  - Descripcion visible bajo el titulo, 280 px, sin leyenda y tooltip como los existentes (DEC-39).
  - Error centrado en el area de 280 px (DEC-40).
  - Vacio segun Q-24, abierta.
  - El test con datos comprueba la descripcion.
- Tarea 5: cambios en la vista y en `App`.
  - Paneles en dos columnas desde `xl` (DEC-40; la propuesta Q-18 decia `lg`).
  - Fallback de `Suspense` fijado por DEC-36.
  - Estados vacios con cualquier filtro no pedible (DEC-35), con el test nuevo `opens with an out-of-bounds date`.
  - Test nuevo `shows empty states when it reopens with an invalid filter`, que depende de Q-23.
- Proceso. Q-11: hay una mutacion nueva (6) y cada mutacion se registra con el test que fallo. Q-12: se anade al final la seccion `Registro de ejecucion`. Q-10: la lista de `h2` y las `section` con `aria-busy` de la vista `Dashboard` no cambian en F3; si alguna expectativa existente cambiara, se actualiza en la Tarea 5 sin relajarla.

## Restricciones globales

Las de [F1](f1-plan.md#restricciones-globales), mas:

- Toda peticion de la vista lleva `operation_type=income`, `limit=5` y exactamente un `business_type` (INV-F3-1); orden `operation_type`, `limit`, `business_type`, `start_date`, `end_date`.
- Solo `categories/top`: nada de `/b2b`, `/b2c`, `/summary` ni filas desde `facets.categories`; sin filas de relleno.
- Sin router; un unico `DateRangePicker` fuera del panel de vista (INV-5).
- No cambian las firmas de `DashboardHeader`, `KPIRow` ni de los graficos existentes.
- Colores: B2B `var(--chart-1)`, B2C `var(--chart-5)`. Color por barra con la prop `shape` de `Bar` (`Cell` esta obsoleto en 3.8.1).
- Recharts no entra en el chunk principal (DEC-13, DEC-36).

## Foco de revision

1. Un grupo cargando y el otro con error: el grafico muestra carga, no error (Tarea 4, test `prefers loading over error`).
2. Cambio rapido de pestana con peticiones en curso: al volver, la vista no muestra datos de otro filtro (cubierto por el hook de F1, test `keeps only the response of the current path`, y Tarea 5, test `refetches the dashboard with the current filter`).
3. Vista abierta con un filtro no pedible y sin resultado previo (DEC-35): estados vacios, ninguna peticion (Tarea 5, tests `opens with an invalid range` y `opens with an out-of-bounds date`).
4. Un grupo sin ingresos y el otro con datos: tabla del otro intacta y barra con etiqueta `$0` (DEC-38). Lo cubren el test `isolates an empty group` de la Tarea 5 y, para la etiqueta, la prueba visual: en jsdom `ResponsiveContainer` mide 0 px y no pinta barras.
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
- [ ] **Paso 3:** implementar sin navegacion por flechas (DEC-10), con el aspecto de la [presentacion de F3](../../frontend/specs/components.md#presentacion-de-f3-v19-dec-40) (DEC-40):
  - `tablist` con `flex border-b border-border`.
  - Cada pestana: `px-4 py-2 text-sm font-medium border-b-2 -mb-px` y anillo `focus-visible:ring-2 focus-visible:ring-ring`.
  - Activa: `border-primary text-foreground`.
  - Inactiva: `border-transparent text-muted-foreground hover:text-foreground`.
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
  - `shows the empty state without a table`: `rows=[]` -> `role="status"` con `No income in the selected range for B2B.`; sin `table`; titulo y descripcion visibles (DEC-40).
  - `shows three skeleton bars while loading` (DEC-17, DEC-40): titulo y descripcion visibles; exactamente 3 `[data-slot="skeleton"]`; sin `table`.
  - `shows the group error`: `error` con `businessType="B2C"` -> `role="alert"` con `Could not load B2C income data.`; sin `table`.
  - `prefers loading over error`: ambos -> skeleton, sin `role="alert"`.
- [ ] **Paso 2:** `npm --prefix frontend test -- src/components/dashboard/group-top-table.test.tsx` -> FAIL.
- [ ] **Paso 3:** implementar con el estilo de la tabla de alertas (DEC-40): cuerpo `text-sm`, cabecera `text-xs uppercase font-medium text-muted-foreground`, `Category` a la izquierda y `Total income` y `Share of group` a la derecha, filas con `border-t border-border/60` y celdas `py-2`. Fuera de la tabla:
  - carga: 3 `Skeleton className="h-5 w-full"`;
  - vacio: texto `text-sm text-muted-foreground`;
  - error: aviso rojo de DEC-29.
- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5:** commit `feat(f3): add GroupTopTable`.

### Tarea 4: `GroupComparisonChart`

**Archivos:**
- Crear: `frontend/src/components/dashboard/group-comparison-chart.tsx`
- Test: `frontend/src/components/dashboard/group-comparison-chart.test.tsx` (jsdom)

**Interfaces:**
- Consume: `GroupTotal`, `formatCurrency`.
- Produce: `GroupComparisonChart({ totals, loading, error }: GroupComparisonChartProps)`. `totals` llega siempre como `[B2B, B2C]`.

- [ ] **Paso 1: tests que fallan** (en jsdom `ResponsiveContainer` mide 0 px y no pinta barras ni etiquetas; DEC-38 se comprueba en la prueba visual):
  - `uses the existing chart loading markup`: `loading` -> sin texto `Income: B2B vs B2C`, skeleton `h-[280px]`.
  - `shows the comparison error`: `error` -> `role="alert"` con `Could not load the comparison.`; titulo visible (Q-24).
  - `prefers loading over error` (AC-F3-18): ambos -> sin `role="alert"`.
  - `shows the empty state when both totals are zero`: `[{B2B,0},{B2C,0}]` -> `role="status"` con `No income to compare in the selected range.`; titulo visible (Q-24).
  - `renders the chart card when one group has income`: `[{B2B,0},{B2C,642606.15}]` -> `h2` `Income: B2B vs B2C`, descripcion visible `Total income of B2B and B2C in the selected range.` (DEC-39), sin `role="status"`.
- [ ] **Paso 2:** `npm --prefix frontend test -- src/components/dashboard/group-comparison-chart.test.tsx` -> FAIL.
- [ ] **Paso 3:** implementar: `BarChart` con `title="Income: B2B vs B2C"` y `desc="Total income of B2B and B2C in the selected range."`; `XAxis dataKey="business_type"`; `YAxis` con `formatCurrency`; `<Bar dataKey="total_income" name="Income">` con color por grupo via `shape`.
  - Etiquetas: `LabelList` con `position="top"` y `formatCurrency` (DEC-38), con margen superior en el `BarChart` para que la etiqueta de la barra mas alta no se corte.
  - Cabecera: `CardDescription` con el texto de `desc` bajo el titulo (DEC-39).
  - Area: `ResponsiveContainer` de 280 px, sin `Legend`, tooltip con el estilo de los graficos existentes (DEC-39).
  - Error: aviso rojo de DEC-29 centrado en un area `h-[280px]` (DEC-40).
  - Vacio, con la propuesta (a) de Q-24: el patron de los graficos existentes (`flex h-[280px] items-center justify-center text-sm text-muted-foreground`), con titulo y descripcion visibles.
- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5:** commit `feat(f3): add GroupComparisonChart`.

### Tarea 5: `ComparisonPage`, pestanas y panel de vista en `App`

**Archivos:**
- Crear: `frontend/src/components/dashboard/comparison-page.tsx`
- Modificar: `frontend/src/App.tsx`, `frontend/src/App.test.tsx`

**Interfaces:**
- Consume: `useApiResource`, `buildQuery`, `getDateRangeIssue`, `DateBounds` (F1); Tareas 1-4.
- Produce: `ComparisonPage({ filter, bounds }: ComparisonPageProps)`, exportada tambien como `default` para `lazy`.

Comportamiento: `ComparisonPage` calcula la ruta de cada grupo (`/api/metrics/categories/top` + `buildQuery({ operation_type: "income", limit: 5, business_type, start_date, end_date })`) o `null` si `getDateRangeIssue(filter, bounds) !== null`. Sin resultado previo y con ruta `null`, `rows=[]` y totales 0: estados vacios (DEC-14, DEC-35). "Sin resultado previo" se refiere a la vista montada, porque se desmonta al cambiar de pestana (Q-23, propuesta (a)). El grafico: `loading` si algun grupo carga; `error` si alguno fallo. Paneles en `grid grid-cols-1 xl:grid-cols-2` (DEC-40). `App`: estado `view`; disposicion de DEC-19 (`ViewTabs`, picker, `div id="view-panel" role="tabpanel" aria-labelledby`); en la comparativa las rutas de movimientos y alertas son `null` y no se muestran banner ni `No movements found...` (DEC-12, DEC-15). `Suspense` con el fallback de DEC-36 dentro de las dos `section` (`Income by business type`, `Income comparison`): dos `GroupTopTable` con `loading` y `ChartFallback`, sin importar `GroupComparisonChart`.

- [ ] **Paso 1: tests que fallan** (`describe("F3 B2B vs B2C view")`; `routeFetch` responde `top` segun `business_type`):
  - `starts on the dashboard tab` (AC-F3-01): `Dashboard` con `aria-selected="true"`; `tabpanel` con `aria-labelledby="tab-dashboard"`.
  - `requests both groups when the view opens` (AC-F3-04): clic en `B2B vs B2C` -> `requested` contiene `/api/metrics/categories/top?operation_type=income&limit=5&business_type=B2B` y la de `B2C`; filas `Sales` en ambos paneles.
  - `replaces the dashboard content` (AC-F3-02): en la comparativa no hay `section` `Key performance indicators` ni `Anomaly alerts`; el grupo `Date range` sigue presente.
  - `sends the shared filter to both groups`: start `2026-01-01` en la comparativa -> ambas URLs con `&start_date=2026-01-01`.
  - `does not request dashboard data while comparing` (AC-F3-15): en la comparativa, cambiar start -> ninguna URL nueva de `/api/metrics?` ni de alertas.
  - `refetches the dashboard with the current filter` (AC-F3-03, AC-F3-15): volver a `Dashboard` -> se piden `/api/metrics?start_date=2026-01-01` y `/api/metrics/alerts?threshold=0.3&start_date=2026-01-01`; los inputs conservan `2026-01-01`.
  - `keeps the last result on an invalid range` (AC-F3-05): tras cargar, rango invertido -> ninguna URL nueva de `top`; filas visibles.
  - `opens with an invalid range` (AC-F3-16, DEC-35): rango invertido antes de abrir -> ninguna URL de `top`; `No income in the selected range for B2B.`, la de `B2C` y `No income to compare in the selected range.`
  - `opens with an out-of-bounds date` (AC-F3-16, DEC-35): con `facets` cargado, start `2030-01-01` antes de abrir -> ninguna URL de `top`; los mismos tres estados vacios.
  - `shows empty states when it reopens with an invalid filter` (Q-23, propuesta (a)): abrir con filtro valido (filas visibles), volver a `Dashboard`, invertir el rango y abrir otra vez -> ninguna URL nueva de `top`; los tres estados vacios. Con la opcion (b) el test esperaria las filas anteriores.
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
- [ ] Mutaciones (Q-11):
  1. Omitir `operation_type=income`.
  2. Pedir movimientos en la comparativa.
  3. Mostrar el error del grafico mientras un grupo carga.
  4. Rellenar filas hasta 5.
  5. Importar `GroupComparisonChart` sin `lazy`: el build vuelve a avisar del chunk.
  6. Pedir `top` con una fecha fuera de `bounds`: solo comprobar `inverted` en `ComparisonPage` (DEC-35).

  En el `Registro de ejecucion` se anota cada mutacion con el cambio, el test (o la salida del build) que fallo y la restauracion.
- [ ] `curl -s http://localhost:5173/src/App.tsx | grep -c ComparisonPage` > 0 (si no, reiniciar el contenedor `frontend`).
- [ ] Registrar en el [Registro de ejecucion](#registro-de-ejecucion) (Q-12) y **parar** para la prueba visual. Lista:
  - aspecto de las pestanas (DEC-40) y foco con teclado;
  - paneles en dos columnas desde 1280 px y en una por debajo (DEC-40);
  - colores de las barras;
  - descripcion visible del grafico (DEC-39);
  - etiqueta de importe en cada barra y `$0` acotando fechas hasta que un grupo quede sin ingresos (AC-F3-09, AC-F3-10, DEC-38);
  - sin salto de altura al abrir la vista por primera vez ni al terminar de cargar (DEC-23, DEC-39).

## Registro de ejecucion

Se rellena en la etapa 2 (Q-12): por tarea, cada comando con su resultado (tests, lint y build, con el tamano del chunk principal y del chunk de `comparison-page`), cada mutacion con el cambio, el test que fallo y la restauracion (Q-11), la comprobacion de que Vite sirve el codigo nuevo y los limites encontrados.
