# F3 - Vista comparativa B2B vs B2C: plan de implementacion

**Objetivo:** pestanas `Dashboard` / `B2B vs B2C` por estado y una vista con las categorias de ingreso de cada grupo en dos tablas y un grafico de dos barras, desde `GET /api/metrics/categories/top`.

**Arquitectura:** tipos en `financial-types.ts` y utilidades en `financial-utils.ts` (DEC-21); componentes de presentacion `ViewTabs`, `GroupTopTable` y `GroupComparisonChart`; `ComparisonPage` (cargada con `lazy`) hace dos `useApiResource` en paralelo y compone; `App` guarda `view`, monta el panel de vista y deja de pedir movimientos y alertas en la comparativa (DEC-12).

**Stack:** el de F1; Recharts 3.8.1 `BarChart`. Depende de F1 y F2 terminadas.

**Spec:** [README, F3](../../frontend/specs/README.md#f3---vista-comparativa-b2b-vs-b2c) y [components.md, F3](../../frontend/specs/components.md#f3---vista-comparativa-b2b-vs-b2c); disposicion en [DEC-19](../../frontend/specs/components.md#disposicion-de-la-pagina-v12-dec-19) y presentacion en [DEC-40](../../frontend/specs/components.md#presentacion-de-f3-v19-dec-40). Spec v1.10. La v1.9 cierra las dudas de la etapa 1 que afectan a F3 (Q-01, Q-06 a Q-08 y Q-17 a Q-20) y la v1.10 las de la v1.9 (Q-22 a Q-24). Las de proceso (Q-10 a Q-12) las respondio el mantenedor. No queda ninguna abierta ([decisions.md](decisions.md)).

## Cambios respecto a la version anterior

### Spec v1.9 a v1.10

- Tarea 4: el vacio del grafico queda fijado por DEC-43. Es la propuesta que el plan ya seguia, asi que la clase y el test no cambian; solo se cambia la referencia de Q-24 a DEC-43. En el error, el titulo visible se deduce de la fila `Errores` de DEC-40 (ver Q-24 en decisions.md).
- Tarea 5: "sin resultado previo" cuenta desde que se abre la vista (DEC-42). El test `shows empty states when it reopens with an invalid filter` tiene un unico resultado esperado y se quita la alternativa (b).

### Spec v1.8 a v1.9

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
  - `shows the comparison error`: `error` -> `role="alert"` con `Could not load the comparison.`; titulo visible (DEC-40, fila `Errores`).
  - `prefers loading over error` (AC-F3-18): ambos -> sin `role="alert"`.
  - `shows the empty state when both totals are zero`: `[{B2B,0},{B2C,0}]` -> `role="status"` con `No income to compare in the selected range.`; titulo y descripcion visibles (DEC-43).
  - `renders the chart card when one group has income`: `[{B2B,0},{B2C,642606.15}]` -> `h2` `Income: B2B vs B2C`, descripcion visible `Total income of B2B and B2C in the selected range.` (DEC-39), sin `role="status"`.
- [ ] **Paso 2:** `npm --prefix frontend test -- src/components/dashboard/group-comparison-chart.test.tsx` -> FAIL.
- [ ] **Paso 3:** implementar: `BarChart` con `title="Income: B2B vs B2C"` y `desc="Total income of B2B and B2C in the selected range."`; `XAxis dataKey="business_type"`; `YAxis` con `formatCurrency`; `<Bar dataKey="total_income" name="Income">` con color por grupo via `shape`.
  - Etiquetas: `LabelList` con `position="top"` y `formatCurrency` (DEC-38), con margen superior en el `BarChart` para que la etiqueta de la barra mas alta no se corte.
  - Cabecera: `CardDescription` con el texto de `desc` bajo el titulo (DEC-39).
  - Area: `ResponsiveContainer` de 280 px, sin `Legend`, tooltip con el estilo de los graficos existentes (DEC-39).
  - Error: aviso rojo de DEC-29 centrado en un area `h-[280px]` (DEC-40).
  - Vacio (DEC-43): el patron de los graficos existentes (`flex h-[280px] items-center justify-center text-sm text-muted-foreground`), con titulo y descripcion visibles.
- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5:** commit `feat(f3): add GroupComparisonChart`.

### Tarea 5: `ComparisonPage`, pestanas y panel de vista en `App`

**Archivos:**
- Crear: `frontend/src/components/dashboard/comparison-page.tsx`
- Modificar: `frontend/src/App.tsx`, `frontend/src/App.test.tsx`

**Interfaces:**
- Consume: `useApiResource`, `buildQuery`, `getDateRangeIssue`, `DateBounds` (F1); Tareas 1-4.
- Produce: `ComparisonPage({ filter, bounds }: ComparisonPageProps)`, exportada tambien como `default` para `lazy`.

Comportamiento: `ComparisonPage` calcula la ruta de cada grupo (`/api/metrics/categories/top` + `buildQuery({ operation_type: "income", limit: 5, business_type, start_date, end_date })`) o `null` si `getDateRangeIssue(filter, bounds) !== null`. Sin resultado previo y con ruta `null`, `rows=[]` y totales 0: estados vacios (DEC-14, DEC-35). "Sin resultado previo" cuenta desde que se abre la vista, que se desmonta al cambiar de pestana (DEC-42). El grafico: `loading` si algun grupo carga; `error` si alguno fallo. Paneles en `grid grid-cols-1 xl:grid-cols-2` (DEC-40). `App`: estado `view`; disposicion de DEC-19 (`ViewTabs`, picker, `div id="view-panel" role="tabpanel" aria-labelledby`); en la comparativa las rutas de movimientos y alertas son `null` y no se muestran banner ni `No movements found...` (DEC-12, DEC-15). `Suspense` con el fallback de DEC-36 dentro de las dos `section` (`Income by business type`, `Income comparison`): dos `GroupTopTable` con `loading` y `ChartFallback`, sin importar `GroupComparisonChart`.

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
  - `shows empty states when it reopens with an invalid filter` (DEC-42): abrir con filtro valido (filas visibles), volver a `Dashboard`, invertir el rango y abrir otra vez -> ninguna URL nueva de `top`; los tres estados vacios.
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

Reglas leidas antes de editar: WF, FIN (porcentajes y totales de grupo), API (consumo de `categories/top`), CAL (solo se reutiliza `getDateRangeIssue`, sin tocar fechas) y FE. DX no aplica (sin cambios de configuracion). Base de F3: commit `efa1456` (ultimo de F2), con 65 tests en 6 archivos y lint limpio. Todas las comparaciones de esta fase son contra ese commit.

### Tarea 1 (2026-11-20)

- Rojo: `npm --prefix frontend test -- src/lib/financial-utils.test.ts` -> 3 fallidos, 11 pasados: `toGroupRows is not a function`, `sumTotals is not a function` y `formatCategoryLabel is not a function`.
- Verde: mismo comando -> 14 pasados. Lint y `npx tsc -b` sin errores.

### Tarea 2 (2026-11-20)

- Rojo: `npm --prefix frontend test -- src/components/dashboard/view-tabs.test.tsx` -> `Failed to resolve import "./view-tabs"`, porque el componente aun no existe.
- Verde: mismo comando -> 2 pasados. ESLint de los dos archivos y `npx tsc -b` sin errores.

### Tarea 3 (2026-11-20)

- Rojo: `npm --prefix frontend test -- src/components/dashboard/group-top-table.test.tsx` -> `Failed to resolve import "./group-top-table"`, porque el componente aun no existe.
- El aviso rojo de DEC-29 pasa de la funcion local de `alerts-table.tsx` a `error-notice.tsx` (`ErrorNotice`), para usarlo tambien en `GroupTopTable` y en el grafico. El marcado no cambia. `DateRangePicker` conserva su propio marcado (F1, sin tocar).
- Verde: `npm --prefix frontend test -- src/components/dashboard/group-top-table.test.tsx src/components/dashboard/alerts-table.test.tsx` -> 13 pasados (5 nuevos y los 8 de `AlertsTable`, que siguen pasando tras mover `ErrorNotice`). ESLint de `src/components/dashboard/` y `npx tsc -b` sin errores.

### Tarea 4 (2026-11-20)

- Rojo: `npm --prefix frontend test -- src/components/dashboard/group-comparison-chart.test.tsx` -> `Failed to resolve import "./group-comparison-chart"`, porque el componente aun no existe.
- Color por barra con `shape={(props: BarShapeProps) => <Rectangle {...props} fill=... />}` (tipos de `recharts` 3.8.1: `BarShapeProps` trae `index`); `Cell` esta marcado como obsoleto en esa version.
- Verde: mismo comando -> 5 pasados. ESLint de `src/components/dashboard/` y `npx tsc -b` sin errores. En jsdom el grafico no pinta barras (`ResponsiveContainer` mide 0 px): etiquetas, colores y tooltip quedan para la prueba visual.

### Tarea 5 (2026-11-20)

- Montaje de los tests: `routeFetch` pasa la URL al handler (`type Handler = (url: string) => Promise<Response>`), para que `top` responda segun `business_type`; los handlers existentes ignoran el argumento. Fixtures de `top` tomados de verification.md (B2B 557903.97 y 57636.75; B2C 574193.41 y 68412.74).
- Las esperas que incluyen la primera carga del chunk diferido de `ComparisonPage` (con Recharts) usan `{ timeout: 3000 }`, por la misma causa demostrada en Q-26 de F2.
- Rojo: `npm --prefix frontend test -- src/App.test.tsx` -> 13 fallidos (los nuevos) y 22 pasados (los existentes). Motivo: `B2B vs B2C tab not found` (12) y `Dashboard tab not found` (1), porque aun no hay pestanas.
- Verde: mismo comando -> 35 pasados. Suite completa `npm --prefix frontend test` -> 9 archivos, 93 pasados (65 de F2 + 3 + 2 + 5 + 5 + 13 de F3). Lint y `npx tsc -b` sin errores.
- Q-10: ninguna expectativa existente cambia. La lista de `h2` y las `section` con `aria-busy` del dashboard siguen igual, porque `ViewTabs` no tiene `h2` y la vista comparativa no se monta en esos tests.

### Tarea 6: verificacion (2026-11-20)

**Cambio presente.** `git diff --stat efa1456 -- frontend/` (ultimo commit de F2 en esta rama) muestra 14 archivos de `frontend/src` (911 inserciones, 75 borrados): los 9 nuevos de F3 (`view-tabs`, `group-top-table`, `group-comparison-chart` y sus tests, `comparison-page.tsx` y `error-notice.tsx`), `App.tsx`, `App.test.tsx`, `alerts-table.tsx` (solo usa `ErrorNotice`), `financial-types.ts`, `financial-utils.ts` y su test. Commits `09af430`, `0cac710`, `94fa240`, `3148311` y `da069ec`.

**Comandos:**

| Comando | Resultado |
| --- | --- |
| `npm --prefix frontend run lint` | Sin errores ni avisos |
| `npm --prefix frontend test` | 9 archivos, 93 tests pasados (F2: 6 archivos, 65) |
| `npm --prefix frontend run build` | Exit 0, sin avisos; chunk propio `comparison-page-*.js` |

Tamanos del build frente a F2:

| Chunk | F2 | F3 | Diferencia |
| --- | --- | --- | --- |
| Principal `index-*.js` | 194.44 kB (gzip 61.74 kB) | 193.90 kB (gzip 61.33 kB) | -0.54 kB: `ViewTabs` y el fallback entran, pero `use-api-resource` pasa a un chunk compartido |
| `comparison-page-*.js` | - | 20.61 kB (gzip 7.21 kB) | Nuevo: pagina, tablas y grafico de F3 |
| `use-api-resource-*.js` | - | 3.82 kB | Nuevo chunk compartido entre el principal y `comparison-page` |
| Compartido `skeleton-*.js` | 40.99 kB | 41.29 kB | +0.30 kB |
| Recharts | `LineChart-*.js` 342.29 kB | `CartesianChart-*.js` 330.74 kB + `LineChart-*.js` 14.59 kB | Vite separa la parte comun a lineas y barras |
| Graficos de lineas | 9.86 y 6.69 kB | 9.93 y 6.74 kB | Sin cambio relevante |

El `index.html` del build limpio solo precarga `skeleton-*.js` y `use-api-resource-*.js`, y el chunk principal solo importa esos dos: Recharts no se carga al abrir la pagina.

**Mutaciones (Q-11).** Script en el scratchpad: aplica cada rotura (una o varias sustituciones), ejecuta `npx vitest run` completo (o el build en la 5) y restaura con `git checkout -- <archivo>` en un `finally`. Al final `git status --short src` quedo vacio y se borro el directorio del build de la mutacion.

| # | Rotura | Que fallo |
| --- | --- | --- |
| 1 | Sin `operation_type: 'income'` en `topPath` | `requests both groups when the view opens` y `sends the shared filter to both groups` |
| 2 | Ruta de movimientos solo con `dateIssue === null` (se pide tambien en la comparativa) | `does not request dashboard data while comparing` |
| 3 | El grafico muestra el error mientras carga (`if (loading && !error)`) | `GroupComparisonChart > prefers loading over error` |
| 4 | Filas rellenadas hasta 5 en `GroupTopTable` | `GroupTopTable > renders title, description and rows` |
| 5 | `GroupComparisonChart` importado en `App` (en el fallback) sin `lazy` | El build **no** avisa: ver abajo y [Q-27](decisions.md#q-27-como-comprobar-la-mutacion-5-sin-el-aviso-de-500-kb) |
| 6 | `ComparisonPage` solo bloquea `inverted` (`!== 'inverted'`) | `opens with an out-of-bounds date` |

Mutacion 5, salida del build con la rotura (`npx vite build --outDir ../.f3-mutation-dist`):

- Exit 0, sin aviso de chunk mayor de 500 kB. El chunk principal mide 193.92 kB (como sin la rotura) y `comparison-page-*.js` baja a 1.05 kB.
- **Lo que si cambia:** el chunk principal importa estaticamente `CartesianChart-*.js` (372.33 kB, Recharts mas el grafico de barras) y `index.html` lo precarga con `modulepreload`. Recharts vuelve a descargarse al abrir la pagina, que es lo que DEC-13 quiere evitar, pero repartido en un chunk aparte que no supera 500 kB.
- Causa: con la division de chunks actual (Vite 8.0.8), Recharts va a un chunk compartido en lugar de al principal, asi que el aviso de 500 kB que menciona DEC-13 ya no aparece. El plan espera ese aviso como prueba; anotado como Q-27, sin decidir el criterio.

**App en Docker:**

- `docker compose ps`: `backend` y `frontend` arriba.
- Primera comprobacion: `curl -s http://localhost:5173/src/App.tsx | grep -c ComparisonPage` -> 0. Tambien 0 para `error-notice` en `alerts-table.tsx` y `toGroupRows` en `financial-utils.ts`; los archivos nuevos (`comparison-page.tsx`) si se servian.
  - **Causa demostrada:** `docker compose exec -T frontend grep -c ComparisonPage src/App.tsx` -> 3. El contenedor tiene el archivo nuevo y Vite servia la version anterior de los modulos modificados, la misma trampa que en F1 y F2.
  - `docker compose restart frontend` -> `ComparisonPage` 6, `error-notice` 1, `toGroupRows` 1. `AppView` en `financial-types.ts` da 0 tambien despues: es un tipo y no llega al JS servido.
- Proxy: `curl -s 'http://localhost:5173/api/metrics/categories/top?operation_type=income&limit=5&business_type=B2B'` -> `sales` 557903.97 y `others` 57636.75.

**Valores esperados para la prueba visual.** Pedidos al backend (`http://localhost:8000/api/metrics/categories/top?operation_type=income&limit=5&business_type=...`) y formateados en Node con `Intl.NumberFormat` (USD, 0 decimales) y `toFixed(1)`, como la app. Los dias con ingresos de un solo grupo salen de `GET /api/metrics`. Dependen de la fecha de hoy.

| Filtro | B2B | B2C | Grafico |
| --- | --- | --- | --- |
| Sin filtro | `Sales` $557,904 90.6%; `Others` $57,637 9.4% | `Sales` $574,193 89.4%; `Others` $68,413 10.6% | $615,541 y $642,606 |
| `2026-01-01` a `2026-01-31` | `Sales` $30,201 79.1%; `Others` $7,968 20.9% | `Sales` $54,070 87.8%; `Others` $7,508 12.2% | $38,169 y $61,578 |
| `2025-11-01` a `2025-11-01` | `No income in the selected range for B2B.` | `Sales` $5,466 100.0% | barra B2B con `$0` y B2C $5,466 |
| `2025-11-02` a `2025-11-02` | `Sales` $5,260 100.0% | `No income in the selected range for B2C.` | B2B $5,260 y barra B2C con `$0` |
| `2025-11-05` a `2025-11-05` | vacio | vacio | `No income to compare in the selected range.` |

**Revision final:** autorrevision del diff `efa1456..HEAD` en `frontend/src`. No se lanzo un revisor independiente porque en esta sesion solo se lanzan agentes si el mantenedor lo pide. Sin hallazgos que corregir.

**Limites:**

- En jsdom el grafico no pinta barras, etiquetas ni tooltip (`ResponsiveContainer` mide 0 px): colores, etiquetas `$0` (DEC-38) y tooltip quedan para la prueba visual.
- El aspecto de las pestanas, el foco con teclado, las dos columnas desde 1280 px y la ausencia de salto de altura (DEC-23, DEC-39, DEC-40) no los cubren los tests.
- No se probo con un lector de pantalla real, ni con zoom, ni en navegadores distintos del de la prueba visual.
