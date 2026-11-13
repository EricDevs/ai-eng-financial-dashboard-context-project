# 05 - RulesChecks

## Estado y alcance

Fase 3 iniciada el 2026-11-13 en `phase-3-agent-rules`, desde el merge de
[PR #2](https://github.com/EricDevs/ai-eng-financial-dashboard-context-project/pull/2),
`43a9cda`. La rama de fase 2 se elimino local y remotamente antes de crear esta.

El mantenedor autorizo agentes con contextos separados para documentacion,
tests y cambios sin alteracion funcional; pidio aprobar antes del commit.
No se autorizan correcciones de periodo, zona horaria, RNG, CORS o despliegue.
No se crea memoria ni se inicia fase 4.

## Reorganizacion documental durante fase 3

El mantenedor movio `docs/04 - Conventions.md` a `docs/validations/04%20-%20Conventions.md`
durante esta sesion. El coordinador detecto el archivo borrado/duplicado,
confirmo con el mantenedor que fue intencional y corrigio en consecuencia:
todos los enlaces relativos internos de ese archivo (antes `../frontend/...`,
`../backend/...`, `../AGENTS.md`, `../README*.md`, `../.gitignore`, `ROADMAP.md`)
y las referencias externas en [AGENTS.md](../../AGENTS.md) y
[ROADMAP.md](../ROADMAP.md) que apuntaban a la ubicacion anterior. Verificado
con una comprobacion de existencia de cada ruta local resultante: todas
resuelven. Es la ubicacion vigente de las propuestas de fase 2 para el resto
de esta fase.

## Formato y mecanismo de lectura

Las reglas en [.agents/rules](../../.agents/rules) son Markdown con nombre,
alcance, hechos/justificacion, guia, checks y limites. Se leen mediante el
routing explicito de [AGENTS.md](../../AGENTS.md); no se presupone que cualquier
cliente descubra ese archivo ni se declara un cargador YAML inexistente.
El ejemplo `src/!(components)/**/*.ts` no coincide con la raiz `frontend/src`
y excluiria componentes que tambien necesitan reglas. No se usa un glob de
extglob como garantia de activacion.

## Inventario y trazabilidad

| Archivo / ID | Propuestas de fase 2 | Ejercicio previsto | Estado |
| --- | --- | --- | --- |
| [WF](../../.agents/rules/01-workflow-evidence.md) | R14, R16, R17, R22, R24 | Todos: lectura, scope y evidencia real | Cumple (transversal en los 4 ejercicios) |
| [FIN](../../.agents/rules/02-financial-domain.md) | R01, R05, R06, R07 | Tests financieros backend/frontend | Cumple (FIN-CAL-01) |
| [API](../../.agents/rules/03-api-contracts.md) | R02, R04 | TestClient con datos controlados | Cumple (API-01) |
| [CAL](../../.agents/rules/04-calendar-periods.md) | R08, R09, R15 | Calendario/fixtures y limites TZ | Cumple (FIN-CAL-01) |
| [FE](../../.agents/rules/05-frontend-conventions.md) | R03, R10-R13 | Tests TS y refactor de formatter UI | Cumple (FE-01) |
| [DX](../../.agents/rules/06-runtime-configuration.md) | R18-R21, R23 | Aclaracion bilingue de arranque/entorno | Cumple (DX-01) |

## Protocolo de prueba

1. Registrar el prompt exacto y el contexto/archivos autorizados.
2. Pedir lectura del routing del repositorio, sin incluir en el prompt las
   respuestas que se esperan de la regla. Registrar evidencia de lectura,
   no solo una declaracion de que se cumplio.
3. Revisar la respuesta y el diff frente a criterios previamente definidos.
4. Ejecutar los checks focalizados pertinentes; distinguir los del agente
   de los del coordinador y los pendientes/bloqueados.
5. Si un criterio falla, conservar la salida, corregir la regla o aclarar el
   prompt y repetir. No debilitar el criterio para obtener un aprobado.
6. Un veredicto vale para la tarea y condiciones observadas, no para cada
   clausula condicional de la regla ni para todos los modelos/clientes.

## Ejecuciones y revisiones

### DX-01 (06-runtime-configuration.md)

- **Regla / propuestas:** DX, R18-R21, R23.
- **Tarea real:** aclarar en README.md y README.es.md la diferencia entre el
  puerto HTTP 8000 y el puerto Debugpy 5678, y a donde apunta realmente el
  proxy `/api` de Vite (`backend:8000` de Compose, no `localhost:8000` del host).
- **Agente:** contexto separado (general-purpose, sin contexto previo de esta
  sesion), tarea de documentacion exclusivamente.
- **Prompt exacto:** instruccion de leer `AGENTS.md` y el enrutamiento antes de
  editar, nombrar IDs de regla leidos, aclarar los dos puntos anteriores en
  ambos README, prohibicion explicita de tocar codigo/config/puertos o iniciar
  servicios, y reportar diff, verificacion de enlaces y limites no verificados.
- **Lectura de reglas reportada:** WF (todo el trabajo) y DX (Docker/Vite/
  startup docs); el agente razono explicitamente por que FIN/API/CAL/FE no
  aplicaban a esta tarea, en vez de leerlas por rutina.
- **Salida revisada:** el agente contrasto los hechos contra
  [docker-compose.yml](../../docker-compose.yml), [backend/Dockerfile](../../backend/Dockerfile)
  y [vite.config.ts](../../frontend/vite.config.ts) antes de escribir (DX
  instruccion 1), en vez de confiar solo en el texto de la regla. Anadio un
  parrafo equivalente en ambos idiomas, sin tocar otros archivos.
- **Checks ejecutados:** `git diff --check -- README.md README.es.md` (sin
  errores); `git diff --stat -- README.md README.es.md` confirmado por el
  coordinador: solo README.md (+13) y README.es.md (+15), sin otros archivos.
  No se inicio ningun servicio ni se ejecuto `docker compose up` (correcto
  segun DX instruccion 6: inspeccion de configuracion no es verificacion runtime).
- **Iteracion:** ninguna; primer intento cumplio los criterios.
- **Veredicto:** Cumple. El agente aplico WF y DX correctamente, verifico contra
  codigo real antes de documentar, mantuvo el cambio en el alcance pedido y
  reporto explicitamente lo que no verifico (proxy en runtime, fallo de
  resolucion fuera de Compose). Veredicto valido para esta tarea de
  documentacion; no prueba que el agente aplique DX en un cambio de
  configuracion real.

### API-01 (03-api-contracts.md)

- **Regla / propuestas:** API, R02, R04 (y FIN R01/R05-R07 de forma secundaria
  por tratarse de aritmetica financiera).
- **Tarea real:** fortalecer `test_metrics_summary_by_month_returns_balances`
  en [test_routes.py](../../backend/tests/test_routes.py) con un dataset
  controlado via `monkeypatch` sobre `generate_mock_movements` y un esperado
  calculado a mano, verificando `period`/`income`/`outcome`/`net` exactos en
  vez de solo status/claves.
- **Agente:** contexto separado, solo backend/tests, sin tocar frontend ni
  firmas de rutas/modelos.
- **Prompt exacto:** leer AGENTS.md y enrutamiento antes de editar, nombrar
  IDs/alcance, usar dataset controlado con monkeypatch y restauracion
  automatica, calcular el esperado de forma independiente a la logica del
  backend, verificar valores exactos con TestClient, ejecutar el comando
  pytest indicado y reportar diff, salida literal, cuenta del esperado y limites.
- **Lectura de reglas reportada:** WF, FIN (aritmetica financiera), API
  (contrato de la ruta y patching del generador) y CAL (campo `period`,
  parcialmente, sin tocar parsing de fechas); descarto FE y DX con
  justificacion explicita de por que no aplicaban.
- **Salida revisada por el coordinador:** `git diff -- backend/tests/test_routes.py`
  confirma que el unico cambio es el import de `FinancialMovement` y el cuerpo
  de ese test; no se tocaron rutas, modelos ni otros tests.
  Se verifico en [routes.py](../../backend/app/routes.py) (lineas 255-386) que
  `/api/metrics/summary` llama a `generate_mock_movements` en el mismo modulo,
  por lo que `monkeypatch.setattr(routes, "generate_mock_movements", ...)`
  si intercepta la llamada real del endpoint.
- **Checks ejecutados:** el coordinador re-ejecuto de forma independiente
  `uv run --no-project --python 3.13 --with-requirements backend/requirements.txt pytest backend/tests/test_routes.py -q`
  desde `backend/`: `15 passed, 1 warning in 0.71s` (el warning es preexistente
  de FastAPI/Starlette sobre httpx, no relacionado con el cambio).
- **Calculo independiente verificado:** con los 5 movimientos controlados,
  enero = income 200.0 (mov. 1) - outcome 50.0 (mov. 2) = net 150.0; febrero =
  income 125.0 (mov. 3 + 5) - outcome 40.0 (mov. 4) = net 85.0. Coincide con lo
  que afirma el test y con la respuesta real de la ruta.
- **Iteracion:** ninguna; primer intento cumplio los criterios.
- **Limites explicitos del propio ejercicio:** no cubre `group_by=day/week`
  con dataset controlado, filtros combinados (`category`, `business_type`,
  rango de fechas) en el mismo test, fronteras de huso horario, ni lista vacia
  para `/api/metrics/summary`. `test_metrics_summary_by_week_honors_business_type_filter`
  sigue siendo un test debil (solo status/no-vacio); queda fuera de esta tarea.
- **Veredicto:** Cumple. El agente aplico API y FIN correctamente: dataset
  controlado, generador parcheado en el punto correcto, esperado independiente
  verificado por el coordinador, y limites reportados con honestidad en vez de
  afirmar cobertura que no tiene.

### FE-01 (05-frontend-conventions.md)

- **Regla / propuestas:** FE, R03, R10-R13.
- **Tarea real:** en [profit-percent-chart.tsx](../../frontend/src/components/dashboard/profit-percent-chart.tsx),
  el tooltip duplicaba `value.toFixed(1)}%` en vez de usar `formatPercent` ya
  exportada por [financial-utils.ts](../../frontend/src/lib/financial-utils.ts)
  (mismo patron que `income-outcome-chart.tsx` ya usa con `formatCurrency`).
  Se pidio refactorizar solo esa linea para reutilizar el formatter compartido,
  sin tocar el `tickFormatter` del eje Y (0 decimales, caso de uso distinto).
- **Agente:** contexto separado, cambio de un solo archivo de componente.
- **Prompt exacto:** leer AGENTS.md y enrutamiento antes de editar, nombrar
  IDs/alcance, refactorizar el tooltip para usar `formatPercent` importado,
  no tocar el eje Y ni otros archivos, ejecutar lint y build, y reportar diff,
  salida literal, verificacion estatica de que no cambio loading/vacio/estado,
  y limites no verificados (sin navegador real).
- **Lectura de reglas reportada:** WF y FE directamente; evaluo FIN (vive en
  frontend/src/lib) y concluyo correctamente que no aplicaba porque no se
  toco ninguna formula, fixture ni test en ese alcance, solo el consumo de
  una funcion ya existente desde un componente; descarto CAL/API/DX con
  justificacion.
- **Salida revisada por el coordinador:** `git diff -- frontend/src/components/dashboard/profit-percent-chart.tsx`
  confirma un cambio de dos lineas (import + uso de `formatPercent`), el
  `tickFormatter` del eje Y permanece intacto, y `git status --porcelain`
  confirma que no se tocaron `income-outcome-chart.tsx` ni `financial-utils.ts`.
- **Checks ejecutados:** el coordinador re-ejecuto
  `npm --prefix frontend run lint` de forma independiente: sin errores ni
  warnings (exit 0). El agente tambien reporto `npm --prefix frontend run build`
  con `tsc -b && vite build` exitoso (2290 modulos, build en 1.57s, exit 0);
  el aviso de chunk >500kB es preexistente y no se origina en este cambio.
- **Verificacion de comportamiento sin navegador:** el agente comparo el JSX
  de los estados de loading y vacio (sin cambios en el diff) y confirmo que
  `formatPercent(value)` produce exactamente el mismo string que la expresion
  inline que remplazo, para el mismo tipo de entrada.
- **Iteracion:** ninguna; primer intento cumplio los criterios.
- **Limites explicitos:** no se renderizo en navegador real ni se verifico
  visualmente el tooltip; no se anadio ni ejecuto un test de componente para
  esta pieza (no existia uno y la tarea era de refactor, no de tests); no se
  probaron valores numericos extremos mas alla de la equivalencia de formula.
- **Veredicto:** Cumple. El agente aplico FE correctamente: reutilizo el
  formatter compartido, preservo el caso de uso distinto del eje Y, no
  reformateo nada mas, corrio lint/build y documento honestamente la falta
  de verificacion visual en navegador.

### FIN-CAL-01 (02-financial-domain.md y 04-calendar-periods.md)

- **Regla / propuestas:** FIN (R01, R05-R07) y CAL (R08, R09, R15), demostradas
  en una misma tarea tal como permite el roadmap cuando el registro explica
  cual se aplico y su check.
- **Tarea real:** anadir en
  [financial-utils.test.ts](../../frontend/src/lib/financial-utils.test.ts) un
  caso NUEVO para `computeMonthlyData` con un movimiento el primer dia de mes
  ("2024-02-01") y otro el ultimo dia del mes anterior ("2024-01-31"), sin
  modificar `financial-utils.ts` ni asumir el resultado antes de ejecutarlo.
- **Agente:** contexto separado, solo el archivo de test frontend.
- **Prompt exacto:** leer AGENTS.md y enrutamiento antes de editar, nombrar
  IDs/alcance, no asumir el resultado de la frontera sino ejecutar y confirmar
  el comportamiento real, calcular el esperado a mano sin copiar la formula
  interna, indicar la TZ usada, no "corregir" ningun defecto encontrado sino
  documentarlo como hallazgo, ejecutar el comando Vitest indicado y reportar
  diff, salida, calculo, TZ/hallazgo y limites.
- **Lectura de reglas reportada:** WF, FIN y CAL explicitamente, citando el
  hallazgo ya documentado en CAL sobre offsets UTC negativos; reviso FE por
  tratarse de un `.test.ts` pero concluyo que no aportaba contenido adicional
  porque no se tocaron formatters/componentes/estilos.
- **Salida revisada por el coordinador:** `git diff` confirma una unica
  adicion (un `it(...)` nuevo, sin tocar los 5 tests existentes ni
  `financial-utils.ts`). El coordinador re-ejecuto de forma independiente
  `npm --prefix frontend test -- src/lib/financial-utils.test.ts`:
  `Test Files 1 passed (1)`, `Tests 6 passed (6)`.
- **Calculo independiente verificado:** enero 2024 solo tiene el movimiento
  del 31-ene (outcome 7) -> income 0, outcome 7, profitPercent 0 (sin ingreso
  positivo); febrero 2024 solo tiene el del 01-feb (income 10) -> income 10,
  outcome 0, profitPercent 100. Coincide con las aserciones del test y con la
  ejecucion real.
- **TZ y hallazgo (no corregido, solo documentado):** sin `TZ` fijada en la
  configuracion de Vitest/Node, el test corrio con la TZ del sistema
  (Europe/Madrid, offset +60, positivo), donde la frontera no se desplaza. El
  agente reprodujo aparte, con un script Node aislado (no en el archivo de
  test), que con un offset negativo (America/Los_Angeles) el mismo movimiento
  del primer dia de mes se agruparia erroneamente en el mes anterior al leer
  getters locales sobre un `Date` parseado en UTC — exactamente el riesgo que
  [CAL](../../.agents/rules/04-calendar-periods.md) ya documenta. El agente
  reporto honestamente que no logro propagar `TZ=America/Los_Angeles` al
  proceso Node del runner de test desde la herramienta Bash disponible, por lo
  que no corrio el archivo `.test.ts` real bajo offset negativo; esto se deja
  como limite explicito, no como verificacion completada.
- **Iteracion:** ninguna; primer intento cumplio los criterios y documento el
  hallazgo sin intentar ocultarlo ni "arreglarlo" fuera de alcance.
- **Limites explicitos:** no se probo `computeKPIs`, el backend, ni otros
  componentes de UI; no se ejecuto lint/build (no aplicable, cambio solo de
  test); no se corrio el archivo de test bajo offset negativo real.
- **Veredicto:** Cumple. El agente aplico FIN y CAL correctamente: fixture
  pequena y explicita, calculo independiente verificado, TZ declarada, y un
  hallazgo real de calendario documentado con honestidad en vez de maquillado
  o corregido fuera de alcance — el comportamiento exacto que WF y CAL exigen.

## Resumen de cobertura

Las 6 reglas (WF, FIN, API, CAL, FE, DX) tienen al menos un ejercicio real con
prompt exacto, salida revisada, checks ejecutados y veredicto registrado. WF
se valida transversalmente en los cuatro ejercicios (DX-01, API-01, FE-01,
FIN-CAL-01): en todos el agente nombro los IDs de regla leidos antes de
editar, mantuvo el cambio dentro del alcance pedido y reporto limites con
honestidad. Ningun ejercicio requirio mas de una iteracion. Pendiente:
decision del mantenedor sobre si este conjunto de evidencia es suficiente
para cerrar el hito 3.3/3.4 y proceder al commit de fase 3 (hito 3.5).

## Cierre

Las 6 reglas tienen ejercicio real, revision del coordinador y veredicto
"Cumple" sin necesidad de iteracion correctiva (ver DX-01, API-01, FE-01,
FIN-CAL-01 arriba). Durante la ejecucion se detecto y corrigio una
reorganizacion documental (ver seccion "Reorganizacion documental durante
fase 3") que no formaba parte de ninguna tarea asignada; se resolvio
confirmando intencion con el mantenedor y reparando enlaces, sin perder
contenido.

Pendiente de decision del mantenedor: si esta evidencia es suficiente para
cerrar los hitos 3.3 y 3.4 del roadmap, o si se requiere una iteracion
adicional sobre alguna regla antes del commit de fase 3 (hito 3.5). Una
regla escrita no equivale a una regla probada; este documento registra la
prueba, no una aprobacion de cierre que corresponde al mantenedor.
