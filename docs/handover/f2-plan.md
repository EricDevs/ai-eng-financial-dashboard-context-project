# F2 - Tabla de alertas de anomalias: plan de implementacion

**Objetivo:** tarjeta `Anomaly Alerts` bajo los graficos con un umbral configurable (`0.01`-`1.0`) y la tabla de periodos cuyo gasto supera el umbral, segun `GET /api/metrics/alerts`.

**Arquitectura:** `parseThreshold` y constantes en `financial-utils.ts`; componentes de presentacion `ThresholdInput` y `AlertsTable`; `App` guarda `thresholdText` y `appliedThreshold`, deriva la ruta de alertas con la regla unica de peticion de F1 y usa `useApiResource`.

**Stack:** el de F1. Depende de F1 terminada (`buildQuery`, `useApiResource`, `filter`, `dateIssue`).

**Spec:** v1.9. [README, F2](../../frontend/specs/README.md#f2---tabla-de-alertas-de-anomalias) y [components.md, F2](../../frontend/specs/components.md#f2---tabla-de-alertas-de-anomalias). Las dudas de la etapa 1 que afectan a F2 (Q-05, Q-15, Q-16, Q-21) las cierra la v1.9 y las de proceso (Q-10, Q-11) las respondio el mantenedor; abierta: Q-22, que afecta a las alertas al volver de `B2B vs B2C` ([decisions.md](decisions.md)).

## Cambios respecto a la version anterior (spec v1.8 a v1.9)

- Tarea 2: tabla, carga y vacio con los valores de DEC-40 (antes eran las propuestas Q-15 y Q-16).
  - Carga: cada fila tiene una sola celda que ocupa las 4 columnas, con una barra `h-5`. Antes eran 4 celdas `h-4`.
  - Vacio: una celda que ocupa las 4 columnas, con los textos centrados.
  - Cabecera de la tabla: en mayusculas y `font-medium`, con `py-2` en las celdas.
  - Los tests de carga y de vacio comprueban `colSpan`.
- Tarea 3: con el umbral invalido, un cambio de fechas pide con el umbral aplicado (DEC-34; antes Q-05 tenia dos opciones). El test `uses the applied threshold when dates change` tiene ahora un unico resultado esperado. Test nuevo para `0.015` (DEC-40, antes Q-21).
- Proceso. Q-10: los dos tests existentes se actualizan en la Tarea 3 sin relajarlos. Q-11: cada mutacion se registra con el test que fallo. Q-12: se anade al final la seccion `Registro de ejecucion`.

## Restricciones globales

Las de [F1](f1-plan.md#restricciones-globales), mas:

- Nunca se envia `group_by` ni `business_type` a `/api/metrics/alerts`; orden `threshold`, `start_date`, `end_date`.
- Las filas conservan el orden de la API; no se calculan alertas en el cliente.
- La columna se llama `Avg. of previous periods`, nunca "media movil de 3 periodos".
- Errores de F2 con el aviso rojo de F1 (DEC-29); vacio con `role="status"`, error con `role="alert"` (DEC-18).
- Un fallo de alertas no activa el banner global ni vacia los KPI (AC-F2-11, INV-6).

## Foco de revision

1. Umbral con coma decimal (`0,3`): segun el idioma del navegador llega `0.3` o `''`; ambos casos deben acabar en un estado coherente (Tarea 1, `parseThreshold("")` es null; prueba visual con navegador en espanol).
2. Umbral invalido y cambio de fechas a la vez (DEC-34): la tabla sigue al filtro con el umbral aplicado y el aviso del umbral sigue visible (Tarea 3, test `uses the applied threshold when dates change`).
3. Umbral valido escrito con el rango invertido y rango corregido despues (DEC-08): se pide con el umbral nuevo (Tarea 3, test `applies a threshold typed during an invalid range`).
4. Error de alertas con KPI correctos: el error queda en la tarjeta (Tarea 3, test `keeps alert errors inside the card`).
5. `0.3 * 100` en coma flotante (`30.000000000000004`): el vacio debe decir `30.0%` (Tarea 2, test del estado vacio).

---

### Tarea 1: utilidades del umbral

**Archivos:**
- Modificar: `frontend/src/lib/financial-utils.ts`
- Test: `frontend/src/lib/financial-utils.test.ts`

**Interfaces:**
- Produce: `THRESHOLD_MIN = 0.01`, `THRESHOLD_MAX = 1`, `THRESHOLD_DEFAULT = 0.3`, `parseThreshold(text: string): number | null`.

- [ ] **Paso 1: tests que fallan** (`describe("parseThreshold")`):

```ts
expect(parseThreshold("0.3")).toBe(0.3)
expect(parseThreshold("0.01")).toBe(0.01)   // extremo inferior
expect(parseThreshold("1")).toBe(1)
expect(parseThreshold("1.0")).toBe(1)       // extremo superior
expect(parseThreshold("0.015")).toBe(0.015) // DEC-40: la validez no depende del step
for (const text of ["", "0", "0.009", "1.01", "5", "-0.1", "abc", "Infinity"]) {
  expect(parseThreshold(text)).toBeNull()
}
```

- [ ] **Paso 2:** `npm --prefix frontend test -- src/lib/financial-utils.test.ts` -> FAIL.
- [ ] **Paso 3:** implementar: texto vacio -> null; `Number(text)`; finito y dentro de `[THRESHOLD_MIN, THRESHOLD_MAX]`.
- [ ] **Paso 4:** mismo comando -> PASS.
- [ ] **Paso 5:** commit `feat(f2): add threshold parsing`.

### Tarea 2: `ThresholdInput` y `AlertsTable`

**Archivos:**
- Crear: `frontend/src/components/dashboard/threshold-input.tsx`, `frontend/src/components/dashboard/alerts-table.tsx`
- Test: `frontend/src/components/dashboard/alerts-table.test.tsx` (jsdom; usa `changeInput` de `src/test-utils.ts`)

**Interfaces:**
- Consume: `parseThreshold`, `formatCurrency`, `formatPercent`; tipos `AlertsResponse`.
- Produce: `ThresholdInput({ value, onChange })` y `AlertsTable({ alerts, appliedThreshold, thresholdText, onThresholdChange, loading, error })` con las props de la spec. `ThresholdInput` pone `aria-invalid` cuando `parseThreshold(value) === null`; el aviso del umbral lo coloca `AlertsTable` (DEC-31).

- [ ] **Paso 1: tests que fallan.** Fixture: `[{ period: "2026-03", outcome_total: 88073.5, baseline_average: 55334.29, increase_ratio: 0.5917 }, { period: "2025-12", outcome_total: 90000, baseline_average: 36058.3, increase_ratio: 1.4968 }]` (orden no cronologico a proposito para probar que no se reordena).
  - `renders title, help line and threshold input`: `h2` `Anomaly Alerts`; texto `Average outcome of all earlier periods in the selected range.`; input con etiqueta `Alert threshold`, `type="number"`, `min="0.01"`, `max="1"`, `step="0.01"`; ayuda `Ratio between 0.01 and 1.0 (default 0.3).`
  - `renders rows formatted and in API order`: cabeceras `Period`, `Outcome`, `Avg. of previous periods`, `Increase`; primera fila `2026-03`, `$88,074`, `$55,334`, `59.2%`; segunda fila empieza por `2025-12`.
  - `keeps the table head on an empty result`: `alerts=[]`, `appliedThreshold=0.3` -> `thead` presente; `role="status"` con `No anomalies detected for the current threshold (30.0%).` y `Try a lower threshold or a wider date range.`, dentro de una unica `td` de `tbody` con `colSpan === 4` (DEC-40).
  - `shows three skeleton rows while loading`: `loading` -> `thead` presente; 3 `tr` en `tbody`, cada una con una sola `td` de `colSpan === 4` que contiene un `[data-slot="skeleton"]` (DEC-40); input no `disabled`.
  - `shows a load error instead of the table`: `error` -> `role="alert"` con `Could not load anomaly alerts.`, sin `table`.
  - `prefers loading over error` (DEC-16): `loading` y `error` -> skeleton, sin el mensaje de error.
  - `flags an invalid threshold and keeps the last rows`: `thresholdText="5"` con filas -> `role="alert"` con `Enter a value between 0.01 and 1.0.`, input con `aria-invalid="true"`, las dos filas siguen.
  - `reports threshold edits`: `changeInput(input, "0.5")` -> `onThresholdChange("0.5")`.
- [ ] **Paso 2:** `npm --prefix frontend test -- src/components/dashboard/alerts-table.test.tsx` -> FAIL.
- [ ] **Paso 3:** implementar con la [presentacion de F2](../../frontend/specs/components.md#presentacion-de-f2-v16-dec-30): cabecera con titulo y ayuda a la izquierda y fila del umbral a la derecha (se apila en pantallas estrechas); aviso del umbral a todo el ancho bajo la cabecera; despues la tabla. Etiqueta en `muted-foreground` (DEC-32); input `h-11 text-base bg-secondary`, anillo de foco y borde rojo con `aria-invalid`. Tabla segun la [presentacion de F2](../../frontend/specs/components.md#presentacion-de-f2-v16-dec-30) (DEC-40):
  - Cuerpo `text-sm`; cabecera `text-xs uppercase font-medium text-muted-foreground`.
  - `Period` con `text-left`; las demas columnas con `text-right`.
  - Cada fila con `border-t border-border/60`; celdas con `py-2`.
  - Carga: `td colSpan={4}` con `Skeleton className="h-5 w-full"`.
  - Vacio: `td colSpan={4}` con los textos centrados, `text-sm text-muted-foreground`.
- [ ] **Paso 4:** mismo comando -> PASS; lint sin errores.
- [ ] **Paso 5:** commit `feat(f2): add AlertsTable and ThresholdInput`.

### Tarea 3: integracion en `App`

**Archivos:**
- Modificar: `frontend/src/App.tsx`, `frontend/src/App.test.tsx`

**Interfaces:**
- Consume: `filter`, `dateIssue`, `buildQuery`, `useApiResource` (F1); `AlertsTable`, `parseThreshold`, `THRESHOLD_DEFAULT` (Tareas 1-2).
- Produce para F3: la ruta de alertas es una variable de `App` que F3 pondra a `null` en la vista comparativa (DEC-12).

Comportamiento: estado `thresholdText` (inicial `"0.3"`) y `appliedThreshold` (inicial `THRESHOLD_DEFAULT`). En cada cambio de texto, si `parseThreshold` da un numero se guarda como aplicado (aunque el rango sea invalido, DEC-08). Ruta: `dateIssue === null ? "/api/metrics/alerts" + buildQuery({ threshold: appliedThreshold, start_date, end_date }) : null`. Un texto invalido no bloquea la ruta: solo deja `appliedThreshold` sin cambiar (DEC-34). Se coloca `<section aria-label="Anomaly alerts" aria-busy={loading}>` tras la seccion de graficos.

- [ ] **Paso 1: tests que fallan** (`describe("F2 anomaly alerts")`, mismo `routeFetch` de F1; alertas devuelve el fixture de la Tarea 2):
  - `requests alerts with the default threshold on mount`: `requested` contiene `/api/metrics/alerts?threshold=0.3`; se ve la fila `2026-03`.
  - `refetches with a valid threshold`: `0.5` -> `/api/metrics/alerts?threshold=0.5`; `0.01` y `1` tambien se piden (extremos).
  - `requests a threshold outside the input step` (DEC-40): `0.015` -> `/api/metrics/alerts?threshold=0.015`, sin aviso del umbral.
  - `does not request with an invalid threshold`: `5`, `0`, `""` -> ninguna URL de alertas nueva; aviso visible; filas anteriores visibles.
  - `refetches alerts when dates change`: start `2026-01-01` -> `/api/metrics/alerts?threshold=0.3&start_date=2026-01-01`.
  - `does not request alerts on an invalid range`: rango invertido -> ninguna URL de alertas nueva; filas anteriores visibles.
  - `applies a threshold typed during an invalid range` (AC-F2-13): rango invertido, umbral `0.5` -> sin peticion; corregir end -> `/api/metrics/alerts?threshold=0.5&start_date=...&end_date=...`.
  - `uses the applied threshold when dates change` (DEC-34, AC-F2-04, AC-F2-05): umbral `5` (invalido) tras `0.3` -> ninguna URL de alertas nueva; cambiar start -> `/api/metrics/alerts?threshold=0.3&start_date=2026-01-01` y el aviso `Enter a value between 0.01 and 1.0.` sigue visible.
  - `keeps alert errors inside the card`: alertas 500, resto OK -> `Could not load anomaly alerts.`; ningun texto `No se pudo cargar`; KPI con `$100`.
  - AC-F2-12 (respuestas fuera de orden): lo cubre el test del hook `keeps only the response of the current path` de F1, porque la ruta de alertas incluye umbral y fechas.
  - Adaptar los dos tests existentes (Q-10, respondida): `busyStates()` pasa a tres valores y la lista de `h2` anade `Anomaly Alerts` al final. Siguen siendo comparaciones exactas (`toEqual`); solo cambian los valores esperados.
- [ ] **Paso 2:** `npm --prefix frontend test -- src/App.test.tsx` -> FAIL en los nuevos.
- [ ] **Paso 3:** implementar en `App.tsx`.
- [ ] **Paso 4:** mismo comando -> PASS; `npm --prefix frontend test` completo -> PASS.
- [ ] **Paso 5:** commit `feat(f2): show anomaly alerts under the charts`.

### Tarea 4: verificacion de F2 y parada para la prueba visual

Sigue [verify-frontend-change](../../.skills/verify-frontend-change/SKILL.md).

- [ ] `git diff --stat` muestra los archivos de F2.
- [ ] Lint, tests completos y build: sin errores ni avisos nuevos frente a F1.
- [ ] Mutaciones (Q-11): (1) `parseThreshold` acepta `0`; (2) quitar `role="status"` del vacio; (3) enviar `group_by=month`; (4) pedir alertas con el rango invertido; (5) mostrar el error de alertas en el banner global; (6) poner la ruta de alertas a `null` mientras el texto del umbral sea invalido (DEC-34). En el `Registro de ejecucion` se anota cada mutacion con el cambio, el test que fallo y la restauracion.
- [ ] `curl -s http://localhost:5173/src/App.tsx | grep -c AlertsTable` > 0 (si no, reiniciar el contenedor `frontend`).
- [ ] Registrar en el [Registro de ejecucion](#registro-de-ejecucion) (Q-12) y **parar** para la prueba visual. Lista:
  - disposicion de la tarjeta sin hueco entre titulo y tabla (AC-F2-14);
  - etiqueta del umbral en gris e input con fondo `secondary`;
  - aviso rojo;
  - estilo de la tabla, de las filas de carga y del vacio (DEC-40);
  - teclear `0,3` en el navegador;
  - con el dataset completo hay 4 alertas con `0.3` (dato del 2026-11-15, puede variar con la fecha).

## Registro de ejecucion

Se rellena en la etapa 2 (Q-12): por tarea, cada comando con su resultado (tests, lint y build, con el tamano del chunk principal), cada mutacion con el cambio, el test que fallo y la restauracion (Q-11), la comprobacion de que Vite sirve el codigo nuevo y los limites encontrados.
