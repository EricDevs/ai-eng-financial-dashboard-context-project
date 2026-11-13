# Status

Revision: 2026-11-13, fase 4. Fuentes: [01-structure.md](../docs/validations/01-structure.md),
[verification - resume.md](../docs/validations/verification%20-%20resume.md),
[02-handover-checks.md](../docs/validations/02-handover-checks.md),
[05 - RulesChecks.md](../docs/validations/05%20-%20RulesChecks.md) y commits
reales de fases 1-3. "Implementado" significa visto en codigo; "probado"
enlaza el check que lo demuestra.

## Implementado y probado

- Nueve rutas GET propias (`/health`, `/api/metrics`, `/facets`, `/summary`,
  `/categories/top`, `/comparison`, `/alerts`, `/b2b`, `/b2c`) con casos
  concretos y dos controles negativos (parametro invalido, fechas requeridas
  ausentes); ver matriz de contraste en
  [verification - resume.md](../docs/validations/verification%20-%20resume.md#matriz-de-contraste-del-resumen).
- UI con cuatro KPI y dos series mensuales, consumiendo `/api/metrics` vía el
  proxy de Vite; observado en ejecucion real (UI-PROXY-01).
- 15 tests backend y 6 tests frontend (5 originales + 1 de frontera de mes
  anadido en fase 3) pasan; lint y build de frontend pasan. Ver
  [stack.md](stack.md) para los comandos.
- Seis reglas de agente (`WF`, `FIN`, `API`, `CAL`, `FE`, `DX`) en
  [.agents/rules](../.agents/rules), cada una validada con una tarea real y
  registrada en [05 - RulesChecks.md](../docs/validations/05%20-%20RulesChecks.md).

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
  end-to-end/navegador en los archivos inspeccionados.
- `mock-data.ts` y `hero.png` sin importacion detectada en el frontend
  inspeccionado; no se ha confirmado si son codigo muerto o uso futuro.
- Aviso de build: chunk JS superior a 500 kB sin dividir
  (FRONTEND-BUILD-01); vulnerabilidades npm y aviso de deprecacion de
  httpx/TestClient sin evaluar.
- Exactitud numerica de KPI/graficas sobre la respuesta completa (360
  movimientos) end-to-end: no verificada; solo pruebas de utilidades con
  fixtures pequenas y controladas (ver [stack.md](stack.md)).

## Siguientes prioridades propuestas (no autorizan cambios de producto)

1. Completar las filas marcadas `❓` en la
   [matriz de contraste del resumen](../docs/validations/verification%20-%20resume.md#matriz-de-contraste-del-resumen)
   (estados UI completos, exactitud global de KPI/graficas, efecto real de
   los comandos de parada).
2. Si se acuerda un cambio de alcance: aislar el RNG, corregir el calendario
   de `computeMonthlyData` o derivar el periodo de cabecera de los datos
   reales, cada uno con su propio test de frontera antes/despues.
3. Evaluar `npm audit`, el aviso de chunk grande y la deprecacion de
   httpx/TestClient; ninguno bloquea el funcionamiento actual.

Ausencia de una funcionalidad (CI, base de datos, E2E) no autoriza
construirla por iniciativa propia; requiere un acuerdo de alcance aparte.

## Commits y cierres por fase

| Fase | Commit(s) | Integracion |
| --- | --- | --- |
| 1 | `3f31fdd`, `73f8a49` | merge `253b3c6` via PR #1 |
| 2 | `db1285c` (incremento), `bb53ea6` (cierre) | merge `43a9cda` via PR #2 |
| 3 | `767012b` | merge `ac99882` via PR #3 |
| 4 | en curso | pendiente |

Detalle y evidencia completa en [ROADMAP.md](../docs/ROADMAP.md).
