# Status

Revision: 2026-11-18, F1 de la ampliacion v2 del proyecto 3 (antes: 2026-11-17, cierre del proyecto 4). Fuentes: [01-structure.md](../docs/validations/01-structure.md),
[03-verification-resume.md](../docs/validations/03-verification-resume.md),
[02-handover-checks.md](../docs/validations/02-handover-checks.md),
[05-rules-checks.md](../docs/validations/05-rules-checks.md),
[07-agent-skills-checks.md](../docs/validations/07-agent-skills-checks.md) y
commits reales de los proyectos 2-4. Resumen del proyecto 4 en
[progress.md](progress.md). "Implementado" significa visto en codigo; "probado"
enlaza el check que lo demuestra.

## Implementado y probado

- Nueve rutas GET propias (`/health`, `/api/metrics`, `/facets`, `/summary`,
  `/categories/top`, `/comparison`, `/alerts`, `/b2b`, `/b2c`) con casos
  concretos y dos controles negativos (parametro invalido, fechas requeridas
  ausentes); ver matriz de contraste en
  [03-verification-resume.md](../docs/validations/03-verification-resume.md#matriz-de-contraste-del-resumen).
- UI con cuatro KPI y dos series mensuales, consumiendo `/api/metrics` vía el
  proxy de Vite; observado en ejecucion real (UI-PROXY-01).
- 15 tests backend y 8 tests frontend (6 de utilidades + 2 de estados de
  carga y error de `App`, proyecto 4) pasan; lint y build de frontend pasan
  sin avisos. Ver [stack.md](stack.md) para los comandos.
- Seis reglas de agente (`WF`, `FIN`, `API`, `CAL`, `FE`, `DX`) en
  [.agents/rules](../.agents/rules), cada una validada con una tarea real y
  registrada en [05-rules-checks.md](../docs/validations/05-rules-checks.md).
- Proyecto 4: mejoras de accesibilidad (contraste, encabezados, nombres de
  graficas, aviso de error anunciado, `aria-busy`, movimiento reducido),
  graficas cargadas en diferido y skeletons sin salto de altura; tres skills
  comunitarias y una interna. Detalle y mediciones en [progress.md](progress.md).

## Especificado (proyecto 3) e implementacion en curso (ampliacion v2)

- Specs frontend de tres funcionalidades en [frontend/specs](../frontend/specs/README.md):
  F1 filtro de rango de fechas (`/facets` + `/api/metrics`), F2 tabla de
  alertas de anomalias (`/alerts?threshold=`) y F3 comparativa B2B vs B2C
  (`/categories/top`). Tipos verificados contra `/openapi.json` en vivo;
  evidencia en [verification.md](../frontend/specs/verification.md).
- Revision 2026-11-18 (ampliacion v2 de [ROADMAP-Project-3](../docs/entregables/ROADMAP-Project-3.md)):
  spec v1.4 con decisiones `DEC-01` a `DEC-28` y planes en [docs/plans](../docs/plans).
- **F1 implementado** (iteracion 1, fase 6): filtro de fechas con `facets`,
  validacion unica de peticion (`getDateRangeIssue`), capa de datos
  compartida (`api.ts`, `useApiResource`). 51 tests frontend; prueba visual
  del usuario aprobada en dos rondas. Evidencia en
  [08-features-checks.md](../docs/validations/08-features-checks.md).
- F2 y F3: especificadas y planificadas, sin implementar.

## Gaps conocidos (no corregidos; fuera de alcance sin acuerdo explicito)

- **Periodo de cabecera fijo vs. datos relativos al reloj**: la UI muestra
  `2024 - Full Year` pero el backend genera fechas relativas a hoy. Ver
  [overview.md](overview.md).
- **RNG global mutado**: `generate_mock_movements` llama a `random.seed(42)`,
  alterando el estado aleatorio global del proceso en vez de usar un
  generador local. No aislado (regla FIN, R07).
- **Riesgo de huso horario en agregacion mensual**: `computeMonthlyData`
  parsea fechas ISO como UTC y lee getters locales; con un offset UTC
  negativo, un movimiento del primer dia de mes puede agruparse en el mes
  anterior. Reproducido y documentado en fase 3 (FIN-CAL-01), no corregido.
- **CORS de desarrollo**: origen y metodos comodin con credenciales en
  [main.py](../backend/app/main.py); no revisado para datos reales.
- Sin base de datos persistente, sin pipeline de CI y sin pruebas
  end-to-end/navegador; los tests de componentes (jsdom) no calculan CSS ni
  layout.
- `mock-data.ts` y `hero.png` sin importacion detectada en el frontend
  inspeccionado; no se ha confirmado si son codigo muerto o uso futuro.
- 21 vulnerabilidades npm preexistentes (1 low, 12 moderate, 8 high; ninguna
  anadida en el proyecto 4) y aviso de deprecacion de httpx/TestClient, sin
  evaluar. El aviso de chunk > 500 kB se resolvio en el proyecto 4.
- **CLS intermitente 0.014** en Lighthouse, producido por la tarjeta KPI
  PROFIT; causa sin investigar. LCP de produccion 2.7-2.9 s dominado por el
  render de React, no por la red.
- Accesibilidad sin probar con lector de pantalla real, zoom al 200 % ni alto
  contraste de Windows.
- Exactitud numerica de KPI/graficas sobre la respuesta completa (360
  movimientos) end-to-end: no verificada; solo pruebas de utilidades con
  fixtures pequenas y controladas (ver [stack.md](stack.md)).

## Siguientes prioridades propuestas (no autorizan cambios de producto)

1. Completar las filas marcadas `❓` en la
   [matriz de contraste del resumen](../docs/validations/03-verification-resume.md#matriz-de-contraste-del-resumen)
   (estados UI completos, exactitud global de KPI/graficas, efecto real de
   los comandos de parada).
2. Si se acuerda un cambio de alcance: aislar el RNG, corregir el calendario
   de `computeMonthlyData` o derivar el periodo de cabecera de los datos
   reales, cada uno con su propio test de frontera antes/despues.
3. Evaluar `npm audit` y la deprecacion de httpx/TestClient; ninguno bloquea
   el funcionamiento actual.
4. Investigar el desplazamiento de la tarjeta KPI PROFIT (CLS 0.014)
   verificando con la skill `verify-frontend-change`.

Ausencia de una funcionalidad (CI, base de datos, E2E) no autoriza
construirla por iniciativa propia; requiere un acuerdo de alcance aparte.

## Commits y cierres por fase

Proyecto 2 (contexto, reglas y memoria):

| Fase | Commit(s) | Integracion |
| --- | --- | --- |
| 1 | `3f31fdd`, `73f8a49` | merge `253b3c6` via PR #1 |
| 2 | `db1285c` (incremento), `bb53ea6` (cierre) | merge `43a9cda` via PR #2 |
| 3 | `767012b` | merge `ac99882` via PR #3 |
| 4 | `d678e22`, `fadda3d`, `898af46` | merge `b09dbfa` via PR #4 |

Proyecto 3 (specs frontend), ramas de fase hacia `feature/frontend-specs`:

| Fase | Commit(s) | Integracion |
| --- | --- | --- |
| 1 Exploracion API | `8700ece` | merge `68969c3` via PR #5 |
| 2 Tipos | `c3968a0`, `d3ac183`, `7a99a78` | merge `96a0fc7` via PR #6 |
| 3 Componentes | `d17300f`, `cba0443`, `b5e94c3` | merge `4d307ba` via PR #7 |
| 4 Contrato de datos | `7c5ddfc`, `127bed9`, `18e1c37` | merge `977376e` via PR #8 |
| Final | `feature/frontend-specs` -> `main` | merge `24884e1` via PR #9 |

Proyecto 4 (agent skills), ramas de fase hacia `feature/agent-skills`:

| Fase | Commit(s) | Integracion |
| --- | --- | --- |
| 1 Preparacion y descubrimiento | `442f11d`, `4b9af5b` | merge `3ed7ade` via PR #11 |
| 2 `accessibility` | `ff050ce`, `e83eb48` | merge `98e6bc5` via PR #12 |
| 3 `vercel-react-best-practices` | `c06ede3`, `cd45cd2` | merge `23f4da1` via PR #13 |
| 4 Ecosistema (`vitest`) | `2b7f444`, `99e7066`, `7e13588` | merge `894c4eb` via PR #14 |
| 5 Skill interna | `97bce11`, `ce66108`, `04d13bb` | merge `1c25a99` via PR #15 |
| 6 Memory bank y verificacion final | `c8a29a8`, `1b8e111` | merge `95ab9e0` via PR #16 |
| Final | `feature/agent-skills` -> `main` | merge `3b98558` via PR #17 |

Detalle y evidencia en [ROADMAP-Project-2.md](../docs/entregables/ROADMAP-Project-2.md),
[ROADMAP-Project-3.md](../docs/entregables/ROADMAP-Project-3.md) y
[ROADMAP-Project-4.md](../docs/entregables/ROADMAP-Project-4.md).
