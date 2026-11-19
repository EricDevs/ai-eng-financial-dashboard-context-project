# F3 - Vista comparativa B2B vs B2C: plan de implementacion

**Version:** 5.4 | **Fecha:** 2026-11-19 | **Estado:** version de entrega, sin codigo | **Spec:** v1.9

**Como ejecutar:** tarea por tarea y en orden; marcar cada paso (`- [ ]`) al completarlo. No empezar una tarea sin que la anterior tenga sus tests en verde. Cada test se ve fallar antes de implementar.

**Sobre esta version:** el plan dice que construir, con que interfaces y con que tests; no incluye el codigo. La version 4.0 (con codigo, sobre la spec 1.3) queda en el historial de git (commit `9297324`).

**Objetivo:** segunda vista, accesible con pestanas por estado, con las categorias de ingreso de B2B y B2C en paralelo y un grafico de dos barras con el total de cada grupo.

**Arquitectura:** utilidades puras (`toGroupRows`, `sumTotals`, `formatCategoryLabel`), tres componentes de presentacion (`ViewTabs`, `GroupTopTable`, `GroupComparisonChart`) y `ComparisonPage`, que hace dos `useApiResource` en paralelo. `App` guarda `view`, coloca las pestanas sobre el filtro compartido y carga `ComparisonPage` en diferido (DEC-13).

**Stack:** React 19.2, TypeScript ~6.0, Recharts 3.8 (`BarChart`), Vitest 4 + jsdom, Tailwind 4.

**Spec:** [components.md v1.8](../../frontend/specs/components.md) (DEC-30 a DEC-32 son de la tarjeta de alertas y no afectan a F3): F3, convenciones comunes (incluido el aspecto de los errores), regla unica de peticion, disposicion de la pagina y DEC-07, DEC-10 a DEC-21, DEC-23, DEC-26 y DEC-29. Evidencia de la API en [verification.md](../../frontend/specs/verification.md#f3---vista-comparativa-b2b-vs-b2c).

**Depende de:** [plan F1](f1-date-range-filter.md) y [plan F2](f2-anomaly-alerts.md) ejecutados.

**Reglas del proyecto:** WF, FE (componentes, grafico, tokens, tests), API (consumo de `/categories/top`), FIN (porcentaje y totales en cliente).

**Rama:** `feature/frontend-specs-v2-fase8-f3` desde `feature/frontend-specs-v2` con F1 y F2 integrados (ver [ROADMAP-Project-3](../entregables/ROADMAP-Project-3.md#9-ampliacion-v2-planes-implementacion-y-prueba-de-traspaso)). Commits solo con autorizacion del usuario (WF 8).

## Restricciones globales

- Sin router ni dependencias nuevas; `AppView = 'dashboard' | 'comparison'`.
- Cada peticion: `operation_type=income`, `limit=5`, exactamente un `business_type` (INV-F3-1), fechas si estan informadas, en el orden de DEC-07. Solo si `getDateRangeIssue(filter, bounds) === null` (DEC-26).
- Datos solo de `/categories/top`; nunca `/b2b`, `/b2c`, `/summary` ni `facets.categories`.
- De 0 a 5 filas, orden de la API, sin relleno; secciones B2B y luego B2C.
- Colores B2B `var(--chart-1)`, B2C `var(--chart-5)`; eje Y y tooltip con `formatCurrency`.
- Estados con precedencia `loading` > `error` > vacio > datos (DEC-16); errores `role="alert"`, vacios `role="status"` (DEC-18).
- Un unico selector de fechas (INV-5). Sin cambios de firma en `DashboardHeader`, `KPIRow` ni graficos existentes; sin backend.
- Errores de los paneles y del grafico con `ErrorNotice`, el aviso rojo compartido que extrae el plan F2 (DEC-29).
- Build sin aviso de chunk > 500 kB (DEC-13). Estilo de cada archivo como en F1.

## Mapa de archivos

| Archivo | Responsabilidad | Tarea |
| --- | --- | --- |
| `src/lib/financial-types.ts` | `AppView`, `GroupCategoryRow`, `GroupTotal` | 1 |
| `src/lib/financial-utils.ts` | `sumTotals`, `toGroupRows`, `formatCategoryLabel` | 1 |
| `src/components/dashboard/view-tabs.tsx` | Pestanas | 2 |
| `src/components/dashboard/group-top-table.tsx` | Panel de un grupo | 3 |
| `src/components/dashboard/group-comparison-chart.tsx` | Grafico de dos barras | 4 |
| `src/components/dashboard/comparison-page.tsx` | Peticiones de los dos grupos y composicion | 5 |
| `src/App.tsx` | Vista activa, panel de pestanas y carga diferida | 6 |

## Decisiones propias del plan (implementacion, no producto)

- jsdom no da tamano a `ResponsiveContainer`, asi que las barras no se dibujan en los tests: se prueban estados y textos; las barras, los colores y las etiquetas de importe (con el `$0` del grupo vacio, DEC-38) se observan en el navegador (Tarea 7).
- Color de cada barra con la prop `shape` de `Bar`, que recibe `index` y devuelve un `Rectangle` con el color de `totals[index].business_type`. `Cell` esta obsoleto en Recharts 3.8 y se retirara en la 4.0 (la iteracion 1 lo uso hasta el cambio de la spec 1.9).
- Fixture B2B verificada (verification.md): `sales` 557903.97 y `others` 57636.75; suma 615540.72 -> `Sales`, `$557,904`, `90.6%`; `Others`, `$57,637`, `9.4%`.
- El fallback de `Suspense` (DEC-23) reutiliza `GroupTopTable` con `loading` y el `ChartFallback` existente de `App`.
- La ruta de cada grupo se calcula con una funcion local de `comparison-page.tsx` (`topPath(filter, bounds, businessType)`).
- En `App.test.tsx`, las esperas que dependen de la vista comparativa usan `LAZY_CHARTS` (5 s): `ComparisonPage` se carga en diferido con Recharts, como los graficos de F1, y en jsdom tarda mas de 1 s en esta maquina.
- Cada `fetch` simulado devuelve su propio `Response`: el cuerpo solo se lee una vez, y los dos grupos se piden en paralelo. Para controlar el orden de llegada (test de la ultima respuesta) se usan compuertas `deferred<void>` que crean la respuesta al resolverse, no un `Response` compartido.
- En `App.test.tsx`, cambiar el filtro solo despues de que la pagina haya cargado (`renderLoaded`): el selector de fechas no existe antes del primer render.

## Foco de revision

1. **Un grupo falla y el otro esta vacio.**
2. **Respuesta pendiente al salir de la pestana:** no pinta nada ni genera errores en consola.
3. **Volver a `Dashboard` tras cambiar el filtro en la comparativa:** KPI y alertas se piden con el filtro nuevo (AC-F3-15).
4. **Total de grupo 0 con filas:** `share` 0, sin `NaN%`.
5. **Abrir la comparativa con un filtro no pedible:** sin peticiones y estados vacios (AC-F3-16).

---

### Tarea 1: Tipos y utilidades de grupo

**Archivos:** modificar `src/lib/financial-types.ts` y `src/lib/financial-utils.ts` (DEC-21); test `financial-utils.test.ts`.

**Interfaces (produce):** tipos de la spec; `sumTotals(entries)`: suma de `total_amount`, `0` si vacio; `toGroupRows(entries)`: filas con `share = total_amount / sumTotals(entries)` (`0` si la suma es `0`), en el orden recibido; `formatCategoryLabel(category)`: primera letra en mayuscula (DEC-11).

- [ ] **Paso 1: tests que fallan** (fixture B2B)

| Test | Entrada | Esperado |
| --- | --- | --- |
| `sums group totals` (INV-F3-3) | fixture; `[]` | ~`615540.72` (2 decimales); `0` |
| `builds rows with shares in API order` (INV-F3-2) | fixture; `[]` | categorias `sales`, `others`; `share[0]` ~ `557903.97 / 615540.72`; suma de `share` ~ `1`; `[]` |
| `uses a zero share when the group total is zero` | una fila con `total_amount` 0 | `share` 0 |
| `capitalizes category labels` | `sales`, `others` | `Sales`, `Others` |

- [ ] **Paso 2:** `npm --prefix frontend test -- src/lib/financial-utils.test.ts` -> FAIL.
- [ ] **Paso 3: implementar** (`toGroupRows` reutiliza `sumTotals`).
- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5: commit** `feat(f3): add group rows and totals helpers`.

### Tarea 2: Componente `ViewTabs`

**Archivos:** crear `src/components/dashboard/view-tabs.tsx`; test `view-tabs.test.tsx` (jsdom).

**Interfaces (produce):** `ViewTabs({ view, onChange })`: `div role="tablist"` con dos `button role="tab"` (`Dashboard`, `B2B vs B2C`), `id="tab-{view}"`, `aria-selected` y `aria-controls="view-panel"`; sin navegacion por flechas (DEC-10, DEC-19). La pestana activa se distingue con el color primario.

- [ ] **Paso 1: tests que fallan**

| Test | Escenario | Esperado |
| --- | --- | --- |
| `renders Dashboard and B2B vs B2C tabs` (AC-F3-01) | `view="dashboard"` | `tablist`; dos `tab` en ese orden con ids `tab-dashboard`, `tab-comparison` y `aria-controls="view-panel"` |
| `marks the active tab` | `view="comparison"` | `aria-selected` `false`, `true` |
| `emits the selected view` | click en `B2B vs B2C` | `onChange("comparison")` |

- [ ] **Paso 2:** `npm --prefix frontend test -- src/components/dashboard/view-tabs.test.tsx` -> FAIL.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5: commit** `feat(f3): add ViewTabs component`.

### Tarea 3: Componente `GroupTopTable`

**Archivos:** crear `src/components/dashboard/group-top-table.tsx`; test `group-top-table.test.tsx` (jsdom).

**Interfaces (produce):** `GroupTopTable(props: GroupTopTableProps)`. `Card` con titulo `{group} - Top income categories` y descripcion `Top 5 categories by total income`, visibles siempre. Cuerpo segun la precedencia: carga -> 3 filas de `Skeleton` (DEC-17); error -> `Could not load {group} income data.` con `ErrorNotice` (DEC-29); vacio -> `No income in the selected range for {group}.` con `role="status"`; con filas -> tabla `Category` (`formatCategoryLabel`), `Total income` (`formatCurrency`), `Share of group` (`formatPercent(share * 100)`).

- [ ] **Paso 1: tests que fallan** (filas con `toGroupRows` de la fixture)

| Test | Escenario | Esperado |
| --- | --- | --- |
| `renders the group title, description and headers` | B2B con filas | titulo, descripcion y cabeceras |
| `formats rows in API order` (AC-F3-06) | fixture | `Sales`, `$557,904`, `90.6%`; `Others`, `$57,637`, `9.4%` |
| `renders only the rows it receives` (AC-F3-07) | fixture | 2 filas en `tbody` |
| `shows the empty message without a table` (AC-F3-08) | `rows=[]`, B2C | `role="status"` con `No income in the selected range for B2C.`; sin `table` |
| `shows the title and three skeleton rows while loading` (AC-F3-12, DEC-17) | `loading` | titulo visible y 3 `Skeleton`; sin `table` |
| `shows the group error` (AC-F3-13) | `error`, B2B | `role="alert"` con `Could not load B2B income data.`; sin `table` |
| `prefers loading over error` (DEC-16) | `loading` y `error` | skeletons y sin texto de error |

- [ ] **Paso 2:** `npm --prefix frontend test -- src/components/dashboard/group-top-table.test.tsx` -> FAIL.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5: commit** `feat(f3): add GroupTopTable component`.

### Tarea 4: Componente `GroupComparisonChart`

**Archivos:** crear `src/components/dashboard/group-comparison-chart.tsx`; test `group-comparison-chart.test.tsx` (jsdom).

**Interfaces (produce):** `GroupComparisonChart(props: GroupComparisonChartProps)`. Carga: el mismo marcado de carga que los graficos existentes (DEC-17). Si no: `Card` con titulo `Income: B2B vs B2C` y la descripcion visible `Total income of B2B and B2C in the selected range.` (`CardDescription`, DEC-39) y, segun la precedencia, error `Could not load the comparison.` con `ErrorNotice` (DEC-29) centrado en el area de 280 px, vacio `No income to compare in the selected range.` (`role="status"`) si ambos totales son 0, o un `BarChart` de Recharts de 280 px (DEC-20): `XAxis dataKey="business_type"`, `Bar dataKey="total_income" name="Income"`, color por barra con `shape` (B2B `var(--chart-1)`, B2C `var(--chart-5)`; ver decisiones propias), `LabelList` encima de cada barra con `formatCurrency` (DEC-38), eje Y y tooltip con `formatCurrency`, sin leyenda, `title="Income: B2B vs B2C"` y `desc="Total income of B2B and B2C in the selected range."`.

- [ ] **Paso 1: tests que fallan**

| Test | Escenario | Esperado |
| --- | --- | --- |
| `shows the title and no empty message when a group has income` (AC-F3-09/10) | B2B 615540.72, B2C 0 | titulo visible; sin vacio ni error |
| `shows the description under the title` (DEC-39) | B2B 615540.72, B2C 0; despues ambos 0 y `error` | `Total income of B2B and B2C in the selected range.` visible en los tres estados |
| `shows the empty message when both totals are zero` (AC-F3-11) | ambos 0 | `role="status"` con el texto |
| `shows a skeleton while loading` (AC-F3-12) | `loading` | `[data-slot="skeleton"]` |
| `shows the comparison error` (AC-F3-13) | `error` | `role="alert"` con el texto |
| `prefers loading over error` (AC-F3-18) | `loading` y `error` | skeleton y sin texto de error |

- [ ] **Paso 2:** `npm --prefix frontend test -- src/components/dashboard/group-comparison-chart.test.tsx` -> FAIL.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5: commit** `feat(f3): add GroupComparisonChart component`.

### Tarea 5: Pagina `ComparisonPage`

**Archivos:** crear `src/components/dashboard/comparison-page.tsx`; test `comparison-page.test.tsx` (jsdom, `fetch` simulado por URL).

**Interfaces (produce):** `ComparisonPage({ filter, bounds })` (props de la spec v1.4). Para cada grupo, `useApiResource<TopCategoriesResponse>(ruta)`, con ruta `"/api/metrics/categories/top" + buildQuery({ operation_type: "income", limit: 5, business_type, ...filter })` si `getDateRangeIssue(filter, bounds) === null`, o `null`. Grafico: `loading` si algun grupo carga, `error` si alguno fallo, `totals` con `sumTotals(data ?? [])` en orden B2B y B2C. Sin datos y sin carga (DEC-14) -> `rows=[]`. Marcado de DEC-19: `section` `Income by business type` (dos paneles en dos columnas) y `section` `Income comparison`, ambas con `aria-busy` mientras algun grupo carga.

- [ ] **Paso 1: tests que fallan.** `TOP` = `/api/metrics/categories/top?operation_type=income&limit=5&business_type=`.

| Test | Escenario | Esperado |
| --- | --- | --- |
| `requests income top categories for each group` (AC-F3-04, INV-F3-1) | `filter={}`, `bounds` conocido | exactamente `TOP + "B2B"` y `TOP + "B2C"` |
| `adds informed dates to both requests` | inicio `2026-01-01` | ambas URLs terminan en `&start_date=2026-01-01` |
| `shows empty states without requests when the filter cannot be requested` (AC-F3-16, DEC-14, DEC-26) | rango invertido; inicio `1900-02-02` | `fetch` no llamado; dos mensajes de vacio y el del grafico; ningun `role="alert"` |
| `keeps the last result when the filter becomes invalid` (AC-F3-05) | datos cargados y despues rango invertido | filas anteriores; sin llamadas nuevas |
| `renders both groups side by side in order` (AC-F3-06) | ambos con filas | titulo B2B antes que B2C |
| `shows one empty group while the other renders` (AC-F3-08) | B2B `[]`, B2C con filas | vacio en B2B; filas en B2C |
| `isolates a failed group` (AC-F3-13) | B2B `[]`, B2C 500 | vacio en B2B; `Could not load B2C income data.`; `Could not load the comparison.` |
| `shows the chart loading while one group loads and the other failed` (AC-F3-18) | B2B 500, B2C pendiente | `Could not load B2B income data.`; grafico sin error; `section` `Income comparison` con `aria-busy="true"` |
| `renders only the latest response` (AC-F3-14) | dos filtros resueltos en orden inverso | filas del ultimo |

- [ ] **Paso 2:** `npm --prefix frontend test -- src/components/dashboard/comparison-page.test.tsx` -> FAIL.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5: commit** `feat(f3): add ComparisonPage`.

### Tarea 6: Integracion en `App`

**Archivos:** modificar `src/App.tsx`; test `src/App.test.tsx`.

**Interfaces (produce):** estado `view: AppView` (inicial `"dashboard"`). Disposicion de DEC-19: `DashboardHeader`, `ViewTabs`, `DateRangePicker` y el panel `div id="view-panel" role="tabpanel" aria-labelledby="tab-{view}"`. Dentro del panel, en `dashboard`: aviso de rango vacio, banner, KPI, graficos y alertas (el aviso y el banner se mueven de su sitio actual al principio del panel: DEC-15); en `comparison`: `ComparisonPage` cargada con `lazy` dentro de `Suspense` con el fallback de DEC-23, recibiendo `filter` y `bounds`. Las rutas de movimientos y alertas pasan a `null` si `view !== "dashboard"` (DEC-12).

Los tests existentes no cambian (las pestanas y el panel no anaden `section` ni `h2`).

- [ ] **Paso 1: tests que fallan** (`describe("view tabs")`)

| Test | Escenario | Esperado |
| --- | --- | --- |
| `starts on the dashboard tab` (AC-F3-01) | carga | `tabpanel` con `aria-labelledby="tab-dashboard"`; KPI visibles |
| `switches to the comparison view and keeps the date picker` (AC-F3-02, INV-5) | click en `B2B vs B2C` | sin seccion de KPI ni `Anomaly Alerts`; `B2B - Top income categories` visible; 2 `input[type=date]` en el documento, fuera del panel; `aria-labelledby="tab-comparison"` |
| `does not request dashboard data while comparing` (AC-F3-04, AC-F3-15) | en la comparativa, inicio `2026-01-01` | llamadas de `top` con `start_date`; ninguna nueva a `/api/metrics?` ni a `/alerts` |
| `returns to the dashboard with the same filter` (AC-F3-03, AC-F3-15) | volver a `Dashboard` | el input conserva el valor; nuevas llamadas `/api/metrics?start_date=2026-01-01` y `/api/metrics/alerts?threshold=0.3&start_date=2026-01-01` |
| `hides the movements banner and empty notice in the comparison view` (AC-F3-17) | movimientos 500; despues `[]` | banner y aviso en `Dashboard`, no en `B2B vs B2C` |
| `ignores comparison responses after leaving the tab` | `top` pendiente, volver a `Dashboard`, resolver | sin titulos de grupo; `console.error` sin llamadas |

- [ ] **Paso 2:** `npm --prefix frontend test -- src/App.test.tsx` -> FAIL en los nuevos.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** mismo comando -> PASS (incluidos F1 y F2). `npm --prefix frontend run build` -> `ComparisonPage` en un chunk propio, sin aviso > 500 kB.
- [ ] **Paso 5: commit** `feat(f3): add view tabs and comparison view to App`.

### Tarea 7: Verificacion final y evidencia

**Archivos:** `docs/validations/08-features-checks.md` (seccion F3), `memory-bank/status.md` (F1-F3 implementados), `memory-bank/stack.md` (tests y chunks).

Procedimiento del repositorio para verificar cambios del frontend: [.skills/verify-frontend-change/SKILL.md](../../.skills/verify-frontend-change/SKILL.md).

- [ ] **Paso 1:** lint, tests y build -> sin errores; tamanos de chunk frente a la linea base.
- [ ] **Paso 2: los tests detectan la rotura:** quitar `operation_type: "income"` de la ruta -> falla `requests income top categories for each group`; quitar la condicion de vista en `App` -> falla `does not request dashboard data while comparing`; pedir sin la regla unica -> falla `shows empty states without requests…`. Restaurar tras cada una.
- [ ] **Paso 3: app en ejecucion** (usuario; confirmar con `curl` que Vite sirve `comparison-page.tsx`): comparar con `curl "http://localhost:8000/api/metrics/categories/top?operation_type=income&limit=5&business_type=B2B"` y B2C; porcentajes que suman ~100 %; dos barras con sus colores, su importe encima (DEC-38) y tooltip; descripcion visible y sin salto de altura al terminar de cargar (DEC-39); un rango sin datos -> ambos vacios; un grupo vacio y el otro no (barra `$0`, AC-F3-10), o dejarlo como no verificado; cambio de pestana sin salto de altura (DEC-23); errores con el mismo aviso rojo que el filtro de fechas (DEC-29).
- [ ] **Paso 4:** pasar a la spec las decisiones de la prueba visual; registrar evidencia; actualizar memory-bank; `git diff --check`.
- [ ] **Paso 5: commit** `docs(f3): record verification evidence`.

## Historial del plan

| Version | Fecha | Cambios |
| --- | --- | --- |
| 1.0 | 2026-11-18 | Plan inicial sobre la spec 1.0, con decisiones propias |
| 2.0 | 2026-11-18 | Regenerado sobre la spec 1.1; huecos H-01 a H-07 y H-09 provisionales |
| 3.0 | 2026-11-18 | Regenerado sobre la spec 1.2: los huecos pasan a DEC-15 a DEC-21 y DEC-23; sin huecos pendientes |
| 3.1 | 2026-11-18 | Referencia a la spec 1.3; sin cambios de contenido |
| 4.0 | 2026-11-18 | Ejemplos de codigo de implementacion en cada tarea (commit `9297324`) |
| 5.0 | 2026-11-18 | Version de entrega sin codigo, adaptada a la spec 1.4: `ComparisonPage` recibe `bounds` y aplica la regla unica (DEC-26), con su test; hueco H-11 (estilo de los errores) |
| 5.1 | 2026-11-18 | Spec 1.5: H-11 pasa a DEC-29 (decision del usuario); los errores usan `ErrorNotice`, extraido en el plan F2 |
| 5.2 | 2026-11-19 | Revisado contra la spec 1.8 antes de ejecutarlo: sin cambios de comportamiento (DEC-30 a DEC-32 son de F2); `LAZY_CHARTS` para las esperas de la vista comparativa en `App.test.tsx` |
| 5.3 | 2026-11-19 | Tras ejecutar la iteracion 1: dos notas de los tests (un `Response` por `fetch` simulado; cambiar el filtro tras el primer render). Prueba visual aprobada sin hallazgos: la spec sigue en 1.8 |
| 5.4 | 2026-11-19 | Spec 1.9, tras la planificacion de la prueba de traspaso: etiqueta de importe en cada barra (DEC-38), descripcion visible (DEC-39) y su test; color por barra con `shape` en lugar de `Cell`, obsoleto en Recharts 3.8. Iteracion 1 cerrada (fase 8, PR #21) |
