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
