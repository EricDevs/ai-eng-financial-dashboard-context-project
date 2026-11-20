# Roadmap proyecto 3: desarrollo guiado por especificaciones

Fecha de creacion: 2026-11-15. Objetivo: entregar las especificaciones de la capa frontend (tipos TypeScript, componentes y contrato de datos) para tres funcionalidades del dashboard, verificadas contra `/docs` en vivo. **No se implementa nada**: ni componentes React, ni llamadas `fetch`, ni cambios de backend.

Este archivo es el registro de seguimiento. Se actualiza al cerrar cada hito, con fecha y evidencia. Formato y disciplina heredados de [ROADMAP-Project-2.md](ROADMAP-Project-2.md).

## 1. Alcance

Funcionalidades pedidas por el PM (se resuelven en la spec, no en codigo):

| # | Funcionalidad | Endpoints relevantes |
| --- | --- | --- |
| F1 | Filtro de rango de fechas (inicio/fin opcionales, `YYYY-MM-DD`) en el dashboard principal; mostrar fecha minima y maxima del dataset junto a los inputs | `GET /api/metrics/facets` + filtros sobre `GET /api/metrics` |
| F2 | Tabla de alertas de anomalias: periodo, outcome, media movil de 3 periodos previos, incremento porcentual; umbral configurable (0.01 a 1.0, por defecto 0.3); estado vacio explicito; respeta el rango de F1 | `GET /api/metrics/alerts?threshold=<ratio>` |
| F3 | Pagina comparativa B2B vs B2C: dos tablas top-5 de categorias de ingreso (nombre, total, % del grupo) y un grafico unico de totales; filtro por rango de fechas; categorias por grupo obtenidas de facets | `GET /api/metrics/categories/top?operation_type=income&limit=5` y `GET /api/metrics/facets` |

Entregables finales: `frontend/specs/api-types.ts`, `frontend/specs/param-types.ts`, `frontend/specs/components.md`, `frontend/specs/README.md`.

Reglas de trabajo aplicables: [WF](../../.agents/rules/01-workflow-evidence.md) (todas las tareas). FIN, API, CAL y FE se leen cuando una fase toque su dominio (tipos de API, fechas/periodos, convenciones TS). Metodo: el agente explora y redacta; el mantenedor verifica cada afirmacion contra `/docs` y marca con ✅ verificada / ❌ incorrecta / ❓ sin verificar; se corrige con el agente antes de commitear.

## 2. Estrategia de ramas y PR

La rama `feature/frontend-specs` es obligatoria en el entregable. Para cumplir tambien un PR por fase:

- `feature/frontend-specs` es la **rama de integracion**, creada desde `main` actualizado.
- Cada fase trabaja en su propia rama `feature/frontend-specs-faseN-<tema>` creada desde la rama de integracion y se integra con un **PR hacia `feature/frontend-specs`**.
- Al cerrar la fase 4, un **PR final de `feature/frontend-specs` hacia `main`** entrega el conjunto.
- Commits separados para tipos, componentes y contrato de datos. Antes de cada commit: `git status --short`, rutas explicitas (nunca `git add .`), revisar `git diff --cached`, conservar el hash aqui.
- Todos los PRs (de fase y final) se integran con **merge commit, sin squash ni rebase**, para conservar en el historial el desglose por fase y el nombre de cada subrama. La descripcion del PR final lista los PRs de fase.
- No eliminar ramas antes del merge; no commitear ni hacer merge sin aprobacion del mantenedor.

Estados de hito: pendiente, en curso, bloqueado, en revision, completado.

## 3. Fase 1: exploracion de la API y preparacion

Rama: `feature/frontend-specs-fase1-api-exploration`. PR hacia `feature/frontend-specs`.

| Hito | Acciones | Evidencia | Estado |
| --- | --- | --- | --- |
| 1.1 Preparar repo | Confirmar `memory-bank/` y `.agents/rules` commiteados (hoy hay `.gitignore` modificado sin commitear: decidir con el mantenedor); `git switch -c feature/frontend-specs`; crear `frontend/specs/` | `git status`, rama creada | completado 2026-11-15: rama de integracion `feature/frontend-specs`, `.gitignore` commiteado (`92f3c74`) y `frontend/specs/` creada |
| 1.2 Levantar backend y abrir `/docs` | `docker compose up --build`; abrir `http://localhost:8000/docs` y `/openapi.json` | Captura o salida de `/openapi.json` | completado 2026-11-15: backend con Compose y `/openapi.json` consultado |
| 1.3 Mapear endpoints F1-F3 | Por funcionalidad: ruta, metodo, parametros de query (tipo, obligatorio, rango), forma de respuesta, campos. Probar con peticiones reales, incluidos casos limite (sin datos, umbral fuera de rango, una sola fecha) | `frontend/specs/verification.md` (rastro corto) | completado 2026-11-15: F1, F2 y F3 con llamadas reales y casos limite |
| 1.4 Contrastar con el frontend | Revisar patrones de fetch/tipos existentes en [financial-types.ts](../../frontend/src/lib/financial-types.ts), [vite.config.ts](../../frontend/vite.config.ts) y componentes dashboard | Notas en `verification.md` | completado 2026-11-15: patron de fetch de `App.tsx` resumido en la cabecera de `verification.md`; proxy tomado de 01-structure.md. No se reviso `financial-types.ts` en detalle: pendiente para la fase 2 |
| 1.5 Anotar desajustes PM vs API | Listar diferencias entre el wording del PM y los campos reales (p. ej. nombres de campo, formato de `outcome`, semantica del umbral, si `/metrics` admite filtros de fecha, de donde salen las categorias B2B/B2C). Resolverlas en la spec | Tabla de desajustes con resolucion y marca ✅/❌/❓ | completado 2026-11-15: 6 desajustes de F2 y 6 de F3 resueltos en la spec; 3 de F1 |
| 1.6 Commit y PR de fase | Commit `docs: record API exploration for frontend specs`; PR a la rama de integracion | Hash y numero de PR | completado 2026-11-15: commit `8700ece`, PR #5, merge `68969c3` |

Checklist de cierre:

- [x] Rama de integracion y `frontend/specs/` creadas.
- [x] Endpoints, parametros y respuestas de F1-F3 trazables a `/docs`.
- [x] Desajustes PM vs API anotados y con resolucion propuesta.
- [x] Rastro de verificacion guardado.
- [x] PR de fase 1 abierto, revisado y mergeado en la rama de integracion.

## 4. Fase 2: tipos TypeScript

Rama: `feature/frontend-specs-fase2-types`. PR hacia `feature/frontend-specs`. Lee la regla API antes de empezar.

| Hito | Acciones | Evidencia | Estado |
| --- | --- | --- | --- |
| 2.1 `api-types.ts` | El agente redacta `FacetsResponse`, `AlertEntry`, `AlertsResponse`, `CategoryEntry`, `TopCategoriesResponse`. Sin `any`, sin `object`; TypeScript estricto | `frontend/specs/api-types.ts` | completado 2026-11-15: commit `c3968a0` (api-types), `d3ac183` (param-types) |
| 2.2 `param-types.ts` | `DateRangeFilter` (inicio/fin opcionales, `string`, JSDoc `YYYY-MM-DD`); `AlertsParams` y `TopCategoriesParams` extienden o incluyen `DateRangeFilter` | `frontend/specs/param-types.ts` | completado 2026-11-15: commit `c3968a0` (api-types), `d3ac183` (param-types) |
| 2.3 JSDoc completo | Cada propiedad: significado, valores validos, formato cuando aplique | Revision del archivo | completado 2026-11-15: commit `c3968a0` (api-types), `d3ac183` (param-types) |
| 2.4 Verificar contra OpenAPI | El mantenedor contrasta cada nombre y tipo con `/openapi.json` en vivo; marca ✅/❌/❓ y se corrige con el agente | Tabla de verificacion en `verification.md` | completado 2026-11-15: 6 comprobaciones contra Swagger por el mantenedor, todas ✅ (seccion "Verificacion de tipos contra OpenAPI" en `verification.md`, commit `7a99a78`) |
| 2.5 Commit y PR de fase | Commits separados (api-types, param-types) o uno por archivo; mensaje `docs: add API response and param types verified against OpenAPI`; PR | Hashes y numero de PR | completado 2026-11-15: PR #6, merge `96a0fc7` |

Checklist de cierre:

- [x] Todas las interfaces de respuesta coinciden con OpenAPI en vivo; sin `any` ni `object`.
- [x] `DateRangeFilter` con ambos campos opcionales, `string`, JSDoc `YYYY-MM-DD`.
- [x] `AlertsParams` y `TopCategoriesParams` incluyen `DateRangeFilter`.
- [x] Cada propiedad con JSDoc.
- [x] PR de fase 2 mergeado en la rama de integracion.

## 5. Fase 3: especificacion de componentes

Rama: `feature/frontend-specs-fase3-components`. PR hacia `feature/frontend-specs`. Lee la regla FE antes de empezar.

| Hito | Acciones | Evidencia | Estado |
| --- | --- | --- | --- |
| 3.1 Componentes F1 | Selector de rango de fechas: props con tipos de fase 2, referencia de rango min/max cerca de los inputs, comportamiento con **un solo input** de fecha, estados vacio/carga/error | Seccion F1 de `components.md` | completado 2026-11-16: seccion en `components.md` con componentes, props, estados y criterios EARS (commit `b5e94c3`) |
| 3.2 Componentes F2 | Tabla de alertas + input de umbral (0.01 a 1.0, defecto 0.3): cuatro columnas, **estado vacio explicito**, respeto del rango de F1, validacion del umbral | Seccion F2 | completado 2026-11-16: seccion en `components.md` con componentes, props, estados y criterios EARS (commit `b5e94c3`) |
| 3.3 Componentes F3 | Pagina B2B vs B2C: dos paneles de tabla top-5 y un grafico unico; **renderizado vacio de top-5 en cada panel**; filtro de fechas; categorias desde facets | Seccion F3 | completado 2026-11-16: seccion en `components.md` con componentes, props, estados y criterios EARS (commit `b5e94c3`) |
| 3.4 Alinear y resolver ambiguedades | Props alineadas con `api-types.ts`/`param-types.ts`; ambiguedades del PM resueltas y listadas; renderizado condicional por funcionalidad; reutilizar primitivas existentes (Card, Skeleton, tokens) | `components.md` completo | completado 2026-11-16: 5 decisiones de producto resueltas con el mantenedor y registradas (pestanas por estado, filtro compartido, estado vacio de alertas, umbral al cambiar, top vacio por panel y grafico de dos barras) |
| 3.5 Verificar y commit/PR | El mantenedor verifica nombres de props y tipos contra la fase 2; commit `docs: add component specs for the three features`; PR | Hash y numero de PR | completado 2026-11-16: verificado por el mantenedor; PR #7, merge `4d307ba` |

Checklist de cierre:

- [x] `components.md` nombra cada componente, sus props con tipos y su renderizado condicional, por funcionalidad.
- [x] Estado vacio de la tabla de anomalias especificado.
- [x] Comportamiento con un solo input de fecha especificado.
- [x] Ambos paneles B2B/B2C especifican renderizado vacio del top-5.
- [x] PR de fase 3 mergeado en la rama de integracion.

## 6. Fase 4: contrato de datos y cierre

Rama: `feature/frontend-specs-fase4-data-contract`. PR hacia `feature/frontend-specs`, y despues PR final a `main`.

| Hito | Acciones | Evidencia | Estado |
| --- | --- | --- | --- |
| 4.1 Redactar `README.md` | Por funcionalidad: endpoint(s) con rutas verificadas en `/docs`; tipos de peticion y respuesta; valores validos y restricciones de cada parametro; **al menos 2 casos limite** y que debe mostrar la UI | `frontend/specs/README.md` | completado 2026-11-16: `README.md` con F1, F2 y F3 (commit `18e1c37`) |
| 4.2 Prueba de handover | Leerlo como si se entregara a una sesion nueva del agente; corregir lo que provocaria preguntas de seguimiento (opcional: sesion limpia que lo resuma sin ayuda) | Notas de la revision | completado 2026-11-16: lectura del mantenedor como sesion nueva; una duda (media movil de 3 periodos) resuelta con una correccion de redaccion en verification.md y README (commit `127bed9`) |
| 4.3 Compilar tipos | Ejecutar `npx tsc --noEmit` desde `frontend/` (pedido por el enunciado) y ademas la comprobacion explicita `tsc --ignoreConfig --noEmit --strict ... specs/*.ts`, porque el primero no cubre `specs` (hallazgo en [verification.md](../../frontend/specs/verification.md)). No se modifica la configuracion del proyecto | Salida del comando | completado 2026-11-16: ambos comandos con exit 0 (`npx tsc --noEmit` y la comprobacion estricta sobre specs), registrados en verification.md |
| 4.4 Revision de alcance | Confirmar: sin componentes React, sin `fetch`, sin cambios de backend (`git diff --stat` contra `main`) | Salida de `git diff --stat` | completado 2026-11-16: `git diff --stat origin/main...HEAD` muestra 6 archivos, todos en `docs/` y `frontend/specs/`; sin cambios en `backend/` ni `frontend/src/`; sin `fetch(` en las specs |
| 4.5 Commit y PR de fase | Commit `docs: add data contract README for frontend specs`; PR a la rama de integracion | Hash y numero de PR | completado 2026-11-16: PR #8, merge `977376e` |
| 4.6 PR final a `main` | Abrir PR `feature/frontend-specs` -> `main` con resumen de las cuatro fases; merge solo con aprobacion del mantenedor | Numero de PR y merge | completado 2026-11-16: PR #9, merge `24884e1` en `main` con merge commit |

Checklist de cierre:

- [x] `README.md` cubre las tres funcionalidades con endpoints, tipos, parametros y al menos 2 casos limite cada una.
- [x] Revisado como handover a sesion nueva.
- [x] `npx tsc --noEmit` sin errores.
- [x] Sin componentes React, llamadas `fetch` ni cambios de backend.
- [x] PR de fase 4 y PR final a `main` abiertos y aprobados.

## 7. Criterios de evaluacion (checklist global)

- [x] Exploracion de API trazable a `/docs`, sin nombres de campo inventados.
- [x] Interfaces de respuesta coinciden con OpenAPI en vivo; sin `any`.
- [x] `DateRangeFilter`: ambos campos opcionales, `string`, JSDoc `YYYY-MM-DD`.
- [x] `AlertsParams` y `TopCategoriesParams` extienden o incluyen `DateRangeFilter`.
- [x] `components.md`: componentes, props tipadas y renderizado condicional por funcionalidad.
- [x] Estado vacio de anomalias, comportamiento con un solo input de fecha y top-5 vacio B2B/B2C especificados.
- [x] `README.md` con endpoints, tipos, parametros y >= 2 casos limite por funcionalidad.
- [x] `npx tsc --noEmit` compila.
- [x] Trabajo en `feature/frontend-specs` con commits significativos que se lean como trabajo asistido y verificado.
- [x] Sin componentes React, `fetch` ni cambios de backend.

## 8. Control de cierre

| Fase | Rama | PR | Commits | Estado |
| --- | --- | --- | --- | --- |
| 1 Exploracion | `feature/frontend-specs-fase1-api-exploration` | PR #5 | `8700ece` (merge `68969c3`) | completada 2026-11-15 |
| 2 Tipos | `feature/frontend-specs-fase2-types` | PR #6 | `c3968a0`, `d3ac183`, `7a99a78` (merge `96a0fc7`) | completada 2026-11-15 |
| 3 Componentes | `feature/frontend-specs-fase3-components` | PR #7 | `d17300f`, `cba0443`, `b5e94c3` (merge `4d307ba`) | completada 2026-11-16 |
| 4 Contrato de datos | `feature/frontend-specs-fase4-data-contract` | PR #8 | `7c5ddfc`, `127bed9`, `18e1c37` (merge `977376e`) | completada 2026-11-16 |
| Final | `feature/frontend-specs` -> `main` | PR #9 | n/a (merge `24884e1`) | completada 2026-11-16 |

Definition of Done: las cuatro fases cerradas con su PR y commits identificables, la rama de integracion mergeada en `main`, todas las afirmaciones de API verificadas (✅) o explicitamente marcadas (❓), y ningun resultado inventado. Una fase bloqueada sigue abierta aunque se haya escrito su documento.

## 9. Ampliacion v2: planes, implementacion y prueba de traspaso

Fecha de apertura: 2026-11-18. Continua el ejercicio: comprobar que las specs permiten desarrollar las tres funcionalidades sin que el agente tenga dudas ni tome decisiones por su cuenta. La restriccion "no se implementa nada" del encabezado vale para las fases 1-4; en esta ampliacion si se implementa.

Ciclo de trabajo: la spec se versiona (v1.1 en adelante) y, por cada version, se actualizan el plan y la implementacion. Git guarda el historial; los archivos reflejan la ultima version aprobada.

### 9.1 Ramas y PR

Mismas reglas que la seccion 2: rama de integracion `feature/frontend-specs-v2` (desde `main` actualizado, `43248bf`), una rama por fase con PR hacia ella y merge commit, y PR final a `main`. No commitear ni hacer merge sin aprobacion del mantenedor.

| Fase | Rama | Contenido |
| --- | --- | --- |
| 5 Planes y mejora de specs | `feature/frontend-specs-v2-fase5-plans` | Spec v1.1 a v1.4 (`components.md`, `README.md`), planes de [docs/plans](../plans) y esta seccion |
| 6 F1 (iteracion 1) | `feature/frontend-specs-v2-fase6-f1` | Codigo de F1, tests y evidencia en `docs/validations/08-features-checks.md` |
| 7 F2 (iteracion 1) | `feature/frontend-specs-v2-fase7-f2` | Plan F2 adaptado a la spec vigente, codigo, tests, prueba visual y correcciones de spec |
| 8 F3 (iteracion 1) | `feature/frontend-specs-v2-fase8-f3` | Igual para F3 |
| 9 Prueba de traspaso | `feature/frontend-specs-v2-fase9-handover` | Ejecucion limpia y su evidencia |

### 9.2 Fase 9: prueba de traspaso

- Rama `feature/frontend-specs-v2-fase9-handover` creada desde el merge de la fase 5 (`87be002`, sin codigo de la iteracion 1), con la spec final v1.8 traida de la integracion (`4b642a5`) y sin `docs/plans` (`c625ae3`): el agente no puede leer los planes aunque la spec los enlace. Corrige la version anterior de esta seccion, que partia de la spec v1.4 del merge de la fase 5.
- Chat nuevo, sin contexto previo. El agente lee la spec y AGENTS.md, **genera su propio plan y sus tareas** (no se le dan los planes de `docs/plans`: el objetivo es comprobar que la spec basta), el mantenedor revisa ese plan y el agente implementa a partir de el. Despues se compara su plan con los entregados. Prompt exacto y resultados en [09-handover-checks.md](../validations/09-handover-checks.md).
- La evidencia, esta seccion y las correcciones de la spec van en la rama `feature/frontend-specs-v2-fase9-evidence`, creada desde la integracion, con su PR.
- En cada etapa el agente anota toda pregunta o decision que la spec no resuelva. Criterio de exito: tests en verde, prueba visual del mantenedor correcta y **ninguna decision propia del agente**. Cada decision anotada es un hueco de la spec: se corrige y se repite.
- Se integran la evidencia y las correcciones de la spec. El codigo de la iteracion 1 (fases 6-8) es el que queda en la rama de integracion; el de la fase 9 se conserva en su rama para comparar, porque integrarlo encima obligaria a resolver conflictos en los mismos archivos.

### 9.3 Control de cierre v2

| Fase | Rama | PR | Commits | Estado |
| --- | --- | --- | --- | --- |
| 5 Planes y specs | `feature/frontend-specs-v2-fase5-plans` | PR #18 | `b880d90` (spec v1.4), `9297324` (planes de la iteracion 1, con codigo), `4e51f0a` (planes de entrega, sin codigo), `f486623` (spec v1.5 y planes F2/F3 v5.1), `a6aaf55` (registro del PR) (merge `87be002`) | completada 2026-11-18 |
| 6 F1 | `feature/frontend-specs-v2-fase6-f1` (creada sobre la fase 5, no sobre la integracion: el codigo implementa la spec v1.4 y la evidencia enlaza a los planes) | PR #19 | `e5a08bb` (codigo), `3189afa` (evidencia), `9e87cd3` (registro) (merge `074dcf4`) | completada 2026-11-19; prueba visual aprobada (2 rondas) |
| 7 F2 | `feature/frontend-specs-v2-fase7-f2` (creada sobre la fase 6: F2 usa el codigo de F1) | PR #20 | `acc8080`, `3662688`, `13c7917`, `afd274c` (tareas 1-4); `6ad24d6`, `ea98a96`, `b3a0a1b`, `4a47b1f`, `ba7b337`, `04ab5df` (spec v1.6-v1.8 y sus cambios); `fc601b5` (evidencia), `44c3040` (registro) (merge `b3228b8`) | completada 2026-11-19; prueba visual aprobada (4 rondas) |
| 8 F3 | `feature/frontend-specs-v2-fase8-f3` (desde la integracion con F1 y F2) | PR #21 | `f53139b` (merges de las fases 6 y 7 en el roadmap), `155c5b6` (plan v5.2); `177e987`, `e3f78fd`, `267597c`, `ee31a2b`, `54365e3`, `0062490` (tareas 1-6); `3bfe8b0` (plan v5.3), `c8dce42` (evidencia), `0246288` (registro) (merge `152e454`) | completada 2026-11-19; prueba visual aprobada (1 ronda, sin cambios de spec) |
| 9 Traspaso | `feature/frontend-specs-v2-fase9-handover` (desde `87be002`, no se integra) y `feature/frontend-specs-v2-fase9-evidence` (desde la integracion) | PR pendiente | Traspaso: `4b642a5` (spec v1.8), `c625ae3` (sin planes), `0102f10` y `d1ef2e6` (spec v1.9 y v1.10) y 22 commits del agente hasta `20b43c3`. Evidencia: `a522467` (protocolo y prompt); `02cd62d`, `670fe6c`, `54ee951` (spec v1.9 a v1.11); `197275c`, `4be8574`, `cb75242` (planes); `46b2afd` (grafico de F3), `4a7571d`, `3ecc51e` (tests); `5599a85`, `b0e1fae`, `d685893`, `7606126`, `c31d6fc`, `b8040a0` y el cierre (registro) | prueba superada 2026-11-20: con la spec v1.10, F1 a F3 sin decisiones de producto propias y pruebas visuales aprobadas a la primera; PR pendiente de merge |
| Final | `feature/frontend-specs-v2` -> `main` | — | — | pendiente |
