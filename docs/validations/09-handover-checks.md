# 09 - Prueba de traspaso de las specs F1-F3

Comprueba que la spec de [frontend/specs](../../frontend/specs/README.md) (v1.8) basta para que un agente sin contexto planifique e implemente F1, F2 y F3 sin tomar decisiones propias. Protocolo en [ROADMAP-Project-3, seccion 9.2](../entregables/ROADMAP-Project-3.md#92-fase-9-prueba-de-traspaso).

## Preparacion

Fecha: 2026-11-19.

| Paso | Resultado |
| --- | --- |
| Rama `feature/frontend-specs-v2-fase9-handover` desde `87be002` (merge de la fase 5) | Codigo anterior a F1: sin `api.ts`, `useApiResource` ni componentes de F1-F3 |
| `4b642a5`: `git checkout feature/frontend-specs-v2 -- frontend/specs` | `git diff --stat feature/frontend-specs-v2 -- frontend/specs` vacio: spec identica a la v1.8 |
| `c625ae3`: `git rm -r docs/plans` | Sin planes en el arbol. Los enlaces de la spec a `docs/plans` quedan rotos a proposito |

Limites de la preparacion: el agente podria leer otras ramas, el historial de git o GitHub; el prompt lo prohibe, pero no se puede impedir. La linea base de `87be002` tiene un test que falla en esta maquina (graficos diferidos de mas de 1 s, ver F1 en [08-features-checks.md](08-features-checks.md)); no se corrige antes para no dar pistas.

## Prompt del chat nuevo

Se pega tal cual en un chat nuevo, abierto en la raiz del repositorio con la rama de traspaso activa:

```text
Trabajas en la rama feature/frontend-specs-v2-fase9-handover. Es una prueba de traspaso: comprobar que la spec de frontend/specs basta para implementar las funcionalidades F1, F2 y F3 sin que tomes decisiones propias.

Fuentes permitidas: AGENTS.md y lo que enruta (.agents/rules, .agents/skills, .skills, memory-bank), frontend/specs y el codigo y la documentacion del arbol actual. No consultes otras ramas, el historial de git de otros commits, el remoto ni GitHub. La carpeta docs/plans no existe a proposito: los enlaces de la spec a ella estan rotos adrede.

Etapa 1 (ahora): lee la spec y genera un plan por funcionalidad, con sus tareas y sus validaciones o pruebas, en docs/handover/f1-plan.md, docs/handover/f2-plan.md y docs/handover/f3-plan.md. Crea tambien docs/handover/decisions.md. En ese registro anota cada pregunta, hueco o decision que la spec no resuelva: seccion de la spec, la duda y que opciones ves. No implementes nada. Al terminar, para y espera mi revision.

Etapa 2 (cuando yo apruebe los planes): implementa F1, F2 y F3 en ese orden siguiendo tus planes. Al terminar cada funcionalidad ejecuta tests, lint y build, y para para que yo haga la prueba visual en http://localhost:5173. Sigue anotando en decisions.md toda decision que la spec no resuelva.

Si algo no esta en la spec, no lo decidas en silencio: anotalo y preguntame. Puedes hacer commits en esta rama; no hagas push, PR ni merge.
```

## Resultados

Pendiente de la ejecucion.
