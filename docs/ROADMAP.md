# Roadmap de handover, reglas y memoria

Fecha: 2026-11-12. Objetivo: cumplir las cuatro fases de la imagen adjunta con hitos comprobables y un commit de cierre independiente por fase. Este es un plan de trabajo sobre el repositorio existente, no un roadmap de funcionalidades de producto.

## 1. Alcance y estado inicial

Esta entrega crea el [mapa de estructura](validations/01-structure.md) y este roadmap; posteriormente se consolidaron los informes en el [informe canonico](validations/verification%20-%20resume.md). No implementa aun reglas ni memoria. Al 2026-11-13, fase 1 integrada mediante PR #1 y merge `253b3c6`: nueve rutas con casos concretos, dos controles negativos, lista completa, ambas suites, lint y build contrastados. Hitos 1.1-1.7 completados; limites y riesgos permanecen explicitos. Las fases solo se cierran cuando sus criterios y su commit estan comprobados.

| Elemento | Estado observado | Evidencia |
| --- | --- | --- |
| Fork y clon | Confirmados por el mantenedor; origin apunta a EricDevs; rama inicial validation-init integrada y eliminada, rama activa phase-2-engineering-findings desde 253b3c6 | [Evidencia del hito 1.1](validations/verification%20-%20resume.md); [PHASE1-INTEGRATION-01](validations/02-handover-checks.md#phase1-integration-01-merge-limpieza-y-rama-de-fase-2) |
| Mapa de estructura y entradas | Hito 1.2 completado el 2026-11-13: mapa, servicios/puertos, nueve rutas GET y flujo UI/proxy contrastados | [01-structure.md](validations/01-structure.md), [OPENAPI-01 y UI-PROXY-01](validations/02-handover-checks.md) |
| Resumen canonico | Hito 1.3 completado mediante sintesis del mantenedor; matriz tecnica clasificada con ✅ / ❌ / ❓ y limites explicitos; contenido final aprobado por el mantenedor | [Informe canonico](validations/verification%20-%20resume.md), [SUMMARY-01](validations/02-handover-checks.md) |
| Servicios | Frontend Vite y API FastAPI declarados en Compose | [docker-compose.yml](../docker-compose.yml) |
| Reglas y skills locales | `.agents` no existe | [AGENTS.md](../AGENTS.md), [README.md](../README.md) |
| Memoria del proyecto | `memory-bank` no existe | Consulta del directorio indicado por [AGENTS.md](../AGENTS.md) |
| Validacion ejecutable | Casos de nueve rutas, dos controles negativos, lista completa, 15 tests backend, cinco frontend, lint y build aprobados; historial de bloqueos y avisos conservado. No implica cobertura exhaustiva ni exactitud global de la UI | [Registro de comprobaciones](validations/02-handover-checks.md) |
| Commits por fase | Fase 1: `3f31fdd`, complemento `73f8a49`, merge `253b3c6` mediante PR #1; fases 2-4 pendientes | [PHASE1-INTEGRATION-01](validations/02-handover-checks.md#phase1-integration-01-merge-limpieza-y-rama-de-fase-2) |

Git mostraba inicialmente `docs/` y el informe de la raiz como no versionados. Por solicitud explicita del mantenedor, los informes se consolidaron y el de la raiz se traslado a validations. Conservar los demas cambios locales y revisar el alcance antes de incluir documentos en un commit. No usar `git add .` para cerrar una fase.

## 2. Metodo y dependencias

Secuencia obligatoria: fase 1 -> fase 2 -> fase 3 -> fase 4. No cerrar una fase sin su evidencia y su commit propio; un unico commit para las cuatro fases es incompleto segun la imagen. Se permiten incrementos internos, pero debe poder identificarse el cierre separado de cada fase.

Requisito adicional acordado con el mantenedor: antes de avanzar a fase 2, integrar fase 1 mediante PR documentado de validation-init a main en el fork EricDevs, revisar el PR, hacer merge, actualizar main local y eliminar validation-init local/remota. Crear despues una rama nueva para fase 2 desde main actualizado. Cumplido el 2026-11-13: PR #1 merged en 253b3c6, main sincronizado, validation-init eliminada local/remota y phase-2-engineering-findings creada desde el merge. No eliminar ramas antes del merge ni usar borrado forzado para eludir cambios no integrados.

Cada hito usa uno de estos estados: pendiente, en curso, bloqueado, en revision de cierre o completado. Registrar responsable, fecha, evidencia y bloqueo concreto. No marcar como completado algo que solo se haya propuesto o inspeccionado estaticamente.

Roles: el agente inspecciona, propone y ejecuta las tareas autorizadas; el mantenedor contrasta los resultados, aprueba reglas y alcance y confirma el cierre. No se asignan fechas de entrega ni personas que no se hayan acordado.

Trabajo incremental: una afirmacion o regla -> una comprobacion pequena -> resultado -> correccion local -> repetir la misma comprobacion. Si el entorno impide ejecutar, registrar el bloqueo; no reemplazar el resultado por una suposicion.

## 3. Fase 1: comprender el handover

Objetivo: que un contribuidor explique que hace el proyecto, como se conecta y como se ejecuta, sin depender de afirmaciones no contrastadas del agente.

### Hitos y acciones

| Hito | Acciones detalladas | Evidencia / entregable | Criterio de aceptacion |
| --- | --- | --- | --- |
| 1.1 Confirmar fork y clon | Completado: el mantenedor aporto remotos/estado y confirmo el fork; se contrasto la rama `validation-init` sin revertir cambios | [Registro del hito 1.1](validations/verification%20-%20resume.md) | Fork y workspace identificados; cambios preexistentes separados |
| 1.2 Mapear y contrastar entradas | Completado el 2026-11-13: mapa, servicios/puertos, entradas React/FastAPI, nueve rutas GET en Swagger y peticion UI/proxy a backend contrastados. No implica ejecucion funcional de todas las rutas | [01-structure.md](validations/01-structure.md); [OPENAPI-01 y UI-PROXY-01](validations/02-handover-checks.md) | Dos servicios y sus puertos identificados; nueve rutas propias GET y ruta usada por la UI diferenciadas |
| 1.3 Elaborar resumen del proyecto | Completado el 2026-11-13: informe consolidado y sintesis del mantenedor contrastada en funcionalidad, datos sinteticos, proxy y arranque/parada (SUMMARY-01). No implica aprobacion tecnica de todas las afirmaciones ni prueba de parada | [Informe canonico](validations/verification%20-%20resume.md), [SUMMARY-01](validations/02-handover-checks.md) y mapa | El mantenedor puede explicar que hace, como conecta y como arranca; ninguna afirmacion de producto sin fuente |
| 1.4 Verificar rutas y corregir discrepancias | Completado el 2026-11-13: mantenedor aprobo el contenido tras revisar el diff; nueve rutas con casos concretos, dos controles negativos, lista completa, ambas suites, lint y build contrastados. Matriz ✅ / ❌ / ❓ y limites conservados; no se declara cobertura exhaustiva ni se corrige producto | [Matriz del resumen](validations/verification%20-%20resume.md#matriz-de-contraste-del-resumen); [PHASE1-CLOSE-01](validations/02-handover-checks.md#phase1-close-01-aprobacion-y-commit-de-fase-1) | Rutas clave comprobadas por el mantenedor; discrepancias documentales corregidas; defectos de codigo separados de la correccion de docs |
| 1.5 Dejar rastro verificable | Completado el 2026-11-13: contenido aprobado, comandos/resultados y limites conservados, incluidos intentos bloqueados, resoluciones y avisos | [Registro de comprobaciones](validations/02-handover-checks.md) y notas de cierre | Se distingue evidencia estatica de runtime; otra persona puede repetir los checks |
| 1.6 Commit de fase | Completado el 2026-11-13: mantenedor creo `3f31fdd`, cuatro documentos nuevos y 1534 inserciones; alcance staged contrastado previamente | `docs: document verified project handover (phase 1)`; [PHASE1-CLOSE-01](validations/02-handover-checks.md#phase1-close-01-aprobacion-y-commit-de-fase-1) | Commit exclusivo identificable; no contiene reglas/memoria de fases futuras |
| 1.7 Integrar y limpiar rama | Completado el 2026-11-13: notas incluidas en 73f8a49, PR #1 revisado y merged mediante merge commit 253b3c6, main sincronizado y validation-init eliminada local/remota; nueva rama phase-2-engineering-findings creada desde el merge | [PR #1](https://github.com/EricDevs/ai-eng-financial-dashboard-context-project/pull/1); [PHASE1-INTEGRATION-01](validations/02-handover-checks.md#phase1-integration-01-merge-limpieza-y-rama-de-fase-2) | PR merged; contenido integrado en main; sin cambios locales perdidos; validation-init eliminada antes de crear rama de fase 2 |

Estado al 2026-11-13: fase 1 completada, hitos 1.1-1.7; commits `3f31fdd` y `73f8a49`, PR #1 merged en `253b3c6`, main sincronizado y validation-init eliminada local/remota. Rama phase-2-engineering-findings preparada desde el merge; hitos de fase 2 y fases 3-4 pendientes. Nueve rutas con casos concretos, dos controles negativos, lista completa, 15 tests backend, cinco frontend, ESLint y build contrastados. Discrepancia del periodo UI y limites de exactitud global de KPI/estados UI/parada conservados. Vulnerabilidades npm, aviso TestClient y chunk grande pendientes de evaluacion; no se afirman checks CI aprobados.

### Seguimiento guiado de fase 1

Trabajar una comprobacion por turno y registrar el resultado antes de avanzar. La configuracion ya se comprobo con `docker compose config`; la salida del mantenedor y sus limites se registran como CONFIG-01 en [02-handover-checks.md](validations/02-handover-checks.md). El comando no construye imagenes ni arranca contenedores y no demuestra compilacion o disponibilidad de la aplicacion.

PHASE1-INTEGRATION-01 confirma integracion, limpieza y rama nueva. Siguiente hito 2.1 en phase-2-engineering-findings: extraer convenciones con fuentes, empezando por modelos API y tipos cliente. Crear una rama no completa ese hito. No crear aun reglas ni memoria ni corregir producto. Mantener visibles los limites de KPI/estados UI/parada, discrepancia del periodo y riesgos de dependencias/tamano.

No repetir construccion ni exigir la salida pendiente de `docker version` solo para confirmar lo que ya demuestra el segundo intento. FRONTEND-BUILD-01 ya comprueba la compilacion completa; el arranque Vite de desarrollo no la sustituye. Los avisos de npm, Debugpy, TestClient y tamano del chunk se conservan sin aplicar cambios automaticos.

Tras el contraste de entradas, revisar con el mantenedor el resumen y clasificar sus afirmaciones como confirmadas, discrepancias o pendientes, indicando fuente y tipo de evidencia. Las marcas del resumen y los checks del registro son entregables relacionados, no intercambiables. Comprobar rutas clave pendientes y ejecutar pruebas una a una antes de preparar el commit de fase. Cada resultado se guarda en el registro; el roadmap solo marca el hito completo cuando cumple todos sus criterios. Configuracion, arranque y salud aprobados no cierran 1.2, 1.4 o 1.5 por si solos.

### Comprobaciones previstas

Desde la raiz, primero validar la configuracion y levantar servicios:

```sh
docker compose config
docker compose up --build
```

En otra terminal consultar `http://localhost:8000/health`, `/api/metrics` y `/openapi.json`; abrir `http://localhost:5173` y comprobar la peticion a `/api/metrics` por el proxy. Obtener `min_date` y `max_date` de facets para construir comparaciones con datos disponibles. Probar cada ruta de la tabla del mapa, incluyendo B2B/B2C, resumen, top y alertas; incluir un literal invalido y una fecha requerida ausente y registrar la respuesta real.

Pruebas desde la raiz, una ejecucion cada vez:

```sh
uv run --no-project --python 3.13 --with-requirements backend/requirements.txt pytest backend/tests/test_routes.py -q
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

Requisitos: Docker con Compose operativo, Node/npm compatibles con el proyecto, `uv` disponible y dependencias frontend instaladas. Para una instalacion limpia del cliente usar `npm --prefix frontend ci` cuando corresponda; no reinstalar por rutina en un entorno ya preparado. BACKEND-TEST-01 comprueba el comando uv sin introducir un manifiesto nuevo; FRONTEND-INSTALL-01 conserva la instalacion local necesaria para Vitest. El Dockerfile existente usa otro flujo de instalacion y no se cambia en esta fase.

No afirmar que las suites pasan antes de ejecutarlas. La configuracion actual de Vite apunta al hostname Compose `backend`, por lo que el arranque separado en el host no equivale al flujo documentado. Al terminar, usar `docker compose down` solamente sobre los servicios que se hayan iniciado para la comprobacion, sin interrumpir trabajo ajeno.

### Checklist de cierre

- [x] Fork y clon confirmados; origin de EricDevs y rama `validation-init` registrados.
- [x] Mapa y entradas contrastados en 1.2; nueve rutas con casos concretos comprobados por el mantenedor.
- [x] Resumen de que hace, como conecta y como se ejecuta revisado por el mantenedor; SUMMARY-01 y matriz tecnica registrados, con limites de alcance.
- [x] Resumen contrastado con codigo y evidencia runtime; discrepancia de periodo y limites registrados explicitamente.
- [x] Rastro de verificacion conservado, incluidos intentos bloqueados, resoluciones y avisos.
- [x] Commit dedicado a fase 1 `3f31fdd`, creado por el mantenedor y registrado en PHASE1-CLOSE-01.
- [x] PR #1 documentado hacia main del fork, revisado y merged en 253b3c6; main local actualizado y validation-init eliminada local/remota.

## 4. Fase 2: derivar hallazgos de ingenieria

Objetivo: convertir patrones demostrables del repositorio en propuestas utiles para futuros contribuidores y agentes. No convertir preferencias generales en supuestas convenciones del proyecto.

### Hitos y acciones

| Hito | Acciones detalladas | Evidencia / entregable | Criterio de aceptacion |
| --- | --- | --- | --- |
| 2.1 Extraer convenciones | Revisar patrones observados de API/modelos, contratos TS, ubicacion del calculo, componentes, estilos, tests y arranque; explicar su efecto en una contribucion futura | Registro propuesto `docs/validations/03-engineering-findings.md` | Cada hallazgo tiene fuente y consecuencia concreta |
| 2.2 Filtrar hallazgos | Rechazar frases vagas; separar convencion, limitacion y mejora propuesta; no deducir reglas de comillas/formatting donde el estilo varia | Tabla retenido/descartado con razon | Solo sobreviven hallazgos ligados a archivos, carpetas o comportamientos |
| 2.3 Agrupar por categoria | Clasificar en arquitectura/contratos, naming, testing, documentacion y DX; asignar alcance y prioridad segun riesgo observado | Secciones por categoria en el mismo registro | Sin duplicados ni categorias rellenas con generalidades |
| 2.4 Proponer reglas | Para cada regla: nombre, alcance, justificacion, guia, al menos un hecho verificable, una tarea pequena y check de cumplimiento | Propuestas de reglas en el registro; todavia no reglas activas | Todas las propuestas citan fuentes y son comprobables |
| 2.5 Commit de fase | Revisar propuestas con el mantenedor; mantener solo las aprobadas; seleccionar notas/propuestas y evidencia de esta fase | Commit sugerido `docs: derive repository engineering rules (phase 2)` | Commit propio; propuestas claramente diferenciadas de implementacion |

### Base inicial de propuestas

Estos son candidatos, no reglas aprobadas ni mejoras comprometidas:

| Categoria / candidato | Hecho del repositorio | Guia propuesta | Check que podria refutarla o demostrar cumplimiento |
| --- | --- | --- | --- |
| Arquitectura: contratos API | Modelos Pydantic y parametros viven en [routes.py](../backend/app/routes.py); contrato cliente en [financial-types.ts](../frontend/src/lib/financial-types.ts) | Si cambia un campo consumido, revisar API, tipo cliente y test en el mismo incremento; no hacer compatibles por suposicion endpoints con filtros distintos | TestClient comprueba respuesta; build y test cliente del campo afectado |
| Arquitectura: calculo financiero | [App.tsx](../frontend/src/App.tsx) delega calculo en [financial-utils.ts](../frontend/src/lib/financial-utils.ts) | Mantener calculo/formato en utilidades y pasar datos a componentes; no duplicar formulas en JSX | Test de utilidades con esperado numerico y revision del componente |
| Naming e imports | Componentes dashboard usan nombres de archivo kebab-case, exports PascalCase y alias `@`; [vite.config.ts](../frontend/vite.config.ts) y [tsconfig.app.json](../frontend/tsconfig.app.json) configuran el alias | Seguir el patron de archivos/exports de la carpeta y usar alias o imports relativos como los vecinos; no imponer reformatting global | Build resuelve imports; inspeccion del archivo tocado |
| Testing: evidencia local | [test_routes.py](../backend/tests/test_routes.py) usa TestClient; [financial-utils.test.ts](../frontend/src/lib/financial-utils.test.ts) usa Vitest con datos pequenos | Reproducir primero un defecto y validar un incremento con el test mas pequeno que pueda fallar; comprobar valores, no solo presencia de campos | Resultado antes/despues del mismo test; no declarar cobertura numerica a partir de un test de forma |
| Testing: fechas y periodos | Generador usa `date.today()` en [routes.py](../backend/app/routes.py); agrupacion cliente usa parsing Date/getters locales en [financial-utils.ts](../frontend/src/lib/financial-utils.ts) | Explicitar calendario y zona horaria en cambios de fechas; no hardcodear ano actual en expectativas ni tratar la semilla como reloj fijo | Fixture controlada y test de borde entre meses/anos; zona horaria si afecta al cambio |
| UI: reutilizacion y estados | [kpi-card.tsx](../frontend/src/components/dashboard/kpi-card.tsx) y los graficos usan Card/Skeleton/tokens; [index.css](../frontend/src/index.css) define tema | Reutilizar primitivas, `cn`, iconos y tokens; preservar carga, vacio y error al cambiar presentacion | Lint/build y comprobacion de los estados de la pieza tocada |
| Documentacion y DX | [README.md](../README.md) prescribe Compose; [vite.config.ts](../frontend/vite.config.ts) apunta a `backend:8000`; [Dockerfile backend](../backend/Dockerfile) expone Debugpy | Documentar desde la configuracion real; distinguir host/contenedor, API/depuracion, declaracion/runtime y dependencias declaradas/instaladas | `docker compose config`, enlaces y comprobacion HTTP del flujo descrito |

Ejemplos de hallazgos descartables: "usar buenas practicas", "el proyecto usa TypeScript estricto" (no se declara `strict`), "todas las rutas filtran por negocio" (metrics no lo admite), "los datos son reales" o "las reglas markdown se activan automaticamente". Las limitaciones de CORS, periodo fijo, fechas y falta de CI se registran como observaciones, no se arreglan sin un cambio de alcance acordado.

### Checklist de cierre

- [ ] Convenciones utiles y patrones arraigados extraidos con el agente.
- [ ] Solo hallazgos ligados a archivos, carpetas o comportamientos concretos.
- [ ] Hallazgos supervivientes agrupados por categoria.
- [ ] Reglas propuestas; cada una cita al menos un hecho del repositorio.
- [ ] Commit dedicado a fase 2 con hash registrado.

## 5. Fase 3: implementar y probar reglas

Objetivo: crear reglas pequenas, cargables y accionables, demostrando cada una con una tarea real en este repositorio. Depende de propuestas aprobadas en fase 2.

### Hitos y acciones

| Hito | Acciones detalladas | Evidencia / entregable | Criterio de aceptacion |
| --- | --- | --- | --- |
| 3.1 Crear ubicacion y routing | Crear `.agents/rules` si sigue ausente; respetar la estructura del README; revisar como [AGENTS.md](../AGENTS.md) conduce al agente a esas reglas | Carpeta y mecanismo de lectura identificados | El agente puede nombrar la regla leida y su alcance antes de trabajar |
| 3.2 Redactar reglas | Elegir el minimo conjunto aprobado; un tema por archivo; incluir nombre, alcance, justificacion, fuentes, instrucciones concretas, check y limites | Archivos propuestos `.agents/rules/<nombre-regla>.md` | Ninguna regla vaga, duplicada, contradictoria o sin evidencia |
| 3.3 Validar cada regla | Asignar una tarea pequena y real a cada archivo, ejecutarla con la regla cargada, observar el diff y correr el check correspondiente antes de continuar | Registro propuesto `docs/validations/04-rules-validation.md`; cambios pequenos de validacion | Todas las reglas tienen evidencia de carga y de cumplimiento en una tarea real |
| 3.4 Refinar e iterar | Ante ambiguedad o incumplimiento, precisar la guia; repetir la misma tarea/check; agrupar o retirar propuestas que no aporten valor | Version final y registro de iteraciones | No hay reglas pendientes de prueba ni instrucciones imposibles para el entorno |
| 3.5 Commit de fase | Revisar reglas, routing si se ajusto, cambios reales de validacion y evidencia; incluir solo esta fase | Commit sugerido `chore: implement and validate agent rules (phase 3)` | Commit propio, distinto de propuestas de fase 2 y memoria de fase 4 |

### Activacion y formato

La ubicacion `.agents/rules` es una convencion del proyecto. Un `.md` arbitrario no garantiza autoactivacion en todos los editores: confirmar lectura mediante el routing de `AGENTS.md` y guardar evidencia de la sesion. Si se necesita integracion nativa de VS Code, acordar antes un adaptador minimo en `.github/instructions/*.instructions.md` con `description` y `applyTo` especificos; evitar duplicar todo el contenido o aplicar reglas frontend a todo el repositorio. No crear ese adaptador por rutina.

Plantilla de contenido para cada regla: nombre; archivos/tareas a los que aplica; hecho y enlace; instrucciones imperativas cortas; ejemplo solo si ayuda; comando/check; excepciones relevantes. No exigir que `.agents/rules/*.md` tenga frontmatter de otra herramienta sin decidir primero el consumidor.

No es obligatorio inventar skills para completar la imagen: [AGENTS.md](../AGENTS.md) pide buscar las disponibles, pero la fase 3 exige reglas. Crear un skill solo si aparece un procedimiento repetible que lo justifique.

### Tareas de validacion sugeridas

Elegir tareas necesarias y aceptadas por el mantenedor, no cambios artificiales para simular cumplimiento. Si una regla no puede probarse con una tarea pequena justificada, reducirla o posponerla antes de aprobarla.

| Regla o grupo, si se aprueba | Tarea real pequena sugerida | Check minimo |
| --- | --- | --- |
| Documentacion / DX | Aclarar en una guia el destino del proxy o la diferencia entre 8000 y 5678; verificar las dos versiones del README si ambas explican el punto | Contraste con Compose/Vite, enlaces y diff documental |
| Contratos API | Fortalecer en el test de resumen una asercion de neto con datos controlados, manteniendo el contrato actual | Test backend concreto con TestClient; esperado calculado independientemente |
| Calculo / fechas / tests frontend | Anadir en la suite existente un caso de movimientos vacios o una frontera de fecha acordada | Vitest sobre la suite tocada; comprobacion antes/despues si se trata de un defecto |
| Naming / imports / UI | Si se acuerda resolver el periodo fijo, obtener y mostrar el periodo real con la separacion actual de utilidades y componentes, sin anadir un selector no solicitado | Test del calculo de etiqueta, lint/build y revision de carga/vacio/error |

La correccion del periodo es candidata, no autorizacion anticipada de cambio de producto. Una misma tarea puede demostrar varias reglas si el registro explica cual se aplico y cual fue su check; todas deben quedar cubiertas.

Ejemplos de ejecuciones focalizadas desde la raiz, cuando se toque esa pieza:

```sh
uv run --no-project --python 3.13 --with-requirements backend/requirements.txt pytest backend/tests/test_routes.py::test_metrics_summary_by_month_returns_balances -q
npm --prefix frontend test -- src/lib/financial-utils.test.ts
```

Reutilizar suites existentes, no crear herramientas paralelas ni archivos de tests innecesarios. Una regla sobre UI requiere comprobar la UI afectada, no darla por probada solo por un build. El registro debe incluir ID de regla, fuente, tarea, archivos, como se comprobo su carga, comando, resultado, iteracion y veredicto.

### Checklist de cierre

- [ ] `.agents/rules` creada si no existia.
- [ ] Reglas con nombre, alcance, justificacion y guia especifica claros.
- [ ] Cada regla validada con una tarea pequena real del repositorio.
- [ ] Refinamiento realizado hasta que la guia sea accionable.
- [ ] Commit dedicado a fase 3 con hash registrado.

## 6. Fase 4: construir memoria del proyecto

Objetivo: conservar contexto verificable para la siguiente sesion sin copiar todo el codigo ni convertir deseos de producto en hechos.

### Hitos y acciones

| Hito | Acciones detalladas | Evidencia / entregable | Criterio de aceptacion |
| --- | --- | --- | --- |
| 4.1 Crear banco de memoria | Crear `memory-bank` en la raiz; usar archivos breves y enlaces a fuentes; revisar que el routing de AGENTS permite encontrarlo | Carpeta y documentos propuestos de abajo | Memoria accesible al siguiente agente sin depender del chat actual |
| 4.2 Cubrir contenido minimo | Redactar overview, stack e infraestructura y estado actual; reflejar cambios reales de fase 3, no solo el estado inicial de este roadmap | Fuentes, fecha y alcance de revision en cada documento | Cubre producto con evidencia, tecnologias/dependencias y que funciona/gaps/prioridades |
| 4.3 Auditar y probar handover | Rechazar claims sin soporte y roadmaps inventados; revisar enlaces; pedir a una sesion nueva resumen de producto, arranque y siguiente prioridad; contrastar respuesta con codigo/evidencia | Registro propuesto `docs/validations/05-memory-checks.md` | Resumen correcto, gaps conservados y propuestas separadas de decisiones |
| 4.4 Commit de fase | Seleccionar memoria y evidencia aprobadas; crear commit independiente; registrar hash y el orden de los cuatro cierres | Commit sugerido `docs: add evidence-based project memory (phase 4)` | Cuarto cierre propio; sin cambios de producto no aprobados |

### Documentos propuestos

Los siguientes archivos no existen aun; se crearan durante esta fase, sin obligar a una convencion mas compleja:

| Archivo futuro | Contenido minimo | Fuentes iniciales |
| --- | --- | --- |
| `memory-bank/overview.md` | Que hace el dashboard, usuario/contexto solo si esta demostrado, flujo UI/API, datos sinteticos y limites; no atribuir clientes reales | [App.tsx](../frontend/src/App.tsx), [routes.py](../backend/app/routes.py), [README.md](../README.md) |
| `memory-bank/stack.md` | Python/imagen base, FastAPI, React/TS, Vite/Tailwind/Recharts, tests, Docker, puertos, proxy, entorno, dependencias declaradas frente a resueltas y comandos ya comprobados | [requirements.txt](../backend/requirements.txt), [package.json](../frontend/package.json), [package-lock.json](../frontend/package-lock.json), [Compose](../docker-compose.yml), Dockerfiles |
| `memory-bank/status.md` | Que esta implementado frente a que fue probado; gaps conocidos; bloqueos; siguientes prioridades tecnicas aprobadas; enlaces a validaciones y reglas vigentes | Mapa, registros de fases 1-3 y commits reales |

Mantener la memoria factual y breve. Ejemplos de gaps iniciales: periodo fijo frente a datos relativos al reloj, rutas analiticas no consumidas por la UI, falta de persistencia/CI/E2E en el inventario. Ausencia de una funcionalidad no implica que este plan autorice construirla. La siguiente prioridad propuesta es completar la evidencia pendiente y corregir solo discrepancias acordadas, no inventar una agenda de producto.

Cuando cambien contratos, arranque, stack o estado comprobado, actualizar el documento afectado con fuente y fecha. Una afirmacion de que algo "funciona" requiere enlazar el check que lo demuestra; si solo se vio en codigo, usar "implementado".

### Checklist de cierre

- [ ] `memory-bank` creada en la raiz.
- [ ] Overview del producto anclado en evidencia verificable.
- [ ] Stack completo: lenguajes, frameworks, infra/tooling y dependencias clave.
- [ ] Estado actual: que funciona, gaps conocidos y siguientes prioridades justificadas.
- [ ] Claims de producto sin soporte y roadmaps inventados rechazados.
- [ ] Commit dedicado a fase 4 con hash registrado.

## 7. Control final y registro de cierre

| Fase | Condicion para avanzar | Hash de commit | Estado actual |
| --- | --- | --- | --- |
| 1 | Mapa, resumen, checks, aprobacion e integracion por PR | `3f31fdd`, `73f8a49`; merge `253b3c6` | Completada: PR #1 merged, main sincronizado y validation-init eliminada local/remota |
| 2 | Hallazgos y reglas propuestas aprobados con fuentes | Pendiente | Rama phase-2-engineering-findings preparada; hitos pendientes |
| 3 | Reglas cargadas, tareas reales y validacion de cada una | Pendiente | Pendiente |
| 4 | Memoria minima completa y handover contrastado | Pendiente | Pendiente |

Al crear cada commit, revisar `git status --short`, seleccionar rutas explicitamente, revisar `git diff --cached` y conservar el hash. Al final, revisar `git log --oneline` y confirmar cuatro cierres distintos en orden. Nunca incluir automaticamente documentos preexistentes ni cambios de otro trabajo; no crear commits en nombre del mantenedor fuera de una solicitud de ejecucion de la fase.

Definition of Done global: todos los puntos de la imagen cubiertos, cuatro commits propios identificables, enlaces validos, cada regla demostrada en una tarea real, memoria verificable y ningun resultado de ejecucion inventado. Una fase bloqueada sigue abierta aunque se haya escrito su documento.