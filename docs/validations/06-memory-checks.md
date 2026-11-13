# 06 - MemoryChecks

## Estado y alcance

Fase 4 iniciada el 2026-11-13 en `phase-4-project-memory`, desde el merge de
[PR #3](https://github.com/EricDevs/ai-eng-financial-dashboard-context-project/pull/3),
`ac99882`. La rama de fase 3 se elimino local y remotamente antes de crear esta.

Objetivo: auditar `memory-bank/` con una sesion sin contexto previo, siguiendo
el hito 3.3/4.3 del [roadmap](../entregables/ROADMAP-Project-2.md): pedir resumen de producto,
arranque y siguiente prioridad, y contrastar la respuesta con codigo/evidencia
real en vez de aceptarla por declaracion.

## Protocolo de prueba

1. Lanzar un agente de contexto separado (sin memoria de esta conversacion)
   con una tarea de lectura/resumen, sin revelar las respuestas esperadas.
2. El agente debe nombrar que archivos de `memory-bank` leyo y declarar
   explicitamente cualquier afirmacion no respaldada por lo leido.
3. El coordinador contrasta cada afirmacion contra el codigo/configuracion
   real (no solo contra `memory-bank`), siguiendo el mismo rigor que
   [05-rules-checks.md](05-rules-checks.md).
4. Si una afirmacion es incorrecta, inventada o sin fuente, corregir el
   documento de memoria afectado y repetir la prueba; no debilitar el
   criterio para obtener un aprobado.

## Ejecucion MEM-01

- **Agente:** contexto separado (general-purpose, sin memoria de esta
  conversacion), tarea de solo lectura/resumen sobre el repositorio real
  (no sobre una copia o descripcion de el).
- **Prompt exacto:** seguir el enrutamiento de `AGENTS.md`, responder de
  forma concisa que hace el producto, como se arranca en local y cual
  deberia ser la unica siguiente prioridad tecnica y por que; nombrar los
  archivos de `memory-bank` leidos; declarar explicitamente cualquier
  afirmacion no respaldada por lo leido en vez de omitirla. Sin revelar las
  respuestas esperadas.
- **Archivos leidos reportados:** `memory-bank/overview.md`,
  `memory-bank/stack.md`, `memory-bank/status.md`, y ademas `AGENTS.md` y
  `README.md` (siguiendo la cita de fuentes de `overview.md`/`stack.md`).
- **Resumen de producto:** correcto y completo: dashboard financiero
  React+FastAPI, cuatro KPI y dos series mensuales, calculo en el navegador
  vía `financial-utils.ts`, datos sinteticos sin base de datos persistente,
  ocho rutas analiticas no consumidas por la UI.
- **Arranque:** correcto: `docker compose up --build`, URLs 5173/8000/8000-docs,
  distincion explicita de 5678 (Debugpy, no HTTP) y del hostname `backend`
  del proxy de Vite frente a `localhost`; cito ademas los comandos de test/
  lint/build ya comprobados con sus resultados.
- **Siguiente prioridad:** identifico correctamente la primera prioridad de
  `status.md` (completar las filas `❓` de la matriz de contraste,
  especialmente exactitud global de KPI/graficas sobre los 360 movimientos)
  y razono por que es la unica no condicionada a un acuerdo de cambio de
  alcance, a diferencia de las otras dos propuestas del mismo documento.
- **Honestidad epistemica:** declaro explicitamente que no verifico el
  codigo fuente el mismo en esta tarea, que su respuesta refleja solo lo
  leido en memoria/documentacion, y repitio las advertencias que
  `overview.md`/`status.md` ya hacen sobre hechos no demostrados
  (exactitud end-to-end de KPI, uso real de `mock-data.ts`/`hero.png`).
- **Contraste del coordinador contra el codigo/evidencia real (no solo
  contra memory-bank):** `generate_mock_movements(seed=42)` y la ausencia de
  base de datos ya se verificaron contra
  [routes.py](../../backend/app/routes.py) y
  [docker-compose.yml](../../docker-compose.yml) en fase 1
  (METRICS-FULL-01, 360 movimientos). Las URLs y comandos de arranque
  citados coinciden con [README.md](../../README.md) y
  [docker-compose.yml](../../docker-compose.yml). Las filas `❓` que motivan
  la prioridad existen tal como las describe, en la
  [matriz de contraste del resumen](03-verification-resume.md#matriz-de-contraste-del-resumen).
  Ninguna afirmacion resulto inventada o sin fuente.
- **Iteracion:** ninguna; no se encontraron afirmaciones incorrectas que
  corregir en `memory-bank`.
- **Veredicto:** Cumple. La memoria permite a una sesion nueva, sin el
  contexto de esta conversacion, dar un resumen de producto, arranque y
  siguiente prioridad correcto y con limites honestos, sin inventar
  roadmaps ni afirmar cobertura no demostrada.

## Cierre

Resultado de MEM-01 registrado y sin correcciones pendientes sobre
`memory-bank`. Pendiente de aprobacion del mantenedor antes del commit de
fase 4.
