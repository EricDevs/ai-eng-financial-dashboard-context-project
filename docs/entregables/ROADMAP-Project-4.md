# Roadmap proyecto 4: mejora del dashboard guiada por agent skills

Fecha de creacion: 2026-11-16. Objetivo: mejorar el dashboard heredado aplicando skills de agente (`accessibility`, `vercel-react-best-practices`, al menos una skill del ecosistema descubierta con `npx skills find`) y escribir una **skill interna del proyecto** en `.skills/`. El agente audita, propone e implementa; el mantenedor verifica. **No se reescribe el dashboard desde cero**: cada cambio debe ser trazable a una instruccion de una skill.

Este archivo es el registro de seguimiento. Se actualiza al cerrar cada hito, con fecha y evidencia. Formato y disciplina heredados de [ROADMAP-Project-3.md](ROADMAP-Project-3.md).

## 1. Alcance

| # | Bloque | Resultado esperado |
| --- | --- | --- |
| S1 | Skill `accessibility` | Auditoria y correcciones: `aria-*`/`role` donde haga falta, `alt` en imagenes/iconos, foco y navegacion por teclado, contraste basico |
| S2 | Skill `vercel-react-best-practices` | Auditoria y correcciones orientadas a despliegue: metadatos de pagina, layout shift, carga de fuentes/imagenes, anti-patrones que afectan Lighthouse |
| S3 | Skill(s) del ecosistema | `npx skills find` sobre >= 2 temas; >= 1 skill aplicada con justificacion escrita |
| S4 | Skill interna | `.skills/<nombre>/SKILL.md` con objetivo, inputs, outputs y criterios de aceptacion, especifica de este repo, probada en una tarea real |
| S5 | Memory bank | `memory-bank/progress.md` (o equivalente) con skills aplicadas, cambios verificados, skill del ecosistema elegida (y por que) y skill interna |

Entrega: rama `feature/agent-skills` en GitHub y PR contra `main`; compartir la URL del PR con el instructor.

Reglas de trabajo aplicables: [WF](../../.agents/rules/01-workflow-evidence.md) (todas las tareas), [FE](../../.agents/rules/05-frontend-conventions.md) (TSX, CSS, componentes, `index.html`), [DX](../../.agents/rules/06-runtime-configuration.md) (si una skill propone dependencias, Vite o Docker). [FIN](../../.agents/rules/02-financial-domain.md) y [CAL](../../.agents/rules/04-calendar-periods.md) solo si un cambio toca formateadores, importes o periodos.

Metodo por skill (enunciado, "Como trabajas"):

1. Cargar la skill; el agente audita y propone. No corregir a mano siguiendo el README.
2. El agente cita archivo y la instruccion de la skill de cada propuesta antes de aceptarla.
3. Verificar en la app en ejecucion y con los comandos documentados en el memory bank.
4. Commit trazable a la skill (idealmente un commit por skill aplicada).
5. Actualizar el memory bank cuando cambie la linea base de calidad o el flujo de trabajo.

## 2. Hechos del repo que condicionan el plan

- **El frontend es Vite + React 19, no Next.js** ([package.json](../../frontend/package.json), [vite.config.ts](../../frontend/vite.config.ts)). Las reglas de `vercel-react-best-practices` especificas de Next no aplican literalmente: se registran como N/A con justificacion o se aplica su equivalente en Vite. No se migra a Next.
- **La skill `vercel-react-best-practices` real no cubre `next/image`, `next/font` ni metadatos por pagina** (revisada en la fase 1): son 70 reglas de rendimiento (bundle, re-renders, rendering, JS). Los cambios de la fase 3 se trazan a esas reglas; metadatos y `lang` se trazan a `accessibility` (3.1.1 Page language) si se tocan. Detalle en [07-agent-skills-checks.md](../validations/07-agent-skills-checks.md#16-instalacion-y-carga).
- Linea base observable: [index.html](../../frontend/index.html) tiene `<title>frontend</title>`, `lang="en"` y sin `meta description`. [hero.png](../../frontend/src/assets/hero.png) y [mock-data.ts](../../frontend/src/lib/mock-data.ts) no tienen importacion detectada ([overview.md](../../memory-bank/overview.md)).
- Componentes afectados: [dashboard/](../../frontend/src/components/dashboard) (`dashboard-header`, `kpi-row`, `kpi-card`, `income-outcome-chart`, `profit-percent-chart`), [ui/](../../frontend/src/components/ui) (`card`, `skeleton`), [App.tsx](../../frontend/src/App.tsx) y tokens en [index.css](../../frontend/src/index.css).
- **Aviso de build preexistente**: chunk JS > 500 kB (FRONTEND-BUILD-01 en [stack.md](../../memory-bank/stack.md)). El criterio "sin advertencias nuevas injustificadas" se mide contra esa linea base.
- Comandos documentados: build `npm --prefix frontend run build`; lint `npm --prefix frontend run lint`; tests `npm --prefix frontend test`; app `docker compose up --build` (frontend en `http://localhost:5173`).
- **Memory bank desactualizado** al crear este roadmap: [status.md](../../memory-bank/status.md) no recogia el proyecto 3 y marcaba la fase 4 del proyecto 2 "en curso". Corregido en el PR #10 antes de empezar (hito 1.2).
- `AGENTS.md` enruta skills a `./.agents/skills` (hoy no existe); el enunciado pide la skill interna en `.skills/`. Hay que alinear el enrutado (decision D2).
- Sin herramientas de accesibilidad automatizadas en el repo (no hay `eslint-plugin-jsx-a11y` ni axe). Anadir una es un cambio de dependencias: requiere acuerdo (regla DX).

## 3. Estrategia de ramas y PR

La rama `feature/agent-skills` es obligatoria. Se replica el esquema del proyecto 3:

- `feature/agent-skills` es la **rama de integracion**, creada desde `main` actualizado (`git pull origin main`; `git switch -c feature/agent-skills`).
- Cada fase trabaja en `feature/agent-skills-faseN-<tema>` creada desde la rama de integracion y se integra con un **PR hacia `feature/agent-skills`**.
- Al cerrar la fase 6, un **PR final de `feature/agent-skills` hacia `main`**; esa es la URL que se entrega.
- Un commit por skill aplicada, con el nombre de la skill en el mensaje (p. ej. `fix(a11y): ... [skill: accessibility]`). Antes de cada commit: `git status --short`, rutas explicitas (nunca `git add .`), revisar `git diff --cached`, anotar el hash aqui.
- PRs con **merge commit, sin squash ni rebase**. La descripcion del PR final lista los PRs de fase.
- No commitear, hacer push ni merge sin aprobacion del mantenedor.

Estados de hito: pendiente, en curso, bloqueado, en revision, completado.

## 4. Decisiones abiertas

| ID | Decision | Propuesta | Estado |
| --- | --- | --- | --- |
| D1 | Donde se instalan las skills comunitarias y si se commitean | Instalacion a nivel proyecto con `npx skills add`, commiteada para que el equipo las recargue; registrar la ruta real que crea la CLI | resuelta 2026-11-16: copia canonica versionada en `.agents/skills/` (ruta que esperan README y `AGENTS.md`) + `skills-lock.json`; symlink local en `.claude/skills/` (ignorado) |
| D2 | `.skills/` (enunciado) vs `.agents/skills` (AGENTS.md) | Skill interna en `.skills/` como pide el enunciado y anadir esa ruta al enrutado de `AGENTS.md` | resuelta 2026-11-17: `.skills/` para skills del proyecto, `.agents/skills` para comunitarias; ambas en `AGENTS.md` |
| D3 | Anadir lint de accesibilidad (`eslint-plugin-jsx-a11y`) | Solo si la skill lo recomienda y el mantenedor lo aprueba (regla DX) | pendiente |
| D4 | Archivo de evidencia | `docs/validations/07-agent-skills-checks.md` con prompts, propuestas aceptadas/rechazadas, comandos y salidas | resuelta 2026-11-16: [07-agent-skills-checks.md](../validations/07-agent-skills-checks.md) |
| D5 | Ramas por fase o rama unica | Ramas por fase, como en el proyecto 3 | resuelta 2026-11-16: ramas por fase |

## 5. Fase 1: preparacion, linea base y descubrimiento de skills

Rama: `feature/agent-skills-fase1-setup`. PR hacia `feature/agent-skills`.

| Hito | Acciones | Evidencia | Estado |
| --- | --- | --- | --- |
| 1.1 Preparar repo | `git pull origin main`; confirmar `memory-bank/` y `.agents/rules` commiteados; crear `feature/agent-skills` y la rama de fase | `git status`, `git branch` | completado 2026-11-16: `main` sincronizado en `ac3c6f3`; `feature/agent-skills` publicada; rama de fase local |
| 1.2 Actualizar memory bank | Corregir `status.md` (cierre proyecto 2 fase 4, proyecto 3 con PRs #5-#9) | Diff de `memory-bank/` | completado 2026-11-16: commit `c8b6628`, PR #10, merge `ac3c6f3` en `main` |
| 1.3 Confirmar como ejecutar y validar | El agente confirma con evidencia del repo como arrancar la app y que comando de build valida el frontend | Cita de archivos + salida de comandos | completado 2026-11-16: ver [07-agent-skills-checks.md](../validations/07-agent-skills-checks.md#13-como-ejecutar-la-app-y-validar-el-frontend) |
| 1.4 Linea base de calidad | Ejecutar build, lint y tests del frontend; registrar avisos existentes (chunk > 500 kB). Pasada manual inicial de teclado sobre la app | Salidas en el archivo de evidencia (D4) | completado 2026-11-16: build exit 0 con aviso preexistente (JS 584.25 kB), lint limpio, 6 tests passed. La pasada de teclado se movio al inicio de la fase 2 (2.1) |
| 1.5 Descubrir skills proporcionadas | `npx skills find accessibility` y `npx skills find vercel-react-best-practices`; revisar que cubre cada una antes de instalar | Salida de ambos comandos | completado 2026-11-16: elegidas `addyosmani/web-quality-skills@accessibility` y `vercel-labs/agent-skills@vercel-react-best-practices` |
| 1.6 Cargar las skills | Instalar ambas (D1) y cargarlas en el agente; resumir que instrucciones dan y cuales aplican a Vite (marcar N/A las de Next) | Resumen por skill en el archivo de evidencia | completado 2026-11-16: instaladas en `.agents/skills/`, leidas por el agente; tabla de aplicabilidad registrada |
| 1.7 Commit y PR de fase | Commit de memory bank, skills instaladas y roadmap; PR a la rama de integracion | Hash y numero de PR | completado 2026-11-16: commits `442f11d` (skills) y `4b9af5b` (evidencia), PR #11, merge `3ed7ade` |

Checklist de cierre:

- [x] Rama de integracion creada desde `main` actualizado.
- [x] Memory bank refleja el estado real tras el proyecto 3.
- [x] Linea base de build/lint/tests registrada, avisos incluidos.
- [x] Ambas skills encontradas, revisadas, instaladas y cargadas.
- [x] PR de fase 1 mergeado en la rama de integracion.

## 6. Fase 2: skill `accessibility`

Rama: `feature/agent-skills-fase2-accessibility`. PR hacia `feature/agent-skills`. Leer FE antes de empezar.

| Hito | Acciones | Evidencia | Estado |
| --- | --- | --- | --- |
| 2.1 Auditoria | Pasada manual de teclado inicial (movida desde 1.4) y auditoria Lighthouse de accesibilidad sobre la app en ejecucion, como pide el flujo de la skill. Con la skill cargada, el agente audita `App.tsx`, `dashboard/`, `ui/`, `index.css` e `index.html` y lista hallazgos con archivo, linea e instruccion de la skill | Lista de hallazgos | completado 2026-11-16: Lighthouse 100 sin fallos; 10 hallazgos manuales A1-A10 ([evidencia](../validations/07-agent-skills-checks.md#21-auditoria-antes-de-cambios)) |
| 2.2 Revision de propuestas | Aceptar solo cambios ligados a un archivo real y a una instruccion de la skill; registrar rechazados y por que | Tabla aceptado/rechazado | completado 2026-11-16: 10 propuestas aceptadas por el mantenedor; 2 cambios descartados antes de proponer, con motivo |
| 2.3 Implementar | Correcciones minimas: etiquetas `aria-*`/`role` (p. ej. graficas Recharts, iconos Lucide decorativos con `aria-hidden`), `alt`, estados de carga/error anunciables, foco visible, contraste de tokens | Diff | completado 2026-11-16: 9 archivos del frontend, cambios minimos por hallazgo |
| 2.4 Verificar | Navegacion por teclado en elementos interactivos; `aria-*`/`role` correctos; `alt` presente; contraste basico de textos y controles (ratio medido). Lint, tests y build sin avisos nuevos | Notas de la pasada manual + salidas de comandos | completado 2026-11-16: A1 3.14->5.18:1, A2 2.04->4.69:1, nombres de graficas y h2 en el arbol de Chrome, alert/lang/aria-busy observados; lint, 6 tests y build sin avisos nuevos. Hallazgo: Vite en Docker no recarga modulos (bind mount de Windows) |
| 2.5 Commit y PR | Commit que referencia la skill `accessibility`; PR | Hash y numero de PR | completado 2026-11-16: commits `ff050ce` (fix(a11y), A1-A10) y `e83eb48` (evidencia), PR #12, merge `98e6bc5` |

Checklist de cierre:

- [x] Cada cambio trazable a una instruccion de `accessibility`.
- [x] Teclado, `aria-*`/`role`, `alt` y contraste verificados en la app en ejecucion.
- [x] Build sin advertencias nuevas injustificadas.
- [x] PR de fase 2 mergeado.

## 7. Fase 3: skill `vercel-react-best-practices`

Rama: `feature/agent-skills-fase3-react-best-practices`. PR hacia `feature/agent-skills`. Leer FE (y DX si toca Vite o dependencias).

| Hito | Acciones | Evidencia | Estado |
| --- | --- | --- | --- |
| 3.1 Auditoria | El agente audita patrones orientados a despliegue: metadatos (`title`, `description`, `lang` de `index.html`), layout shift (alturas de skeleton/graficas, dimensiones de imagen), fuentes, tamano de bundle, re-renders y anti-patrones de Lighthouse | Lista de hallazgos con instruccion de la skill | completado 2026-11-16: bundle medido (Recharts + deps 60 % del JS), Lighthouse de rendimiento x3 en build de produccion; hallazgos R1-R4 ([evidencia](../validations/07-agent-skills-checks.md#31-auditoria-antes-de-cambios)) |
| 3.2 Adaptar a Vite | Para cada regla de Next (`next/image`, `next/font`, metadata) decidir: equivalente en Vite o N/A justificado | Tabla regla -> aplicacion/N/A | completado 2026-11-16: tabla de aplicabilidad (server/hidratacion N/A, `next/dynamic` -> `React.lazy`, SWR innecesario) |
| 3.3 Implementar | Correcciones minimas aceptadas (p. ej. metadatos reales en `index.html`, reservar espacio de graficas, carga diferida de Recharts si reduce el chunk) | Diff | completado 2026-11-16: R1 aceptado (graficas con `React.lazy` + `Suspense` en `App.tsx`); R2 aplazado y luego descartado (ver 3.4); R3 y R4 descartados por impacto no medible |
| 3.4 Verificar | `npm --prefix frontend run build` sin advertencias nuevas (comparar con la linea base); lint y tests; observar la app (sin saltos de layout en carga) | Salidas de comandos + notas | completado 2026-11-16: build sin avisos (chunk principal 584.60 -> 187.76 kB); lint y 6 tests OK; Lighthouse sin mejora de LCP fuera del ruido; sin regresiones de accesibilidad ni de layout. R2 descartado tras medir (el retraso del LCP es CPU de render, no red) |
| 3.5 Commit y PR | Commit que referencia `vercel-react-best-practices`; PR | Hash y numero de PR | completado 2026-11-16: commits `c06ede3` (perf, R1) y `cd45cd2` (evidencia), PR #13, merge `23f4da1` |

Checklist de cierre:

- [x] Cada cambio trazable a una instruccion de la skill; reglas de Next marcadas N/A con motivo.
- [x] Build pasa sin advertencias nuevas injustificadas.
- [x] PR de fase 3 mergeado.

## 8. Fase 4: explorar el ecosistema

Rama: `feature/agent-skills-fase4-ecosystem`. PR hacia `feature/agent-skills`.

| Hito | Acciones | Evidencia | Estado |
| --- | --- | --- | --- |
| 4.1 Buscar | `npx skills find <tema>` sobre >= 2 temas relevantes (candidatos: `performance`, `testing`, `typescript`, `seo`, `forms`) | Salidas de los comandos | completado 2026-11-17: `testing`, `seo` y `typescript` buscados; 6 candidatas revisadas leyendo su `SKILL.md` ([evidencia](../validations/07-agent-skills-checks.md#fase-4-explorar-el-ecosistema)) |
| 4.2 Elegir | Comparar candidatas contra gaps reales del repo ([status.md](../../memory-bank/status.md): sin E2E, chunk grande, riesgo de huso horario sin corregir) y elegir >= 1 | Justificacion escrita | completado 2026-11-17: gaps medidos (SEO 82/100, `strict` con 0 errores, 1 archivo de tests). Primera recomendacion `seo`; el mantenedor cuestiono su valor en un dashboard interno, se busco `vitest` y se eligio `antfu/skills@vitest`. `seo` y `typescript` descartados con motivo |
| 4.3 Aplicar | Instalar, cargar, auditar y aplicar con el mismo metodo (propuestas trazables, verificacion) | Diff + salidas | completado 2026-11-17: T0-T2 aceptadas y `jsdom` autorizado; `App.test.tsx` con 2 tests (8 en total); 4 roturas provocadas detectadas; lint y build sin avisos; `npm audit` sin vulnerabilidades nuevas |
| 4.4 Commit y PR | Commit que referencia la skill elegida; PR | Hash y numero de PR | completado 2026-11-17: commits `2b7f444` (skill), `99e7066` (jsdom + tests) y `7e13588` (evidencia), PR #14, merge `894c4eb` |

Checklist de cierre:

- [x] >= 2 temas buscados con `npx skills find`.
- [x] >= 1 skill adicional aplicada con justificacion escrita.
- [x] PR de fase 4 mergeado.

## 9. Fase 5: skill interna del proyecto

Rama: `feature/agent-skills-fase5-internal-skill`. PR hacia `feature/agent-skills`.

| Hito | Acciones | Evidencia | Estado |
| --- | --- | --- | --- |
| 5.1 Identificar el gap | Con el agente, elegir un gap especifico de este repo que las skills comunitarias no cubren. Candidatos con base en el repo: checks de QA antes del merge (pytest via `uv`, tests/lint/build frontend, `git diff --check`, registro de evidencia), flujo de ramas por fase con merge commit, o convenciones UI del dashboard (Card/Skeleton/tokens, formateadores `en-US`/USD) | Gap elegido y motivo | completado 2026-11-17: elegido por el mantenedor "verificar un cambio del frontend en este entorno" (QA antes del merge), frente a "flujo de ramas y PRs" (mas generico, ya documentado en la seccion 3) |
| 5.2 Redactar | El agente redacta `.skills/<nombre>/SKILL.md`; el mantenedor lo refina a la estructura de clase: objetivo, inputs, outputs, criterios de aceptacion. Corta y precisa | `SKILL.md` | completado 2026-11-17: `.skills/verify-frontend-change/SKILL.md` v2 (65 lineas). Refinado del mantenedor (sin referencias a la maquina local; disparador "al terminar el cambio") y pruebas de activacion en sesiones nuevas: v1 6/6 y v2 8/8 casos como se esperaba; la v2 anade paso 0 y "Cuando no usarla" ([evidencia](../validations/07-agent-skills-checks.md#pruebas-de-activacion-antes-de-la-tarea-real)) |
| 5.3 Enrutar | Anadir `.skills/` a `AGENTS.md` (D2) | Diff de `AGENTS.md` | completado 2026-11-17: `AGENTS.md` lista `.agents/skills` y `.skills` y anade la tabla "Skill routing" ([evidencia](../validations/07-agent-skills-checks.md#53-enrutado-en-agentsmd)) |
| 5.4 Probar en tarea real | Cargar la skill en una sesion y aplicarla a una tarea real del repo; confirmar que produce guia accionable y ajustar si no | Prompt, salida y ajustes | completado 2026-11-17: salto de 8 px de las tarjetas de grafica (causa: `text-base` anula `leading-none` en `CardTitle`); skeletons ajustados, 422 px en ambos estados. La skill detecto Vite sirviendo el modulo viejo y el preview vivo; el CLS 0.014 resulto ser de la tarjeta KPI PROFIT (atribucion de la fase 3 corregida). Sin ajustes a la skill ([evidencia](../validations/07-agent-skills-checks.md#54-tarea-real-salto-de-8-px-en-las-tarjetas-de-grafica)) |
| 5.5 Commit y PR | Commit de la skill; PR | Hash y numero de PR | completado 2026-11-17: commits `97bce11` (skill + `AGENTS.md`), `ce66108` (skeletons), `04d13bb` (evidencia); PR #15, merge `1c25a99` |

Checklist de cierre:

- [x] Skill en `.skills/` con objetivo, inputs, outputs y criterios de aceptacion.
- [x] Guia especifica del proyecto, no relleno generico.
- [x] Probada en una tarea real con resultado registrado.
- [x] PR de fase 5 mergeado.

## 10. Fase 6: memory bank y cierre

Rama: `feature/agent-skills-fase6-memory-bank`. PR hacia `feature/agent-skills`, y despues PR final a `main`.

| Hito | Acciones | Evidencia | Estado |
| --- | --- | --- | --- |
| 6.1 `progress.md` | Crear `memory-bank/progress.md`: skills aplicadas, cambios verificados, skill del ecosistema elegida (y por que), skill interna creada | Archivo | completado 2026-11-17: [progress.md](../../memory-bank/progress.md) con skills aplicadas, tabla de cambios verificados antes/despues, por que `vitest` y por que la skill interna, y lo no verificado |
| 6.2 Actualizar linea base | `stack.md` (comandos y avisos de build tras los cambios), `status.md` (gaps cerrados/abiertos) y `AGENTS.md` si cambio el flujo | Diff | completado 2026-11-17: `stack.md` (jsdom, 8 tests, build sin avisos, trampas de Vite y preview, skills instaladas), `status.md` (gaps cerrados y abiertos, CLS de PROFIT, commits del proyecto 4), `overview.md` (carga diferida) y `AGENTS.md` (enrutado a `progress.md`) |
| 6.3 Verificacion final | Build, lint y tests en la rama de integracion; `git diff --stat main...feature/agent-skills` para confirmar que no hay reescritura masiva | Salidas | completado 2026-11-17: lint OK, 8/8 tests frontend, build sin avisos (187.77 kB), 15/15 tests backend; frente a `main` el codigo de la app cambia 8 archivos (+72/-23 en `src`), sin reescritura ([evidencia](../validations/07-agent-skills-checks.md#63-verificacion-final)) |
| 6.4 Commit y PR de fase | Commit del memory bank; PR | Hash y numero de PR | pendiente |
| 6.5 PR final a `main` | PR `feature/agent-skills` -> `main` con resumen por skill y lista de PRs de fase; compartir la URL con el instructor | Numero y URL del PR | pendiente |

Checklist de cierre:

- [ ] Memory bank refleja con precision el trabajo de la sesion.
- [ ] Verificacion final ejecutada y registrada.
- [ ] PR final abierto y URL compartida.

## 11. Criterios de evaluacion (checklist global)

- [ ] `accessibility` y `vercel-react-best-practices` cargadas y aplicadas; mejoras visibles y trazables a sus instrucciones.
- [ ] Accesibilidad verificada: teclado, `aria-*` donde haga falta, `alt` presente, contraste basico.
- [ ] Build del frontend pasa con el comando documentado, sin advertencias nuevas injustificadas.
- [ ] >= 1 skill adicional descubierta con `npx skills find` y aplicada con justificacion escrita.
- [ ] Skill interna en `.skills/` bien estructurada (objetivo, inputs, outputs, criterios de aceptacion) y especifica del proyecto.
- [ ] Memory bank refleja con precision el trabajo de la sesion.
- [ ] Cambios en `feature/agent-skills` con commits claros, idealmente uno por skill aplicada.
- [ ] El trabajo se lee como mejora impulsada por agente y verificada, sin ediciones masivas sin revisar.

## 12. Control de cierre

| Fase | Rama | PR | Commits | Estado |
| --- | --- | --- | --- | --- |
| 1 Preparacion y descubrimiento | `feature/agent-skills-fase1-setup` | PR #11 | `442f11d`, `4b9af5b` (merge `3ed7ade`) | completada 2026-11-16 |
| 2 Accessibility | `feature/agent-skills-fase2-accessibility` | PR #12 | `ff050ce`, `e83eb48` (merge `98e6bc5`) | completada 2026-11-16 |
| 3 React best practices | `feature/agent-skills-fase3-react-best-practices` | PR #13 | `c06ede3`, `cd45cd2` (merge `23f4da1`) | completada 2026-11-16 |
| 4 Ecosistema | `feature/agent-skills-fase4-ecosystem` | PR #14 | `2b7f444`, `99e7066`, `7e13588` (merge `894c4eb`) | completada 2026-11-17 |
| 5 Skill interna | `feature/agent-skills-fase5-internal-skill` | PR #15 | `97bce11`, `ce66108`, `04d13bb` (merge `1c25a99`) | completada 2026-11-17 |
| 6 Memory bank | `feature/agent-skills-fase6-memory-bank` | - | - | pendiente |
| Final | `feature/agent-skills` -> `main` | - | - | pendiente |

Definition of Done: las seis fases cerradas con su PR y commits identificables, la rama de integracion con PR abierto contra `main`, cada cambio de codigo trazable a una instruccion de skill y verificado en la app o con los comandos documentados, y ningun resultado inventado. Una fase con un check bloqueado sigue abierta aunque se haya escrito su codigo.
