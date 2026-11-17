---
name: verify-frontend-change
description: Verificar un cambio de codigo del frontend de este repo (frontend/src, frontend/index.html o su configuracion) evitando sus trampas conocidas (Vite en Docker que sigue sirviendo modulos viejos, vite preview que queda vivo, Lighthouse sin pagina cargada, tests que no fallan). Usar al terminar ese cambio, antes de afirmar que "funciona" o "mejora". No usar para preguntas, documentacion (frontend/specs, *.md) ni cambios del backend.
---

# Verificar un cambio del frontend

## Objetivo

Que toda afirmacion sobre un cambio del frontend ("funciona", "no rompe nada", "mejora X") se base en una medicion hecha **sobre el codigo nuevo**, comparada con la linea base y con el mismo metodo. En este repo hubo resultados falsos por medir codigo viejo; esta skill lo evita.

## Inputs

- El diff a verificar (`git diff`) y que debe demostrar (comportamiento, accesibilidad, rendimiento).
- La linea base vigente: ultima seccion de [07-agent-skills-checks.md](../../docs/validations/07-agent-skills-checks.md) y [stack.md](../../memory-bank/stack.md).
- Si el cambio anade o modifica tests: que comportamiento protege cada uno.

## Cuando no usarla

- Preguntas o explicaciones sobre el frontend sin cambio ("que hace `computeKPIs`?", "que comando hace el build?").
- Cambios solo de documentacion, aunque esten bajo `frontend/` (p. ej. `frontend/specs/*.md`): se revisan como texto.
- Cambios del backend (`backend/`): sus checks son otros (pytest, ver [stack.md](../../memory-bank/stack.md)).

## Pasos

0. **Confirmar que hay un cambio que verificar**: `git diff --stat -- frontend/` (y `git status --short frontend/` para archivos nuevos). Si no aparece el cambio descrito, decirlo y parar: ejecutar los checks sobre el ultimo commit daria un "todo pasa" que no dice nada del cambio.
1. **Checks de comandos** (desde la raiz):
   `npm --prefix frontend run lint`, `npm --prefix frontend test`, `npm --prefix frontend run build`.
   Comparar la salida del build con la linea base: cualquier aviso nuevo se corrige o se justifica.
2. **App en ejecucion: confirmar que sirve el codigo nuevo.** Vite corre en Docker con el codigo montado como volumen, y puede seguir sirviendo la version anterior de un modulo aunque el contenedor ya tenga el archivo nuevo (observado en este repo).
   - `docker compose ps`: si no responde, Docker no esta en marcha; arrancarlo o declarar el check como bloqueado.
   - Antes de mirar la app, comprobar el modulo servido: `curl -s http://localhost:5173/src/<archivo> | grep "<algo del cambio>"`.
   - Si no aparece el cambio: `docker compose restart frontend` y repetir la comprobacion.
3. **Mediciones de produccion (Lighthouse de rendimiento o SEO).**
   - Build fuera del repo: `VITE_API_BASE_URL=http://localhost:8000 npx vite build --outDir <tmp>` (desde `frontend/`).
   - Servir: `npx vite preview --outDir <tmp> --port 4173 --strictPort`.
   - Antes de medir: el JS servido debe ser el del build recien hecho: `curl -s http://localhost:4173 | grep -o 'assets/index-[^"]*\.js'`.
   - Lighthouse: `npx -y lighthouse@12 <url> --only-categories=<cat> --output=json --output-path=<tmp>/x.json --chrome-flags="--headless=new"`, 3 pasadas para rendimiento.
   - Descartar la pasada si el JSON tiene `runtimeError` (p. ej. `CHROME_INTERSTITIAL_ERROR` con la app caida): una puntuacion `null` no es un 0.
   - Al terminar: parar el preview **y** comprobar que el puerto quedo libre (`netstat -ano | grep ":4173 " | grep LISTEN`). Detener la tarea en segundo plano no mata el proceso `node` hijo; terminarlo por PID.
4. **Tests nuevos: demostrar que detectan la rotura.** Por cada comportamiento protegido, romperlo temporalmente en el codigo (p. ej. quitar `role="alert"`), ejecutar el test, ver que falla y restaurar con `git checkout -- <archivo>`. Confirmar al final que el archivo no tiene diff.
5. **Registrar** en el archivo de evidencia de la fase: comandos exactos, resultados antes/despues, pasadas descartadas y su causa, y lo que no se pudo verificar.

## Outputs

- Tabla antes/despues con el mismo metodo (build, tests, Lighthouse u otra medicion que corresponda).
- Lista de pasadas descartadas con su causa (si las hubo).
- Para tests nuevos: tabla rotura provocada -> test que falla.
- Limites explicitos (lector de pantalla real, zoom, navegadores no probados, etc.).

## Criterios de aceptacion

- [ ] El cambio a verificar aparece en `git diff`/`git status` antes de ejecutar ningun check.
- [ ] Lint, tests y build ejecutados; el build no tiene avisos nuevos sin justificar.
- [ ] Toda observacion en la app se hizo tras confirmar que Vite servia el codigo nuevo.
- [ ] Toda medicion de produccion se hizo tras confirmar el nombre del JS servido; ninguna pasada con `runtimeError` cuenta como resultado.
- [ ] El puerto 4173 quedo libre al terminar.
- [ ] Cada test nuevo fallo al menos una vez ante la rotura que protege, y el codigo quedo restaurado.
- [ ] La evidencia distingue lo ejecutado, lo descartado y lo no verificado.

## No hacer

- No cambiar `vite.config.ts`, el Dockerfile ni la configuracion de Compose para que un check pase (regla [DX](../../.agents/rules/06-runtime-configuration.md)).
- No debilitar asserts ni cambiar fixtures para ocultar un fallo (regla [WF](../../.agents/rules/01-workflow-evidence.md)).
- No presentar una mejora que este dentro del ruido entre pasadas como mejora.
