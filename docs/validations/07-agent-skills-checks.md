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
- Layout: altura de las tarjetas de grafica muestreada cada 25 ms durante la carga (segunda instancia con `fetch` que no resuelve): **414 px constante** entre el `fallback` de `Suspense` y el estado de carga propio de la grafica. Con datos: 422 px; esos 8 px ya existian antes de R1. **Corregido en la fase 5 (5.4)**: el CLS 0.014 no viene de estas tarjetas sino de la tarjeta KPI PROFIT (audit `layout-shifts` de las pasadas de esta fase); ver [5.4](#54-tarea-real-salto-de-8-px-en-las-tarjetas-de-grafica).
- Las dos graficas se renderizan (2 `svg[role=application]`).

### R2 tras medir R1

No se recomienda. R2 adelantaria la peticion de `/api/metrics`, pero tras R1 la peticion termina a los ~193 ms observados, mientras que el retraso del LCP (~2.3 s simulados) es tiempo de CPU del render de React. Adelantar la red no acorta ese tiempo, y R2 anade riesgo (peticion duplicada si el `preload` no coincide con el `fetch`, y respetar `VITE_API_BASE_URL` en `index.html`). **Descartado por el mantenedor** el 2026-11-16 con este motivo.

## Fase 4: explorar el ecosistema

Fecha: 2026-11-17. Rama: `feature/agent-skills-fase4-ecosystem` (desde `feature/agent-skills` en `23f4da1`). Reglas leidas: WF, FE, DX. Temas pedidos por el mantenedor: `testing`, `seo` y `typescript` (los tres primeros de la lista de gaps; `performance` ya cubierto en la fase 3 y `forms` sin formularios en la app).

### 4.1 Busqueda (`npx -y skills find <tema>`)

Primeros resultados devueltos, en orden:

| Tema | Skill | Instalaciones |
| --- | --- | --- |
| `testing` | `anthropics/skills@webapp-testing` | 207.2K |
| | `clerk/skills@clerk-testing` | 48.9K |
| | `coreyhaines31/marketingskills@ab-testing` | 89.3K |
| | `addyosmani/agent-skills@browser-testing-with-devtools` | 72.2K |
| | `github/awesome-copilot@webapp-testing` | 12.6K |
| `seo` | `coreyhaines31/marketingskills@seo-audit` | 257.2K |
| | `coreyhaines31/marketingskills@ai-seo` | 166.9K |
| | `coreyhaines31/marketingskills@programmatic-seo` | 163.3K |
| | `addyosmani/web-quality-skills@seo` | 56.3K |
| | `iannuttall/seo@seo` | 33.5K |
| `typescript` | `wshobson/agents@typescript-advanced-types` | 100.4K |
| | `github/awesome-copilot@javascript-typescript-jest` | 14.6K |
| | `jeffallan/claude-skills@typescript-pro` | 14.9K |
| | `langchain-ai/langchain-skills@*-typescript-quickstart` | 5.9K |

Descartadas sin leer por no corresponder al stack o al gap: `clerk-testing` (autenticacion Clerk), `ab-testing` (marketing), `golang-testing`, `limrun-*` (movil), `javascript-typescript-jest` (Jest; el repo usa Vitest), `langchain-*` y `typescript-mcp-server-generator` (otros dominios), `ai-seo` y `programmatic-seo` (contenido a escala).

### Revision de candidatas (`SKILL.md` leido en GitHub antes de instalar)

| Skill | Que cubre | Requisitos para aplicarla aqui |
| --- | --- | --- |
| `anthropics/skills@webapp-testing` | Pruebas de apps web con Playwright: arbol de decision, `scripts/with_server.py`, reconocimiento y accion | Python + Playwright y navegadores; infraestructura E2E nueva |
| `addyosmani/agent-skills@browser-testing-with-devtools` | Pruebas en navegador real con Chrome DevTools MCP (DOM, consola, red, rendimiento) | "Requires the chrome-devtools MCP server to be configured" |
| `addyosmani/web-quality-skills@seo` (MIT, 409 lineas) | Flujo de auditoria basado en evidencia (Lighthouse SEO, luego senales que Lighthouse no ve, corregir y repetir); crawlability, `robots.txt`, titulos, `meta description`, datos estructurados | Ninguno: Lighthouse CLI ya usado en fases 2 y 3 |
| `coreyhaines31/marketingskills@seo-audit` | Auditoria SEO de marketing: indexacion, Google updates, hreflang, SEO local | Orientada a sitios publicos con trafico |
| `wshobson/agents@typescript-advanced-types` | Genericos, tipos condicionales, mapped types, utilidades | Ninguno, pero el repo solo tiene tipos simples |
| `jeffallan/claude-skills@typescript-pro` (MIT) | Tipos avanzados, branded types, tRPC; `tsconfig` recomendado con `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `NodeNext`, `declaration` | El `tsconfig` recomendado es de libreria/Node (`NodeNext`, `declaration`), no de app Vite |

### Medicion del gap de cada tema

| Tema | Medicion | Resultado |
| --- | --- | --- |
| `typescript` | `npx tsc -p tsconfig.app.json --noEmit --strict` | **exit 0, 0 errores**: el codigo ya cumple `strict` aunque no este declarado. Con opciones extra de `typescript-pro`: `noUncheckedIndexedAccess` 2 errores (ambos en `financial-utils.ts:57`, dominio FIN), `exactOptionalPropertyTypes` 4, `noImplicitOverride` 0 |
| `seo` | `npx -y lighthouse@12 http://localhost:4173 --only-categories=seo` sobre el build de produccion actual (`index-B7QkJpr-.js`) | **82/100**. Fallos: `meta-description` (no existe en `index.html`) y `robots-txt` (15 errores: `public/` solo tiene `favicon.svg`; la SPA responde `/robots.txt` con `index.html`, linea 1 `<!doctype html>` "Syntax not understood"). Pasan: `is-crawlable`, `document-title`, `http-status-code`, `link-text`, `crawlable-anchors`, `hreflang` |
| `testing` | Inventario de tests | 1 archivo (`financial-utils.test.ts`, 6 tests de utilidades); ninguno de componentes ni de navegador ([status.md](../../memory-bank/status.md)) |

Iteracion real de la medicion SEO: la primera ejecucion contra `http://localhost:5173` devolvio `CHROME_INTERSTITIAL_ERROR` (score `null`, todas las auditorias en error) porque Docker Desktop no estaba en marcha (`docker compose ps`: no responde `dockerDesktopLinuxEngine`). Se descarto y se midio sobre `vite preview` del build de produccion, valido para auditorias de HTML; la API no hace falta para ellas. Al parar el preview se reprodujo el proceso `node` huerfano de la fase 3 (PID 8032) y se termino.

### 4.2 Eleccion y justificacion

**Recomendada: `addyosmani/web-quality-skills@seo`.**

1. Gap real y medido: SEO 82/100 con dos fallos concretos, y la falta de `meta description` ya quedo pendiente en la fase 3 (la skill de Vercel no cubre metadatos).
2. Encaje con el stack: es web generica; los cambios esperados son `index.html` y un `public/robots.txt`, sin codigo de Next.
3. Fuente: mismo autor y familia que `accessibility` (fase 2), con el mismo flujo de auditoria basado en evidencia y la misma herramienta (Lighthouse CLI).
4. Cambio pequeno y verificable: sin dependencias nuevas (regla DX); se verifica repitiendo la misma auditoria.
5. No duplica: `accessibility` cubre `title` y `lang`; `vercel-react-best-practices` no cubre metadatos.

Punto abierto para aplicarla: es un dashboard ejecutivo interno. La propia skill contempla bloquear areas privadas (`Disallow`, `noindex`); habra que decidir si el `robots.txt` permite o bloquea la indexacion. Seguridad: la evaluacion Gen / Socket / Snyk se mostrara al instalar.

**Descartadas:**

- `testing`: es el gap de mas valor a largo plazo, pero las candidatas exigen infraestructura nueva (Playwright con Python, o un servidor MCP de Chrome DevTools) y ninguna usa Vitest, el runner del repo. Montar E2E es un cambio de alcance que requiere acuerdo aparte ([status.md](../../memory-bank/status.md): la ausencia de E2E no autoriza construirlo) y no es un cambio pequeno trazable. Queda como prioridad futura.
- `typescript`: el gap medido es casi nulo (0 errores con `strict`). Las skills encontradas tratan tipos avanzados y tRPC, que este repo no usa, y el `tsconfig` de `typescript-pro` es de libreria Node, no de app Vite. Activar `strict` seria un cambio de una linea que no necesita una skill.

### Revision de la eleccion: valor de SEO en un dashboard interno

El mantenedor cuestiono el valor de SEO en un dashboard financiero interno. Analisis: el posicionamiento no aporta nada; lo que si aporta es **evitar la indexacion** si la app se expone en una URL publica (p. ej. una preview), con `robots.txt` (`Disallow`) y `<meta name="robots" content="noindex">`, que la skill contempla. Consecuencia: la puntuacion SEO de Lighthouse bajaria (`is-crawlable` falla a proposito con `noindex`), asi que la mejora no se mide por la puntuacion. La `meta description` tendria poco valor (vistas previas de enlaces).

Como el descarte de `testing` se debia a que las candidatas exigian Playwright o un servidor MCP, se busco una skill para **Vitest**, el runner que ya usa el repo.

`npx -y skills find vitest` (primeros resultados): `antfu/skills@vitest` 48.4K, `pproenca/dot-skills@vitest` 7.7K, `sentimony/skills@vitest` 4.6K, `onmax/nuxt-skills@vitest` 3.3K, `supabase/supabase@vitest` 2.8K. `npx -y skills find "react testing library"`: la mayor es `itechmeat/llm-code@react-testing-library` con 1.4K; el resto por debajo de 500.

`antfu/skills@vitest` (`SKILL.md` de 55 lineas + 21 referencias): autor Anthony Fu (equipo de Vitest), generada desde el repositorio oficial de Vitest. Es una referencia de la API de Vitest (config, CLI, `expect`, hooks, mocking, snapshots, cobertura, entornos `jsdom`/`happy-dom`); no es especifica de React. Esta basada en **Vitest 5.1.0-beta.1**; el repo usa `vitest ^4.1.4`.

Estado del repo para tests de componentes: no hay `vitest.config.*` ni bloque `test` en `vite.config.ts` (entorno por defecto `node`); no hay `jsdom`, `happy-dom` ni `@testing-library/*` en `package.json`.

| Criterio | `seo` (no indexar) | `antfu/skills@vitest` (tests de componentes) |
| --- | --- | --- |
| Gap | Riesgo de indexacion si se expone; `meta description` ausente | Ningun test de componentes; las mejoras de las fases 2 y 3 no estan protegidas |
| Valor para un dashboard interno | Bajo-medio (privacidad) | Alto (evita regresiones de accesibilidad y de la carga diferida) |
| Fuente | Familia de `accessibility` | Equipo de Vitest |
| Dependencias nuevas | Ninguna | Al menos un entorno DOM (`jsdom` o `happy-dom`), probablemente `@testing-library/react`: requiere acuerdo (regla DX) |
| Riesgo | Bajo; la puntuacion SEO baja a proposito | Medio: la skill describe Vitest 5.1 beta y el repo usa 4.1; cada API usada debe comprobarse en la version instalada |
| Tamano del cambio | `index.html` + `public/robots.txt` | Configuracion de entorno + 1-2 archivos de test |

**Decision del mantenedor (2026-11-17): `antfu/skills@vitest`.** `seo` queda descartada por su bajo valor en un dashboard interno; la opcion "no indexar" se documenta como alternativa pequena por si la app llega a exponerse.

### 4.3 Instalacion, carga y auditoria con `vitest`

```bash
npx -y skills add antfu/skills --skill vitest -a claude-code codex -y
```

Copia en `.agents/skills/vitest/`, symlink local en `.claude/skills/vitest`, `skills-lock.json` fija el commit `4a6bb39`. Seguridad mostrada por la CLI: Gen "Safe", Socket "0 alerts", Snyk "Low Risk". Cargada con `Skill(vitest)`.

Referencias de la skill aplicables y comprobacion contra la version instalada (`vitest` 4.1.4):

| Instruccion de la skill | Referencia | Existe en 4.1.4 |
| --- | --- | --- |
| Entorno DOM por archivo con el comentario `// @vitest-environment jsdom` (sin tocar la config global) | `advanced-environments.md`, "Per-File Environment" | Si: `content.match(/@(?:vitest\|jest)-environment\s+([\w-]+)\b/)` en `dist/chunks` |
| Instalar el paquete del entorno: `npm i -D jsdom` | `advanced-environments.md`, "Installing Environment Packages" | `jsdom` es dependencia opcional declarada por `vitest` (`"jsdom": "*"`); no esta instalada (`npm ls jsdom`: vacio) |
| `vi.stubGlobal('fetch', vi.fn(...))` y `vi.unstubAllGlobals()` | `features-mocking.md`, `advanced-vi.md` | Si (`dist/index.d.ts`) |
| `vi.waitFor(...)` para esperar a que una asercion pase | `advanced-vi.md` | Si (`dist/index.d.ts`) |
| Nota "v5: `clearMocks` defaults to `true`" | `features-mocking.md` | No aplica: comportamiento de v5; en 4.1 se crea el mock dentro de cada test |

Estado actual de los tests: 1 archivo (`src/lib/financial-utils.test.ts`, entorno `node`, 6 tests de utilidades). Sin configuracion de Vitest propia. Ninguna de las mejoras de las fases 2 y 3 tiene un test.

Hallazgos y propuestas:

| ID | Propuesta | Justificacion | Instruccion de la skill |
| --- | --- | --- | --- |
| T0 | Anadir **solo** `jsdom` como dependencia de desarrollo | Es el minimo que exige la skill para probar componentes. `@testing-library/react` haria los tests mas legibles, pero la skill no lo cubre y seria otra dependencia; React 19 ya exporta `act` para renderizar con `createRoot` | "Installing Environment Packages" |
| T1 | Nuevo `src/App.test.tsx` con `// @vitest-environment jsdom` y `fetch` simulado con `vi.stubGlobal`; test de **carga**: con un `fetch` que no resuelve, las dos secciones tienen `aria-busy="true"` (A10) | Protege A10 de la fase 2 | "Per-File Environment", `vi.stubGlobal` |
| T2 | En el mismo archivo, test de **error**: con `fetch` que devuelve 500, esperar con `vi.waitFor` a `role="alert"` con `lang="es"` (A5, A6), `aria-busy="false"`, `h1` + 4 `h2` de KPI + 2 `h2` de graficas (A4). Los `h2` de graficas solo aparecen si se resuelve la carga diferida, asi que tambien cubre R1 de la fase 3 | Protege A4-A6, A10 y R1. En estado de error las graficas muestran "No data available", sin `ResponsiveContainer`, que en jsdom necesitaria `ResizeObserver` | `vi.waitFor`, `vi.stubGlobal` |

Fuera de alcance de estos tests (siguen verificados manualmente en la fase 2): A1/A2 contraste y A9 linea discontinua (jsdom no calcula CSS ni layout), A3 `<title>` de las graficas (requiere el estado con datos y un stub de `ResizeObserver` para Recharts), A7 titulo de `index.html` y A8 `motion-safe` (CSS).

Archivos que se tocarian: `frontend/package.json` y `frontend/package-lock.json` (T0, mediante `npm i -D jsdom`), `frontend/src/App.test.tsx` (nuevo). Sin cambios en `vite.config.ts` ni en el codigo de la app.

**Decision del mantenedor (2026-11-17)**: T0, T1 y T2 aceptadas; instalacion de `jsdom` autorizada.

### 4.3 Implementacion

- T0: `npm --prefix frontend i -D jsdom` -> `jsdom@31.0.1` (una linea en `package.json`, `package-lock.json` actualizado por npm; regla DX punto 4). `npm audit` antes y despues (manifiestos restaurados con `git stash` para medir el "antes"): 21 vulnerabilidades en ambos casos (1 low, 12 moderate, 8 high), **ninguna nueva**; son preexistentes y siguen sin evaluar ([status.md](../../memory-bank/status.md)).
- T1 y T2: [App.test.tsx](../../frontend/src/App.test.tsx) con `// @vitest-environment jsdom`, `fetch` simulado con `vi.stubGlobal` (restaurado con `vi.unstubAllGlobals` en `afterEach`), render con `createRoot` y esperas con `vi.waitFor`. Sin `act` ni `IS_REACT_ACT_ENVIRONMENT`: `vi.waitFor` reintenta hasta que React aplica las actualizaciones, y la salida no muestra avisos.
- Docker: el contenedor del frontend usa un volumen anonimo para `node_modules`; `jsdom` solo hace falta para ejecutar los tests en el host. Ejecutarlos dentro del contenedor requeriria reconstruirlo (`docker compose up --build`). No se cambio el Dockerfile.

### 4.4 Verificacion

| Comando | Resultado |
| --- | --- |
| `npm --prefix frontend test -- src/App.test.tsx` | 2 passed; 0 avisos en la salida (`warning`, `not wrapped in act`, `Error:`) |
| `npm --prefix frontend test` | 2 archivos, **8 passed** (6 previos + 2 nuevos) |
| `npm --prefix frontend run lint` | exit 0 |
| `npm --prefix frontend run build` | exit 0, sin avisos; chunk principal 187.76 kB (igual que tras la fase 3); el test no entra en `dist` |
| `git diff --check` | limpio |

**Los tests detectan roturas**: se modifico `App.tsx` temporalmente con `sed`, se ejecuto el test y se restauro con `git checkout` (sin cambios en `App.tsx` al terminar; tests de nuevo en verde):

| Rotura | Protege | Resultado |
| --- | --- | --- |
| M1 quitar `role="alert"` | A5 | falla el test de error |
| M2 quitar `lang="es"` | A6 | falla el test de error |
| M3 quitar `aria-busy` de la seccion de KPI | A10 | fallan los 2 tests |
| M4 exportacion inexistente en el `lazy` de `IncomeOutcomeChart` | R1 | falla el test de error (la grafica cargada en diferido no aparece) |

Limite: M4 comprueba que las graficas cargadas en diferido llegan a renderizarse, no que esten en un chunk aparte; eso lo comprueba la salida del build.

## Fase 5: skill interna del proyecto

Fecha: 2026-11-17. Rama: `feature/agent-skills-fase5-internal-skill` (desde `feature/agent-skills` en `894c4eb`). Reglas leidas: WF, FE, DX.

### 5.1 Gap elegido

Candidatas presentadas al mantenedor, todas con evidencia de esta sesion:

| Candidata | Problema real que la motiva | Especificidad |
| --- | --- | --- |
| **Verificar un cambio del frontend en este entorno** | Fase 2: Vite en Docker servia modulos viejos (bind mount Windows/OneDrive) y una pasada de Lighthouse se descarto. Fase 3: un `vite preview` huerfano ocupaba el puerto 4173 y la primera tanda "despues" midio el bundle anterior. Fase 4: Lighthouse con la app caida dio `CHROME_INTERSTITIAL_ERROR` (puntuacion `null`); los tests nuevos se validaron rompiendo el codigo | Alta: conocimiento que solo se aprende en este repo y entorno |
| Flujo de ramas por fase y PRs | Ritual repetido en cada fase (rama de integracion, roadmap con hashes, merge commit); un paso 0 sin registrar el cierre anterior; token de `gh` caducado | Media: convencion generica, ya escrita en la seccion 3 del roadmap |
| Convenciones de UI del dashboard | — | Baja: cubierta en gran parte por la regla FE |

Decision del mantenedor: la primera ("checks de testing/QA antes del merge" en el enunciado).

### 5.2 Borrador

[.skills/verify-frontend-change/SKILL.md](../../.skills/verify-frontend-change/SKILL.md), 57 lineas: objetivo, inputs, 5 pasos (checks de comandos, confirmar el codigo servido, mediciones de produccion, demostrar que los tests detectan roturas, registrar), outputs, criterios de aceptacion y "no hacer". Cada paso cita el fallo real que lo motiva; solo usa comandos ejecutados en esta sesion. Pendiente de refinado del mantenedor.

### Pruebas de activacion (antes de la tarea real)

Pedidas por el mantenedor: comprobar que la skill se activa cuando debe y **no** cuando no debe, y mejorarla si falla.

Metodo: la skill se hizo visible a Claude Code con una junction local `.claude/skills/verify-frontend-change` -> `.skills/verify-frontend-change` (`.claude/` esta ignorado; `ln -s` fallo por permisos de Windows y se uso `New-Item -ItemType Junction`, como hace `npx skills`). Cada caso se ejecuto en una **sesion nueva e independiente**, sin el contexto de esta conversacion:

```bash
claude -p "<caso>" --output-format stream-json --verbose \
  --disallowedTools Bash Edit Write NotebookEdit PowerShell \
  --max-budget-usd 0.60 --no-session-persistence
```

Las herramientas que cambian o ejecutan cosas estaban bloqueadas: solo se observa si la sesion invoca `Skill(verify-frontend-change)` (detectado en el `stream-json`). En todas las sesiones la skill aparecia listada, asi que no activarla fue una decision del agente.

| Caso | Solicitud | Esperado | v1 | v2 |
| --- | --- | --- | --- | --- |
| P1 | "Acabo de cambiar el color del texto de los ejes en `.../income-outcome-chart.tsx`. Comprueba que el cambio funciona." | Activar | Activada | Activada |
| P2 | "Termine de anadir un tooltip a la tarjeta de KPI del dashboard. Puedes confirmar que no rompi nada?" | Activar | Activada | Activada |
| P3 | "Ya termine de anadir la meta description en `frontend/index.html`. Esta listo?" | Activar | — | Activada |
| N1 | "Explicame que hace `computeKPIs` en `frontend/src/lib/financial-utils.ts`." | No | No | No |
| N2 | "Acabo de cambiar `backend/app/routes.py`. Verifica que funciona." | No | No | No |
| N3 | "Que comando uso para hacer el build del frontend?" | No | No | No |
| N4 | "Actualice `frontend/specs/README.md` con una aclaracion. Revisa que este bien." | No | No | No |
| N5 | "Revisa si `.../kpi-card.tsx` sigue las convenciones del proyecto." | No | — | No |

Fallos de la v1 detectados leyendo las respuestas (no en la activacion):

1. Los casos P eran ficticios (no habia cambio en el codigo). P1 y P2 lo detectaron mirando `git status` y se negaron a dar un "todo pasa", pero **por iniciativa propia**: la skill no pedia confirmar que el cambio existe. Mejora v2: **paso 0** (`git diff --stat -- frontend/` y `git status --short frontend/`; si no aparece el cambio, decirlo y parar) y criterio de aceptacion correspondiente. En v2, P1-P3 aplicaron ese paso.
2. La descripcion v1 ("cualquier cambio en `frontend/`") incluia tecnicamente documentacion como `frontend/specs/README.md`. N4 acerto por criterio del agente, no por la skill. Mejora v2: la descripcion acota a codigo (`frontend/src`, `frontend/index.html`, configuracion) y dice cuando no usarla; nueva seccion "Cuando no usarla" con ejemplos (preguntas, documentacion bajo `frontend/`, backend).

Refinado previo del mantenedor (sobre el borrador): se quitaron las referencias a Windows/OneDrive (describian la maquina local, no el proyecto; la causa no se aislo) y el paso de reinicio paso a ser condicional ("si el modulo servido no contiene el cambio"); la descripcion dejo de decir "antes de commit o merge" (el disparador es terminar el cambio).

Limites: una sola pasada por caso (el modelo no es determinista); misma configuracion de modelo y plugins que el entorno del mantenedor; estas pruebas no ejecutan los pasos de la skill (herramientas bloqueadas). La ejecucion real es el hito 5.4.

### 5.3 Enrutado en AGENTS.md

[AGENTS.md](../../AGENTS.md) ahora lista `./.agents/skills` (comunitarias) y `./.skills` (del proyecto) y tiene una tabla "Skill routing" que apunta a `verify-frontend-change` con su disparador. Decision D2 resuelta: la skill vive en `.skills/` como pide el enunciado. Para que Claude Code la descubra en una maquina hace falta un enlace local `.claude/skills/verify-frontend-change` -> `.skills/verify-frontend-change` (`.claude/` esta ignorado por git); otros agentes la encuentran via `AGENTS.md`.

### 5.4 Tarea real: salto de 8 px en las tarjetas de grafica

Tarea: el gap de layout anotado en la fase 3 (tarjeta de grafica 414 px cargando, 422 px con datos). Se cargo la skill con `Skill(verify-frontend-change)` en esta sesion, con herramientas habilitadas, y se siguieron sus pasos.

**Causa (medida antes de editar, app en Docker, viewport 1280x900, script CDP `card-heights.mjs`):** el contenido mide 280 px en ambos estados; la diferencia esta en la cabecera (60 -> 68 px). `CardTitle` declara `leading-none`, pero las graficas le pasan `text-base` y `cn()` (tailwind-merge) descarta `leading-none`: el titulo queda con interlineado de 24 px. Skeleton: 20 + 8 (gap) + 4 (`mt-1`) + 12 = 44 px; texto: 24 + 8 + 20 = 52 px.

**Cambio:** en los tres skeletons de cabecera de grafica ([App.tsx](../../frontend/src/App.tsx) `ChartFallback`, [income-outcome-chart.tsx](../../frontend/src/components/dashboard/income-outcome-chart.tsx), [profit-percent-chart.tsx](../../frontend/src/components/dashboard/profit-percent-chart.tsx)) `h-5 w-52` -> `h-5 w-52 my-0.5` (caja de 24 px) y `h-3 w-64 mt-1` -> `h-3 w-64 my-1` (caja de 20 px). No cambia lo que se ve con datos.

| Paso de la skill | Resultado |
| --- | --- |
| 0 Cambio en el diff | `git diff --stat -- frontend/`: 3 archivos, 6+/6- |
| 1 Lint, tests, build | Lint OK; 8/8 tests; build sin avisos; chunk principal 187.76 -> 187.77 kB |
| 2 Codigo servido | **Trampa reproducida**: el archivo del contenedor tenia `my-0.5` pero `curl /src/App.tsx` (y las dos graficas) servia `h-5 w-52` / `mt-1`. `docker compose restart frontend` -> los tres modulos sirven el cambio |
| 2 Medicion en la app | Tarjeta de grafica: cargando 414 -> **422 px**, con datos 422 px; tambien el `fallback` de `Suspense` (modulos de grafica retenidos): 422 px |
| 3 Produccion | Build fuera del repo; preview sirve `index-BF9UIaRF.js` (el del build). Lighthouse rendimiento x3, ninguna con `runtimeError` |
| 3 Puerto 4173 | **Trampa reproducida**: tras `TaskStop` el puerto seguia en LISTEN (PID con `vite.js preview`); detenido por PID, puerto libre |
| 4 Tests nuevos | No aplica: el cambio no anade tests |

Lighthouse rendimiento (mismo metodo que la fase 3):

| Pasada | Puntuacion | FCP | LCP | TBT | CLS | Nodo desplazado |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 87 | 1.9 s | 2.7 s | 360 ms | 0.014 | tarjeta KPI PROFIT |
| 2 | 80 | 2.0 s | 2.9 s | 520 ms | 0 | - |
| 3 | 83 | 1.9 s | 2.8 s | 460 ms | 0 | - |

Hallazgo: releyendo los JSON de la fase 3 con el audit `layout-shifts`, las 4 pasadas con CLS 0.014 (1 antes y 3 despues de R1) desplazaban la **tarjeta KPI PROFIT**, nunca las de grafica. La atribucion de la fase 3 era incorrecta (corregida alli). Este cambio iguala la altura de las tarjetas de grafica, pero **no mejora el CLS medido por Lighthouse**: el 0.014 intermitente sigue y su causa (PROFIT) no se investigo en esta tarea. Las puntuaciones y TBT estan dentro del ruido entre pasadas.

Valoracion de la skill en la tarea real: dio una guia accionable y detecto dos trampas que habrian invalidado el resultado (Vite sirviendo el modulo viejo y el preview vivo). La regla "no presentar ruido como mejora" llevo a revisar que nodo se desplazaba en vez de dar el CLS por resuelto. No se ajusto la skill.

Limites: medicion de alturas a 1280x900 en Chromium headless; no se probaron otros anchos ni navegadores; el CLS de PROFIT queda sin causa.

## Fase 6: memory bank y cierre

Fecha: 2026-11-17. Rama: `feature/agent-skills-fase6-memory-bank` (desde `feature/agent-skills` en `1c25a99`). Reglas leidas: WF.

### 6.3 Verificacion final

Sobre `1c25a99` (rama de integracion con las fases 1-5; los cambios de la fase 6 son solo documentacion). La skill `verify-frontend-change` no se uso: verifica un cambio recien terminado y su paso 0 se detendria, porque no hay diff del frontend en el arbol de trabajo.

| Comando | Resultado |
| --- | --- |
| `npm --prefix frontend run lint` | exit 0 |
| `npm --prefix frontend test` | 2 archivos, 8 passed |
| `npm --prefix frontend run build` | exit 0, sin avisos; chunk principal 187.77 kB, `LineChart-*.js` 342.30 kB (igual que la linea base de [stack.md](../../memory-bank/stack.md)) |
| `uv run --no-project --python 3.13 --with-requirements backend/requirements.txt pytest backend/tests/test_routes.py -q` | 15 passed, 1 aviso: `StarletteDeprecationWarning` de httpx con `TestClient` (preexistente, ya listado en [status.md](../../memory-bank/status.md)) |

Alcance frente a `main` (`git diff --stat origin/main...HEAD`), para comprobar que no hubo reescritura:

| Area | Archivos | Lineas |
| --- | --- | --- |
| Codigo de la app (`frontend/src` sin tests, `index.html`) | 8 | 72 anadidas, 23 eliminadas en `src` + 1 linea en `index.html` |
| Tests (`App.test.tsx`) | 1 | 71 anadidas |
| Dependencias (`package.json`, `package-lock.json`) | 2 | `jsdom` (1 linea + 345 del lockfile, generadas por npm) |
| Skills comunitarias (`.agents/skills/`, `skills-lock.json`) | 100 | 13426 anadidas, contenido de terceros sin editar |
| Skill interna, `AGENTS.md`, roadmap y evidencia | 4 | documentacion |

El cambio mas grande en codigo es `App.tsx` (50 lineas: carga diferida, `ChartFallback`, `role="alert"`, `aria-busy`). El backend no se toco.
