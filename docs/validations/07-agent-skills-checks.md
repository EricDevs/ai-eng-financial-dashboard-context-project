# 07 - Agent skills checks

Registro de evidencia del proyecto 4 ([roadmap](../entregables/ROADMAP-Project-4.md)): comandos exactos, salidas observadas, propuestas aceptadas/rechazadas y limites. Una seccion por fase.

## Fase 1: preparacion, linea base y descubrimiento

Fecha: 2026-11-16. Rama: `feature/agent-skills-fase1-setup` (desde `feature/agent-skills`, creada desde `main` en `ac3c6f3`). Reglas leidas: WF, FE, DX.

### 1.3 Como ejecutar la app y validar el frontend

| Pregunta | Respuesta | Evidencia |
| --- | --- | --- |
| Arranque de la app | `docker compose up --build`; frontend en `http://localhost:5173`, API en `http://localhost:8000` | [README.md](../../README.md) "How to run locally", [docker-compose.yml](../../docker-compose.yml) |
| Proxy `/api` | Vite reenvia a `http://backend:8000` (hostname de Compose); fuera de Compose hace falta `VITE_API_BASE_URL` | [vite.config.ts](../../frontend/vite.config.ts), README |
| Comando de build que valida el frontend | `npm --prefix frontend run build` (`tsc -b && vite build`) | [package.json](../../frontend/package.json), [stack.md](../../memory-bank/stack.md) |
| Lint y tests | `npm --prefix frontend run lint`; `npm --prefix frontend test` | package.json, stack.md |
| Donde viven las skills | `.agents/skills/<skill>/SKILL.md` | README "Expected agents directory structure", [AGENTS.md](../../AGENTS.md) |

### 1.4 Linea base de calidad (antes de aplicar skills)

| Comando | Resultado |
| --- | --- |
| `npm --prefix frontend run build` | exit 0. `dist/assets/index-*.js` 584.25 kB (gzip 175.19 kB), CSS 17.75 kB. **Aviso preexistente**: "Some chunks are larger than 500 kB after minification" |
| `npm --prefix frontend run lint` | exit 0, sin errores ni avisos |
| `npm --prefix frontend test` | exit 0, 1 archivo, 6 tests passed |

Criterio para fases 2-4: el aviso de chunk > 500 kB es la linea base; cualquier aviso adicional debe justificarse o corregirse.

Limite: la pasada manual de teclado no se hizo en esta fase. Se hace al inicio de la fase 2, porque el flujo de la skill `accessibility` empieza por una auditoria sobre la pagina renderizada.

### 1.5 Descubrimiento con `npx skills find`

`npx skills find accessibility` (primeros resultados, en el orden devuelto):

| Skill | Instalaciones |
| --- | --- |
| `addyosmani/web-quality-skills@accessibility` | 71K |
| `flutter/agent-plugins@flutter-improving-accessibility` | 8.4K |
| `jakubkrehel/skills@better-accessibility` | 37.4K |
| `microsoft/vscode@accessibility` | 3.2K |
| `ibelick/ui-skills@fixing-accessibility` | 24K |

`npx skills find vercel-react-best-practices`:

| Skill | Instalaciones |
| --- | --- |
| `vercel-labs/agent-skills@vercel-react-best-practices` | 904.3K |
| `vercel-labs/sandcastle@vercel-react-best-practices` | 24 |
| `akillness/jeo-skills@vercel-react-best-practices` | 383 |

Eleccion: `addyosmani/web-quality-skills@accessibility` (nombre exacto, la mas instalada, web generica y no de un framework ajeno como Flutter) y `vercel-labs/agent-skills@vercel-react-best-practices` (fuente oficial de Vercel; las demas son copias). Contenido revisado en GitHub antes de instalar.

### 1.6 Instalacion y carga

```bash
npx -y skills add addyosmani/web-quality-skills --skill accessibility -a claude-code codex -y
npx -y skills add vercel-labs/agent-skills --skill vercel-react-best-practices -a claude-code codex -y
```

- Copia canonica en `.agents/skills/<skill>/` (versionada); `.claude/skills/<skill>` es un symlink local (`.claude/` esta en `.gitignore`). `skills-lock.json` fija el commit de origen de cada skill.
- Primer intento solo con `-a claude-code`: copio a `.claude/skills/` (ignorado) y nada a `.agents/skills/`. Se repitio anadiendo `codex`, que usa `.agents/skills/`.
- Evaluacion de seguridad mostrada por la CLI para ambas: Gen "Safe", Socket "0 alerts", Snyk "Low Risk".
- Limite: la lista de skills de una sesion de Claude Code se construye al arrancar; en esta sesion `Skill(accessibility)` devolvio "Unknown skill". El agente las cargo leyendo su `SKILL.md`. Una sesion nueva las detecta via `.claude/skills/`.

Resumen de instrucciones y aplicabilidad a este repo (Vite + React 19, sin Next.js ni SSR):

**`accessibility`** (WCAG 2.2, 464 lineas + `references/`). Flujo guiado por evidencia: auditoria Lighthouse sobre la pagina renderizada, localizar nodos fallidos, revisar arbol de accesibilidad y teclado, corregir y repetir la misma auditoria. Cubre `alt`, nombres accesibles de iconos, contraste (4.5:1 texto), no depender solo del color, teclado y foco visible, skip links, `lang`, landmarks, ARIA solo cuando no basta HTML nativo, live regions. Aplicable completa. Puntos a auditar en fase 2: graficas Recharts (color como unica diferencia, nombre accesible), iconos Lucide, estados de carga/error (live regions), `lang`, landmarks y jerarquia de titulos.

**`vercel-react-best-practices`** (70 reglas en 8 categorias). **No cubre `next/image`, `next/font` ni metadatos por pagina**, a diferencia de lo que describe el enunciado: es una guia de rendimiento. Aplicabilidad:

| Categoria | Aplica | Motivo |
| --- | --- | --- |
| `bundle-` (dynamic imports, barrel imports, conditional) | Si | Chunk de 584 kB; Recharts y Lucide |
| `rerender-`, `rendering-`, `js-` | Si | Componentes React cliente |
| `client-` | Parcial | Hay un `fetch` en `App.tsx`; SWR seria una dependencia nueva (regla DX) |
| `async-` | Parcial | Solo waterfalls de cliente; `async-api-routes` no aplica |
| `server-` | No | Sin SSR/RSC |
| Reglas con APIs de Next (`next/dynamic`, `after()`) | Equivalente o N/A | Se usa `React.lazy`/`import()` en Vite |

## Fase 2: skill `accessibility`

Fecha: 2026-11-16. Rama: `feature/agent-skills-fase2-accessibility` (desde `feature/agent-skills` en `3ed7ade`). Reglas leidas: WF, FE.

Carga: tras el merge de la fase 1 la sesion detecto la skill y se invoco con `Skill(accessibility)`. Se siguio su "Evidence-led audit workflow": Lighthouse sobre la pagina renderizada, arbol de accesibilidad, teclado, correccion y repeticion de la misma auditoria.

### 2.1 Auditoria (antes de cambios)

App en ejecucion con `docker compose` (`http://localhost:5173`, datos reales del backend). Herramientas: Lighthouse CLI, arbol de accesibilidad y JavaScript en Chrome (Claude in Chrome), teclado real.

**Lighthouse** (`npx -y lighthouse@12 http://localhost:5173 --only-categories=accessibility --output=json --chrome-flags="--headless=new"`, modo movil por defecto): version 12.8.2, **puntuacion 100, sin auditorias fallidas**. Como advierte la skill, 100 no es conformidad WCAG; Lighthouse no evalua texto SVG ni el contraste del foco. Los hallazgos siguientes salen de la inspeccion manual.

Contraste: colores calculados con `getComputedStyle` convertidos a sRGB con un canvas (los tokens son `oklch`) y formula de luminancia relativa WCAG.

| ID | Hallazgo | Evidencia | Instruccion de la skill | Archivo |
| --- | --- | --- | --- | --- |
| A1 | Texto de ejes de las graficas con contraste insuficiente | `oklch(0.5)` sobre tarjeta `oklch(0.18)`: **3.14:1** (texto de 11-12 px, minimo 4.5:1). Causa raiz: `@theme inline` define `--color-muted-foreground: var(--muted-foreground)` en `:root` y se resuelve con el valor del tema claro; en `main.dark` `--muted-foreground` vale `oklch(0.62)` pero `--color-muted-foreground` sigue en `oklch(0.5)` | Color contrast (1.4.3), Critical | [income-outcome-chart.tsx:83,88](../../frontend/src/components/dashboard/income-outcome-chart.tsx), [profit-percent-chart.tsx:85,90](../../frontend/src/components/dashboard/profit-percent-chart.tsx) |
| A2 | Anillo de foco con contraste insuficiente | `outline-ring/50` sobre la tarjeta: **2.04:1** (minimo 3:1). Con opacidad completa: 4.69:1 | Focus visible (2.4.7) y "Focus states need contrast too (3:1)" (1.4.11) | [index.css:113](../../frontend/src/index.css) |
| A3 | Graficas sin nombre accesible | Las dos `svg` tienen `role="application"` y `tabindex="0"` (capa de accesibilidad de Recharts) sin `aria-label` ni `<title>` | ARIA usage (4.1.2), Text alternatives (1.1) | ambos archivos de graficas |
| A4 | Sin estructura de encabezados | Solo existe `h1` "Financial Overview"; titulos de tarjetas y graficas son `div`/`span` | "Missing heading structure", Serious | [card.tsx:31](../../frontend/src/components/ui/card.tsx), [kpi-card.tsx:56](../../frontend/src/components/dashboard/kpi-card.tsx) |
| A5 | Error de carga no anunciado | Estado de error observado (segunda instancia montada con `fetch` que devuelve 500): el aviso se muestra sin `role="alert"` ni `aria-live` | Error handling (3.3.1), Live regions (4.1.3) | [App.tsx:52](../../frontend/src/App.tsx) |
| A6 | Cambio de idioma no marcado | El aviso de error esta en espanol dentro de `<html lang="en">`, sin `lang="es"` | Page language (3.1.1): "Language changes within page" | [App.tsx:52](../../frontend/src/App.tsx) |
| A7 | Titulo de pagina no descriptivo | `document.title` = `frontend` | 2.4.2 Page Titled ([WCAG.md](../../.agents/skills/accessibility/references/WCAG.md)) | [index.html:7](../../frontend/index.html) |
| A8 | Animacion que ignora movimiento reducido | Skeletons con `animate-pulse` sin variante `motion-safe`; no hay reglas `prefers-reduced-motion` en las hojas de estilo | Motion (2.3) | [skeleton.tsx:7](../../frontend/src/components/ui/skeleton.tsx) |
| A9 | Series distinguidas solo por color | Lineas income/outcome: mismo grosor y estilo; contraste entre ellas 1.19:1 | "Don't rely on color alone" (1.4.1) | [income-outcome-chart.tsx:100-117](../../frontend/src/components/dashboard/income-outcome-chart.tsx) |
| A10 | Carga no expuesta | Las secciones no indican estado ocupado mientras se muestran skeletons | Live regions (4.1.3), Moderate | [App.tsx:57-67](../../frontend/src/App.tsx) |

Verificado sin problemas: `lang="en"`; landmarks `main`, `banner` y dos `region` con nombre; los 5 iconos Lucide tienen `aria-hidden="true"`; no hay `<img>` renderizadas (`hero.png` sin uso); resto de textos 5.18:1 o mas; lineas de datos 5.11-6.38:1 contra la tarjeta; teclado: Tab alcanza las dos graficas en orden visual, las flechas mueven el tooltip (Nov 2025 -> Jan 2026), sin trampa de foco (el siguiente Tab sale de `#root`); las animaciones de Recharts 3.8.1 respetan movimiento reducido (`isAnimationActive: 'auto'`, `usePrefersReducedMotion`). Skip link y tamano de objetivo: N/A (no hay navegacion repetida ni botones).

No propuesto: cambiar el color de la cuadricula y de la `ReferenceLine` (mismo origen que A1, pero el valor claro da mas contraste; corregirlo empeoraria 1.4.11); traducir el aviso de error (cambio de idioma de producto, regla FE).

### 2.2 Revision de propuestas

Las 10 propuestas (A1-A10) se presentaron al mantenedor con archivo, cambio e instruccion de la skill; **aceptadas las 10** el 2026-11-16. Rechazadas: ninguna (las dos exclusiones de arriba no llegaron a proponerse).

### 2.3 Cambios implementados

| ID | Cambio | Archivo |
| --- | --- | --- |
| A1 | `fill: 'var(--color-muted-foreground)'` -> `'var(--muted-foreground)'` en los 4 ejes | `income-outcome-chart.tsx`, `profit-percent-chart.tsx` |
| A2 | `outline-ring/50` -> `outline-ring` en la regla base | `index.css` |
| A3 | Props `title` y `desc` en cada `LineChart` (Recharts 3.8.1 los renderiza como `<title>`/`<desc>` del SVG) | ambos archivos de graficas |
| A4 | `CardTitle` renderiza `h2` (tipo `ComponentProps<'h2'>`); etiqueta del KPI `span` -> `h2` | `card.tsx`, `kpi-card.tsx` |
| A5, A6 | `role="alert"` y `lang="es"` en el aviso de error (texto sin cambios) | `App.tsx` |
| A7 | `<title>frontend</title>` -> `<title>Financial Overview</title>` | `index.html` |
| A8 | `animate-pulse` -> `motion-safe:animate-pulse` | `skeleton.tsx` |
| A9 | Linea outcome con `strokeDasharray="6 4"`; ambas lineas con `legendType="plainline"` (el icono de leyenda refleja el trazo, comprobado en `DefaultLegendContent.js`) | `income-outcome-chart.tsx` |
| A10 | `aria-busy={loading}` en las dos secciones | `App.tsx` |

### 2.4 Verificacion (despues de cambios)

Comandos:

| Comando | Resultado |
| --- | --- |
| `npm --prefix frontend run lint` | exit 0, sin errores ni avisos |
| `npm --prefix frontend test` | exit 0, 6 passed |
| `npm --prefix frontend run build` | exit 0; JS 584.60 kB (linea base 584.25 kB). **Solo el aviso preexistente** de chunk > 500 kB; ningun aviso nuevo |
| `git diff --check` | limpio |

**Hallazgo de entorno (preexistente, no corregido)**: tras editar, Vite en Docker seguia sirviendo los modulos antiguos (`/src/components/dashboard/kpi-card.tsx` devolvia `span`) aunque `docker compose exec frontend` mostraba el archivo nuevo. El watcher no recibe eventos de cambio a traves del bind mount de Windows/OneDrive; `index.html` si cambiaba porque se lee en cada peticion. Una primera repeticion de Lighthouse se hizo sobre ese codigo antiguo y se descarto. Se ejecuto `docker compose restart frontend` y se comprobo que Vite servia `_jsxDEV("h2"` antes de repetir las pruebas. Afecta al flujo de verificacion de cualquier cambio en este entorno (regla DX).

Misma auditoria sobre la app en ejecucion con el codigo nuevo:

| ID | Antes | Despues | Como se midio |
| --- | --- | --- | --- |
| Lighthouse | 100, 0 fallos | 100, 0 fallos (`document-title`, `heading-order`, `color-contrast` en 1) | mismo comando CLI |
| A1 | 3.14:1 | **5.18:1** | `getComputedStyle` + canvas |
| A2 | 2.04:1 | **4.69:1**; anillo solido visible en captura | idem + captura con foco |
| A3 | `application` sin nombre | `application` "Income vs. Outcome" / "Profit Margin %" con descripcion | arbol de accesibilidad de Chrome por CDP (`page.accessibility.snapshot()` con `puppeteer-core` de la cache de Lighthouse) |
| A4 | solo `h1` | `h1` + 6 `h2` (4 KPI, 2 graficas) | idem; Chrome expone los KPI en mayusculas por `text-transform` |
| A5, A6 | sin `role`, sin `lang` | `role="alert"`, `lang="es"` | segunda instancia con `fetch` que tarda 1.2 s y devuelve 500 |
| A7 | `frontend` | `Financial Overview` | `document.title` |
| A8 | `animate-pulse` siempre | regla compilada `@media (prefers-reduced-motion:no-preference){.motion-safe\:animate-pulse{...}}` | CSS de `dist` |
| A9 | dos lineas continuas | income continua, outcome `6px, 4px...`; icono de leyenda `stroke-dasharray="6 4"` | DOM tras terminar la animacion + captura |
| A10 | sin estado | `aria-busy="true"` durante la carga, `"false"` despues | misma segunda instancia |

Teclado (tras dar foco a la pagina; una primera pasada no llego a la pagina porque `document.hasFocus()` era `false`): Tab -> grafica "Income vs. Outcome" con `:focus-visible`; flecha derecha mueve el tooltip; Tab -> "Profit Margin %"; Tab -> fuera de `#root`. Sin trampas de foco.

Limites: no se probo con un lector de pantalla real (NVDA/VoiceOver), zoom al 200 % ni modo de alto contraste de Windows; el arbol de accesibilidad de Chrome es la evidencia de nombres y roles. Lighthouse no evalua texto SVG ni contraste del foco: esos valores salen del calculo manual.

## Fase 3: skill `vercel-react-best-practices`

Fecha: 2026-11-16. Rama: `feature/agent-skills-fase3-react-best-practices` (desde `feature/agent-skills` en `98e6bc5`). Reglas leidas: WF, FE, DX. Skill cargada con `Skill(vercel-react-best-practices)`; se leyeron los archivos de regla candidatos en `.agents/skills/vercel-react-best-practices/rules/`.

### 3.1 Auditoria (antes de cambios)

Mediciones (todo fuera del repo, en el scratchpad de la sesion):

- **Composicion del bundle**: `npx vite build --sourcemap --outDir <scratch>` + `npx -y source-map-explorer <js> --json`. Total atribuido 570.9 KiB: `recharts` 213.2 KiB (37.3 %), `react-dom` 174.3 KiB (30.5 %); **Recharts y sus dependencias** (`@reduxjs/toolkit`, `es-toolkit`, `d3-*`, `decimal.js-light`, `immer`, `react-redux`, `redux`, `reselect`...) **344.4 KiB (60.3 %)**. `lucide-react` 2.07 KiB. Recharts solo se importa en `income-outcome-chart.tsx` y `profit-percent-chart.tsx`.
- **Rendimiento en build de produccion**: `VITE_API_BASE_URL=http://localhost:8000 npx vite build --outDir <scratch>` + `npx vite preview --port 4173`, `npx -y lighthouse@12 http://localhost:4173 --only-categories=performance` (movil simulado por defecto), 3 pasadas:

| Pasada | Score | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- |
| 1 | 86 | 1.9 s | 2.6 s | 400 ms | 0 |
| 2 | 85 | 2.5 s | 3.0 s | 290 ms | 0 |
| 3 | 90 | 1.9 s | 2.4 s | 320 ms | 0.014 |

- Elemento LCP: el valor del primer KPI (`p.text-3xl`, "$1,258,147"). Fases del LCP (pasada 1): TTFB 456 ms, **render delay 2161 ms (83 %)**. Cadena de red: HTML -> `index-*.js` (174 KB transferidos) -> `/api/metrics`: la peticion de datos no empieza hasta que el JS completo se descarga y ejecuta (bootup del JS 2.0 s, 1.9 s de scripting simulado). `unused-javascript`: 70 KiB sin usar del chunk principal.

Hallazgos:

| ID | Regla (impacto en la skill) | Hallazgo y evidencia | Archivo |
| --- | --- | --- | --- |
| R1 | `bundle-dynamic-imports` (CRITICAL) | Las graficas (Recharts + dependencias, 60 % del JS) van en el chunk principal aunque el LCP (KPI) no las necesita. Retrasan la ejecucion del JS, y con ello el `fetch` y el LCP; causan el aviso de chunk > 500 kB | [App.tsx:4-5](../../frontend/src/App.tsx) |
| R2 | `rendering-resource-hints` (HIGH) | Cascada HTML -> JS -> API: `/api/metrics` solo se pide tras ejecutar todo el JS (render delay 83 % del LCP). Un `preload` de los datos empezaria la peticion en paralelo con el JS | [index.html](../../frontend/index.html), [App.tsx:15-21](../../frontend/src/App.tsx) |
| R3 | `js-combine-iterations` (LOW-MEDIUM) | `computeKPIs` recorre los movimientos con dos `filter` + dos `reduce`. Con 360 movimientos el coste no es medible | [financial-utils.ts:21-34](../../frontend/src/lib/financial-utils.ts) |
| R4 | `js-cache-function-results` (LOW-MEDIUM) | `formatCurrency` crea un `Intl.NumberFormat` por llamada; se llama ~4 veces por render y en cada tooltip. Coste no medible | [financial-utils.ts:69-76](../../frontend/src/lib/financial-utils.ts) |

Cumple ya (sin cambios): `rendering-conditional-render` (ternarios con `: null` en `App.tsx` y graficas); `rerender-no-inline-components` (`CustomTooltip` a nivel de modulo); `rerender-derived-state-no-effect` (el efecto solo trae datos; los `setState` del `then` se agrupan en un render); `rendering-script-defer-async` (`<script type="module">` es diferido por defecto); `async-parallel`/`async-dependencies` (una sola peticion, sin cascada entre peticiones).

No hay problema medible: layout shift (CLS 0-0.014; skeletons de graficas con la misma altura, 280 px, que la grafica); `bundle-barrel-imports` (`lucide-react` aporta 2 KiB: Vite ya elimina iconos sin usar en produccion; el coste de la regla es de arranque en desarrollo).

Fuera del codigo (no se proponen): `uses-text-compression` (`vite preview` no comprime; lo hace el servidor de despliegue), `uses-rel-preconnect` (artefacto de la medicion con la API en otro origen; en Compose va por el proxy en el mismo origen), CSS bloqueante 156 ms (CSS unico de Vite; ninguna regla de la skill lo cubre), reflow forzado de 45 ms dentro del bundle (codigo de libreria), puntuacion SEO / `meta description` (no lo cubre esta skill; candidato para la fase 4).

### 3.2 Aplicabilidad de reglas a Vite (sin Next.js ni servidor)

| Reglas | Aplica | Motivo / equivalente en Vite |
| --- | --- | --- |
| `server-*` (10 reglas), `async-api-routes`, `rendering-hydration-*`, `bundle-defer-third-party` (cuando habla de hidratacion) | No | No hay SSR, RSC, server actions ni rutas API en el frontend; no hay hidratacion (`createRoot`) ni scripts de terceros |
| `async-suspense-boundaries` | No (streaming) | Habla de streaming de servidor; en cliente la parte util es la `Suspense` de R1 |
| `bundle-dynamic-imports` | Si, con equivalente | `next/dynamic` -> `React.lazy(() => import(...))` + `<Suspense>`; Vite crea el chunk aparte |
| `bundle-barrel-imports` | Equivalente sin impacto | `optimizePackageImports` es de Next; en Vite el tree-shaking de produccion ya reduce `lucide-react` a 2 KiB |
| `rendering-resource-hints` | Si | `preload` de `react-dom` o `<link rel="preload" as="fetch">` en `index.html` |
| `client-swr-dedup` | No necesario | Una sola peticion en un solo componente; SWR seria una dependencia nueva sin beneficio (regla DX) |
| `rendering-activity`, `rerender-transitions`, `rerender-use-deferred-value` | No | No hay mostrar/ocultar, inputs ni actualizaciones no urgentes |
| `rerender-*`, `rendering-*`, `js-*` restantes | Revisadas | Sin hallazgos salvo R3 y R4 |
| `next/image`, `next/font`, metadatos por pagina | N/A | No estan en esta skill (ver fase 1); no hay `<img>` renderizadas; `Inter` se declara en `--font-sans` pero no se descarga ninguna fuente web (se usa la del sistema), asi que no hay coste de carga de fuentes |

### Decision del mantenedor

R1 aceptado. R2 aplazado hasta medir el efecto de R1. R3 y R4 descartados: impacto no medible.

### 3.3 Cambio implementado (R1, `bundle-dynamic-imports`)

Solo [App.tsx](../../frontend/src/App.tsx): las dos graficas pasan de import estatico a `React.lazy(() => import(...).then((m) => ({ default: m.X })))` (equivalente Vite de `next/dynamic`), cada una dentro de `<Suspense>`. El `fallback` (`ChartFallback`) repite el marcado `Card` + `Skeleton` del estado de carga de las graficas para que el cambio de uno a otro no mueva el layout.

### 3.4 Verificacion

| Comando | Resultado |
| --- | --- |
| `npm --prefix frontend run lint` | exit 0 |
| `npm --prefix frontend test` | 6 passed |
| `npm --prefix frontend run build` | exit 0, **sin avisos**: el aviso de chunk > 500 kB desaparece. Chunk principal 584.60 kB -> **187.76 kB** (gzip 175.34 -> 59.83 kB); Recharts en `LineChart-*.js` 342.30 kB; graficas 9.86 y 6.68 kB; compartido `financial-utils-*.js` 40.47 kB (con `modulepreload` en `index.html`) |

Lighthouse de rendimiento repetido igual que en 3.1 (build de produccion en el scratchpad, `vite preview` 4173, 3 pasadas):

| | Score | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- |
| Antes (3.1) | 85 / 86 / 90 | 1.9-2.5 s | 2.4-3.0 s | 290-400 ms | 0-0.014 |
| Despues | 87 / 88 / 89 | 1.9 s | 2.7-2.8 s | 280-340 ms | 0.014 |

**Iteracion real de la medicion**: la primera tanda "despues" se descarto. `curl` mostro que el puerto 4173 servia `index-Di_3C-O9.js` (bundle anterior): el `vite preview` de la auditoria seguia vivo (PID 15532, `--outDir .../dist-prod`) porque `TaskStop` cierra el shell pero no el proceso `node` hijo; el preview nuevo fallo con `--strictPort`. Se termino ese proceso, se comprobo que se servia `index-B7QkJpr-.js` y se repitieron las 3 pasadas. Al terminar se reprodujo el mismo comportamiento (PID 23964) y se paro igual.

Por que el LCP no mejora de forma medible (pasada 1 de cada tanda):

| | Antes | Despues |
| --- | --- | --- |
| Scripting simulado por archivo | `index` 1939 ms | `index` 1670 ms + `LineChart` 226 ms |
| Peticion de las graficas (observado) | en el chunk principal | `income-outcome-chart` y `LineChart` empiezan a los 116-117 ms |
| `/api/metrics` (observado) | 199 -> 510 ms | 156 -> 193 ms |
| LCP render delay (simulado) | 2161 ms | 2288 ms |

El tiempo de CPU lo domina React renderizando (chunk principal, ~1.7 s con la CPU simulada 4x), no la evaluacion de Recharts (226 ms). Ademas las graficas se ven al cargar, asi que su chunk se pide nada mas montar la app. Resultado: R1 cumple su objetivo de bundle (chunk principal -68 %, aviso eliminado) y no empeora nada, pero no mejora el LCP mas alla del ruido entre pasadas.

App en ejecucion (`docker compose`, tras `docker compose restart frontend` y comprobar que Vite servia `lazy(`):

- Accesibilidad sin regresiones: Lighthouse 100, 0 fallos; arbol de Chrome por CDP: `h1` + 6 `h2`, las dos graficas `application` con nombre y descripcion, igual que tras la fase 2.
- Layout: altura de las tarjetas de grafica muestreada cada 25 ms durante la carga (segunda instancia con `fetch` que no resuelve): **414 px constante** entre el `fallback` de `Suspense` y el estado de carga propio de la grafica. Con datos: 422 px; esos 8 px ya existian antes de R1 y corresponden al CLS 0.014 medido antes y despues.
- Las dos graficas se renderizan (2 `svg[role=application]`).

### R2 tras medir R1

No se recomienda. R2 adelantaria la peticion de `/api/metrics`, pero tras R1 la peticion termina a los ~193 ms observados, mientras que el retraso del LCP (~2.3 s simulados) es tiempo de CPU del render de React. Adelantar la red no acorta ese tiempo, y R2 anade riesgo (peticion duplicada si el `preload` no coincide con el `fetch`, y respetar `VITE_API_BASE_URL` en `index.html`). **Descartado por el mantenedor** el 2026-11-16 con este motivo.
