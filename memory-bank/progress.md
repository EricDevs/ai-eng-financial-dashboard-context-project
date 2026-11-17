# Progress

Revision: 2026-11-17, proyecto 4 (mejora guiada por agent skills). Fuentes:
[07-agent-skills-checks.md](../docs/validations/07-agent-skills-checks.md)
(evidencia por fase), [ROADMAP-Project-4.md](../docs/entregables/ROADMAP-Project-4.md)
y los commits de las PR #11-#15. Cada cifra sale de una medicion registrada alli.

## Skills aplicadas

| Skill | Origen | Fase | Que se cambio |
| --- | --- | --- | --- |
| `accessibility` | `addyosmani/web-quality-skills` | 2 | 10 hallazgos (A1-A10) aceptados: contraste de ejes y foco, nombre accesible de las graficas, `h2` en tarjetas y KPI, aviso de error con `role="alert"` y `lang="es"`, `<title>` "Financial Overview", `motion-safe` en skeletons, linea outcome discontinua, `aria-busy` en las secciones |
| `vercel-react-best-practices` | `vercel-labs/agent-skills` | 3 | R1 `bundle-dynamic-imports`: graficas con `React.lazy` + `Suspense`. R2 (preload de datos) descartado tras medir R1; R3 y R4 descartados por impacto no medible |
| `vitest` | `antfu/skills` (ecosistema) | 4 | `jsdom` como dependencia de desarrollo y [App.test.tsx](../frontend/src/App.test.tsx): estados de carga y error |
| `verify-frontend-change` | interna, [.skills](../.skills/verify-frontend-change/SKILL.md) | 5 | Skeletons de cabecera de grafica alineados con la cabecera cargada |

Las comunitarias estan en `.agents/skills/` y fijadas en `skills-lock.json`;
la interna en `.skills/`. Ambas rutas estan en [AGENTS.md](../AGENTS.md).

## Cambios verificados

| Cambio | Antes | Despues | Como se midio |
| --- | --- | --- | --- |
| Contraste texto de ejes (A1) | 3.14:1 | 5.18:1 | `getComputedStyle` + canvas |
| Contraste anillo de foco (A2) | 2.04:1 | 4.69:1 | idem |
| Encabezados (A4) | solo `h1` | `h1` + 6 `h2` | arbol de accesibilidad de Chrome (CDP) |
| Lighthouse accesibilidad | 100 | 100 | Lighthouse 12 CLI |
| Chunk JS principal (R1) | 584.60 kB, aviso > 500 kB | 187.76 kB, sin avisos | `npm run build` |
| LCP (R1) | 2.4-3.0 s | 2.7-2.8 s (sin mejora fuera del ruido) | Lighthouse x3 sobre `vite preview` |
| Tests frontend | 6 (utilidades) | 8 (+2 de estados de `App`) | `npm test`; mutaciones M1-M4 hacen fallar los tests nuevos |
| Altura tarjeta de grafica | 414 px cargando, 422 con datos | 422 px en ambos estados | script CDP en la app en Docker |

Teclado comprobado en la fase 2: Tab recorre las dos graficas, las flechas
mueven el tooltip, sin trampas de foco.

## Skill del ecosistema elegida: `vitest`

Se buscaron `testing`, `seo` y `typescript` con `npx skills find` y se leyo el
`SKILL.md` de 6 candidatas antes de instalar. La primera recomendacion fue
`seo` (Lighthouse SEO 82/100), pero el mantenedor cuestiono su valor en un
dashboard interno: solo aportaria `noindex`. `typescript` tenia un gap casi
nulo (0 errores con `strict`). Las candidatas de `testing` pedian Playwright o
un servidor MCP, asi que se busco `vitest`, el runner que ya usa el repo.

Por que `antfu/skills@vitest`: ningun test protegia las mejoras de las fases 2
y 3; la skill viene del equipo de Vitest; solo exige un entorno DOM (`jsdom`,
autorizado por el mantenedor). Riesgo gestionado: describe Vitest 5.1 beta y el
repo usa 4.1.4, asi que cada API usada se comprobo en la version instalada.

## Skill interna: `verify-frontend-change`

Por que: en este entorno hubo resultados falsos al verificar cambios. Vite en
Docker siguio sirviendo modulos viejos (fase 2), un `vite preview` huerfano
hizo medir el bundle anterior (fase 3) y Lighthouse con la app caida dio
puntuacion `null` (fase 4). Ninguna skill comunitaria cubre esas trampas.

La skill fija los pasos (confirmar el diff, lint/tests/build, confirmar el
modulo servido, medir produccion con el JS correcto, liberar el puerto 4173,
demostrar que los tests nuevos fallan, registrar) y sus criterios de
aceptacion. Pruebas de activacion en sesiones nuevas: v2 acerto 8/8 casos (3
debian activarla, 5 no). En la tarea real detecto el modulo viejo servido y el
preview vivo, y llevo a corregir una atribucion de la fase 3 (ver abajo).

## No verificado o abierto

- CLS intermitente 0.014: lo produce la tarjeta KPI PROFIT (antes se atribuyo
  a las graficas); causa sin investigar.
- LCP dominado por el render de React (~1.7 s de CPU simulada), no por la red.
- Sin lector de pantalla real, zoom al 200 % ni alto contraste de Windows.
- 21 vulnerabilidades npm preexistentes (ninguna nueva con `jsdom`), sin evaluar.
- `noindex` (skill `seo`) documentado como alternativa si la app se expone.
- Claude Code solo descubre la skill interna con un enlace local
  `.claude/skills/verify-frontend-change` -> `.skills/verify-frontend-change`.
