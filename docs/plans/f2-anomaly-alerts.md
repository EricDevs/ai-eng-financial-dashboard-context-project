# F2 - Tabla de alertas de anomalias: plan de implementacion

**Version:** 5.2 | **Fecha:** 2026-11-18 | **Estado:** version de entrega, sin codigo; iteracion 1 en curso (fase 7) | **Spec:** v1.6

**Como ejecutar:** tarea por tarea y en orden; marcar cada paso (`- [ ]`) al completarlo. No empezar una tarea sin que la anterior tenga sus tests en verde. Cada test se ve fallar antes de implementar.

**Sobre esta version:** el plan dice que construir, con que interfaces y con que tests; no incluye el codigo. La version 4.0 (con codigo, sobre la spec 1.3) queda en el historial de git (commit `9297324`).

**Objetivo:** tarjeta bajo los graficos del dashboard con los periodos cuyo gasto supera un umbral configurable, consumiendo `GET /api/metrics/alerts` con el filtro de fechas compartido.

**Arquitectura:** utilidad pura `parseThreshold`, dos componentes de presentacion (`ThresholdInput` dentro de `AlertsTable`) y estado en `App` (`thresholdText`, `appliedThreshold`) con un segundo `useApiResource`. El error de esta peticion se queda en la tarjeta.

**Stack:** React 19.2, TypeScript ~6.0, Vitest 4 + jsdom, Tailwind 4.

**Spec:** [components.md v1.6](../../frontend/specs/components.md): F2 (incluida su seccion de presentacion), convenciones comunes (precedencia de estados, roles ARIA y aspecto de los errores), regla unica de peticion, disposicion de la pagina y DEC-06 a DEC-09, DEC-16, DEC-18, DEC-19, DEC-26, DEC-29 y DEC-30. Evidencia de la API en [verification.md](../../frontend/specs/verification.md#f2---tabla-de-alertas-de-anomalias).

**Depende de:** [plan F1](f1-date-range-filter.md) ejecutado (`buildQuery`, `useApiResource`, `getDateRangeIssue`, `bounds` en `App`, `AlertsResponse`, `test-helpers.ts`, `stubApi` de `App.test.tsx`).

**Reglas del proyecto:** WF, FE, API (consumo de `/alerts`), FIN (formato de importes y ratio).

**Rama:** `feature/frontend-specs-v2-fase7-f2` desde `feature/frontend-specs-v2` con F1 integrado (ver [ROADMAP-Project-3](../entregables/ROADMAP-Project-3.md#9-ampliacion-v2-planes-implementacion-y-prueba-de-traspaso)). Commits solo con autorizacion del usuario (WF 8).

## Restricciones globales

- `GET /api/metrics/alerts?threshold=...[&start_date][&end_date]` en ese orden (DEC-07). **Nunca** `group_by` ni `business_type`.
- Se pide solo si el umbral es valido **y** `getDateRangeIssue(filter, bounds) === null` (DEC-26). `threshold` siempre en `0.01`-`1.0` inclusive (INV-3); por defecto `0.3`.
- Filas en el orden de la API; sin calcular alertas en el cliente; columna `Avg. of previous periods`.
- Estados con precedencia `loading` > `error` > vacio > datos (DEC-16); error con `role="alert"`, vacio con `role="status"` (DEC-18).
- La tarjeta no aparece en `B2B vs B2C` (lo cubre el plan F3).
- Un fallo de alertas no activa el banner global ni vacia los KPI (INV-6).
- Todos los errores de F2 (umbral invalido y error de carga) se muestran con el aviso rojo de F1 (DEC-29).
- Estilo de cada archivo como en F1. Sin dependencias nuevas, sin `any` explicito, sin backend.

## Mapa de archivos

| Archivo | Responsabilidad | Tarea |
| --- | --- | --- |
| `src/lib/financial-utils.ts` | Constantes del umbral y `parseThreshold` | 1 |
| `src/components/dashboard/error-notice.tsx` | Aviso rojo compartido (`ErrorNotice`), extraido de `date-range-picker.tsx` | 2 |
| `src/components/dashboard/threshold-input.tsx` | Input del umbral con ayuda y error | 2 |
| `src/components/dashboard/alerts-table.tsx` | Tarjeta con titulo, input y tabla o su estado | 3 |
| `src/App.tsx` | Estado del umbral, peticion de alertas y seccion | 4 |

## Decisiones propias del plan (implementacion, no producto)

- **Actualizacion de tests existentes (cambio de producto, no debilitamiento):** en `App.test.tsx`, `busyStates()` pasa de 2 a 3 secciones (la `section` de alertas de DEC-19) y la lista de `h2` anade `Anomaly Alerts` al final. El primer `[role="alert"]` sigue siendo el banner en espanol, porque va antes en el DOM.
- El aviso rojo que F1 tiene como componente interno de `date-range-picker.tsx` se extrae a `error-notice.tsx` (`ErrorNotice({ children }: { children: string })`, con `role="alert"`) y lo usan el picker, `ThresholdInput` y `AlertsTable` (y despues F3). Asi DEC-29 se cumple con un solo estilo en el codigo.
- Fixture de fila: `{ period: "2026-03", outcome_total: 88075.59, baseline_average: 55334.29, increase_ratio: 0.5917 }` -> `2026-03`, `$88,076`, `$55,334`, `59.2%`.
- En los tests de `App`, "llamadas de alertas" son las URLs que empiezan por `/api/metrics/alerts`. Entre cambios de input se espera al re-render (`vi.waitFor`), porque el filtro siguiente se construye con el `value` actual.

## Foco de revision

1. **Umbral valido con un filtro de fechas no pedible:** sin peticion; al corregir las fechas se pide con ese umbral (AC-F2-13).
2. **Error y recuperacion:** tras un fallo, un umbral valido nuevo con 200 quita el error.
3. **El estado vacio muestra el umbral aplicado, no el escrito.**
4. **Input vaciado mientras se escribe:** `''` -> error y ninguna peticion con `threshold=`.
5. **Extremos `0.01` y `1.0`:** validos y enviados.

---

### Tarea 1: Constantes y `parseThreshold`

**Archivos:** modificar `src/lib/financial-utils.ts`; test `src/lib/financial-utils.test.ts`.

**Interfaces (produce):** `THRESHOLD_MIN = 0.01`, `THRESHOLD_MAX = 1`, `THRESHOLD_DEFAULT = 0.3`; `parseThreshold(text: string): number | null`: texto vacio o en blanco -> `null` (porque `Number("")` es `0`); si no, `Number(text)` si es finito y esta en `[THRESHOLD_MIN, THRESHOLD_MAX]`; si no, `null`.

- [ ] **Paso 1: tests que fallan**

| Test | Entrada | Esperado |
| --- | --- | --- |
| `parses thresholds within 0.01 and 1 inclusive` | `"0.3"`, `"0.01"`, `"1"`, `"1.0"` | `0.3`, `0.01`, `1`, `1` |
| `rejects empty, non-numeric and out-of-range text` | `""`, `" "`, `"abc"`, `"0"`, `"0.009"`, `"1.01"`, `"5"`, `"-0.1"`, `"Infinity"` | `null` |

- [ ] **Paso 2:** `npm --prefix frontend test -- src/lib/financial-utils.test.ts` -> FAIL.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5: commit** `feat(f2): add threshold parsing`.

### Tarea 2: Aviso compartido y componente `ThresholdInput`

**Archivos:** crear `src/components/dashboard/error-notice.tsx` (extraido de `date-range-picker.tsx`, que pasa a importarlo); crear `src/components/dashboard/threshold-input.tsx`; test `threshold-input.test.tsx` (jsdom).

- [ ] **Paso 0: extraer `ErrorNotice`** sin cambiar su marcado ni sus clases. Verificar con `npm --prefix frontend test -- src/components/dashboard/date-range-picker.test.tsx` -> PASS (14 tests, sin cambios en los tests).

**Interfaces (produce):** `ThresholdInput({ value, onChange }: ThresholdInputProps)`. `<input type="number">` con `min=THRESHOLD_MIN`, `max=THRESHOLD_MAX`, `step=0.01`, etiqueta visible `Alert threshold` (con `useId`) y ayuda `Ratio between 0.01 and 1.0 (default 0.3).` asociada con `aria-describedby`. Si `parseThreshold(value)` es `null`: `aria-invalid="true"` y error `Enter a value between 0.01 and 1.0.` con `ErrorNotice` (DEC-29). Emite el texto tal cual. Disposicion (DEC-30): etiqueta, input y ayuda en una fila que se apila si no cabe, y el aviso debajo; input con el tamano y estilo de los inputs de fecha de F1.

- [ ] **Paso 1: tests que fallan**

| Test | Escenario | Esperado |
| --- | --- | --- |
| `renders a labelled number input with limits` | `value="0.3"` | `type="number"`, `min="0.01"`, `max="1"`, `step="0.01"`, `input.value` `"0.3"`, ayuda visible |
| `emits the raw text on change` | escribir `0.5` | `onChange("0.5")` |
| `shows an error for invalid text` (AC-F2-04) | `""`, `"0"`, `"5"` | `role="alert"` con el texto exacto e `aria-invalid="true"` |
| `shows no error at the limits` | `"0.01"`, `"1.0"` | sin `role="alert"` |

- [ ] **Paso 2:** `npm --prefix frontend test -- src/components/dashboard/threshold-input.test.tsx` -> FAIL.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5: commit** `feat(f2): add ThresholdInput component`.

### Tarea 3: Componente `AlertsTable`

**Archivos:** crear `src/components/dashboard/alerts-table.tsx`; test `alerts-table.test.tsx` (jsdom).

**Interfaces (produce):** `AlertsTable(props: AlertsTableProps)` con las props de la spec.

**Comportamiento a implementar:** `Card` con titulo `Anomaly Alerts` (DEC-06) y ayuda `Average outcome of all earlier periods in the selected range.` en la cabecera; en el contenido, de arriba abajo, `ThresholdInput` y despues la tabla o su estado (DEC-30: el control no va en una columna lateral de la cabecera). Cuerpo segun la precedencia (DEC-16):
- `loading`: tabla con cabecera y 3 filas de `Skeleton` en `tbody`; input activo.
- `error`: `Could not load anomaly alerts.` con `ErrorNotice` (DEC-29) y sin tabla.
- `alerts` vacio o `null`: tabla con cabecera; en `tbody`, un elemento con `role="status"` con `No anomalies detected for the current threshold ({formatPercent(appliedThreshold * 100)}).` y `Try a lower threshold or a wider date range.` (DEC-09, DEC-18).
- Con filas: `Period` tal cual, `Outcome` y `Avg. of previous periods` con `formatCurrency`, `Increase` con `formatPercent(increase_ratio * 100)`, en el orden recibido.

- [ ] **Paso 1: tests que fallan**

| Test | Escenario | Esperado |
| --- | --- | --- |
| `renders title, help line, input and four headers` (AC-F2-01/08) | con filas | titulo, ayuda, input y cabeceras `Period`, `Outcome`, `Avg. of previous periods`, `Increase` |
| `formats each alert row` (AC-F2-07) | fixture | celdas `2026-03`, `$88,076`, `$55,334`, `59.2%` |
| `keeps the API row order` | periodos `2026-03`, `2025-12` | mismo orden |
| `keeps the table visible with an empty result` (AC-F2-09) | `alerts=[]`, `appliedThreshold=0.3` | cabeceras en `thead`; mensaje con `(30.0%)` en `tbody` con `role="status"` |
| `uses the applied threshold in the empty message` | `alerts=[]`, `appliedThreshold=0.3`, `thresholdText="5"` | sigue `(30.0%)` y se ve el error del input |
| `shows three skeleton rows while loading` (AC-F2-10) | `loading` | 3 filas con `[data-slot="skeleton"]`; input sin `disabled` |
| `shows the card error and hides the table` (AC-F2-11) | `error` | texto con `role="alert"`; sin `table`; input visible |
| `prefers loading over error` (DEC-16) | `loading` y `error` | skeletons y sin texto de error |
| `keeps the last rows while the input is invalid` (AC-F2-04) | filas y `thresholdText="0"` | filas visibles y error del input |

- [ ] **Paso 2:** `npm --prefix frontend test -- src/components/dashboard/alerts-table.test.tsx` -> FAIL.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5: commit** `feat(f2): add AlertsTable component`.

### Tarea 4: Integracion en `App`

**Archivos:** modificar `src/App.tsx`; test `src/App.test.tsx`.

**Interfaces (produce):** en `App`, `thresholdText` (inicial `String(THRESHOLD_DEFAULT)`), `appliedThreshold` (inicial `THRESHOLD_DEFAULT`), `handleThresholdChange(text)` (guarda el texto y, si `parseThreshold` da numero, lo aplica, aunque el filtro de fechas no se pueda pedir: DEC-08) y `alerts = useApiResource<AlertsResponse>(getDateRangeIssue(filter, bounds) === null ? "/api/metrics/alerts" + buildQuery({ threshold: appliedThreshold, ...filter }) : null)`. F3 anadira la condicion de vista a esta ruta.

**Render:** `<section aria-label="Anomaly alerts" aria-busy={alerts.loading}>` con `AlertsTable`, tras la seccion de graficos (DEC-19). `alerts.error` no toca el banner global.

- [ ] **Paso 1: actualizar los 2 tests existentes (ver decisiones propias) y anadir `describe("anomaly alerts")`**

| Test | Escenario | Esperado |
| --- | --- | --- |
| `requests alerts with the default threshold on load` (AC-F2-02) | carga | `/api/metrics/alerts?threshold=0.3` |
| `refetches with a valid threshold` (AC-F2-03) | `0.5`, `0.01`, `1.0` | `?threshold=0.5`, `?threshold=0.01`, `?threshold=1` |
| `does not request with an invalid threshold` (AC-F2-04, INV-3) | `""`, `"0"`, `"5"` | sin llamadas nuevas, filas previas y error del input |
| `refetches alerts when the date filter changes` (AC-F2-05) | umbral `0.5`, inicio `2026-01-01` | `/api/metrics/alerts?threshold=0.5&start_date=2026-01-01` |
| `does not request alerts with a date filter that cannot be requested` (AC-F2-06, INV-7) | rango invertido; ano `0019-02-02`; inicio `1900-02-02` | sin llamadas nuevas de alertas en los tres casos |
| `applies a threshold typed during an invalid range once fixed` (AC-F2-13) | inicio `2026-02-01`, fin `2026-01-01`, umbral `0.4` (sin llamada); inicio `2025-12-01` | ultima `/api/metrics/alerts?threshold=0.4&start_date=2025-12-01&end_date=2026-01-01` |
| `keeps alert errors inside the card` (AC-F2-11, INV-6) | alertas 500, movimientos 200; despues umbral `0.4` con 200 | mensaje en la tarjeta, sin `No se pudo cargar`, KPI con valores; despues sin error |
| `renders only the latest alerts response` (AC-F2-12) | dos umbrales resueltos en orden inverso | filas del ultimo |
| `never sends group_by or business_type to alerts` | todo el escenario | ninguna URL de alertas los contiene |

- [ ] **Paso 2:** `npm --prefix frontend test -- src/App.test.tsx` -> FAIL en los nuevos y en los 2 actualizados.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** mismo comando -> PASS (incluidos los de F1).
- [ ] **Paso 5: commit** `feat(f2): wire anomaly alerts into App`.

### Tarea 5: Verificacion final y evidencia

**Archivos:** `docs/validations/08-features-checks.md` (seccion F2), `memory-bank/status.md`, `memory-bank/stack.md`.

Procedimiento del repositorio para verificar cambios del frontend: [.skills/verify-frontend-change/SKILL.md](../../.skills/verify-frontend-change/SKILL.md).

- [ ] **Paso 1:** lint, tests y build -> sin errores ni avisos nuevos.
- [ ] **Paso 2: los tests detectan la rotura:** quitar `role="alert"` de `ThresholdInput` -> falla `shows an error for invalid text`; aplicar el umbral sin `parseThreshold` -> falla `does not request with an invalid threshold`; pedir alertas sin la regla unica -> falla `does not request alerts with a date filter that cannot be requested`. Restaurar tras cada una.
- [ ] **Paso 3: app en ejecucion** (usuario; confirmar con `curl` que Vite sirve `alerts-table.tsx`): comparar fila a fila con `curl "http://localhost:8000/api/metrics/alerts?threshold=0.3"` (el dataset depende de la fecha de hoy); `1.0`; `0`, `5`, `0,3` y vacio sin peticion (pestana Red); un rango de un mes -> vacio; backend parado -> error solo en la tarjeta; los errores con el mismo aviso rojo que el filtro de fechas (DEC-29); disposicion de la tarjeta sin hueco entre el titulo y la tabla (AC-F2-14).
- [ ] **Paso 4:** pasar a la spec lo que surja de la prueba visual; registrar evidencia; actualizar memory-bank; `git diff --check`.
- [ ] **Paso 5: commit** `docs(f2): record verification evidence`.

## Historial del plan

| Version | Fecha | Cambios |
| --- | --- | --- |
| 1.0 | 2026-11-18 | Plan inicial sobre la spec 1.0, con decisiones propias |
| 2.0 | 2026-11-18 | Regenerado sobre la spec 1.1; huecos H-02, H-04 y H-05 provisionales |
| 3.0 | 2026-11-18 | Regenerado sobre la spec 1.2: los huecos pasan a DEC-16, DEC-18 y DEC-19; sin huecos pendientes |
| 3.1 | 2026-11-18 | Referencia a la spec 1.3; sin cambios de contenido |
| 4.0 | 2026-11-18 | Ejemplos de codigo de implementacion en cada tarea (commit `9297324`) |
| 5.0 | 2026-11-18 | Version de entrega sin codigo, adaptada a la spec 1.4: regla unica de peticion para alertas (DEC-26) y su test; hueco H-11 (estilo de los errores de F2) |
| 5.1 | 2026-11-18 | Spec 1.5: H-11 pasa a DEC-29 (decision del usuario: el aviso rojo de F1); `ErrorNotice` se extrae a un componente compartido (Tarea 2, paso 0) |
| 5.2 | 2026-11-18 | Spec 1.6, tras la prueba visual de F2: disposicion de la tarjeta en una columna y tamano del input del umbral (DEC-30) en las Tareas 2 y 3; comprobacion visual AC-F2-14 en la Tarea 5 |
