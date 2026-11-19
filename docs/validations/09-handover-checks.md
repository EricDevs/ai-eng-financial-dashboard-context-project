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

### Ronda 1, etapa 1: planes desde la spec v1.8

El agente entrego en `be5d451` (rama de traspaso, sin push) tres planes (`docs/handover/f1-plan.md`, `f2-plan.md` y `f3-plan.md`, con 5, 4 y 6 tareas) y `docs/handover/decisions.md` con 21 entradas (Q-01 a Q-21), todas pendientes de respuesta. No toco codigo. Su linea base: 8 tests pasan y lint sin errores; el test de graficos diferidos que fallo en F1 no fallo esta vez, porque depende del tiempo de carga.

Contraste de cada entrada con la spec v1.8 y con la iteracion 1:

| Entradas | Que eran | Resultado |
| --- | --- | --- |
| Q-01 a Q-04 | Casos limite de `useApiResource` y del aviso de rango vacio | Hueco real. La iteracion 1 los resolvio sin anotarlos y las propuestas del agente coinciden con ella. DEC-33 |
| Q-05 | AC-F2-04 y AC-F2-05 se contradicen con un texto de umbral invalido y un cambio de fechas | Contradiccion real de la spec; la iteracion 1 hace la propuesta (a). DEC-34 |
| Q-06 | DEC-14 y AC-F3-16 solo nombran el rango invertido | Texto incoherente con la regla unica de la 1.4. DEC-35 |
| Q-08, Q-09 | Fallback de `Suspense` y `aria-invalid` con dos problemas | Deducibles de DEC-17 y de la tabla de F1; el agente los dedujo bien. Se escriben de forma explicita: DEC-36 y DEC-37 |
| Q-07, Q-20 | `$0` de la barra vacia y descripcion del grafico | Hueco real. La iteracion 1 solo mostraba el `$0` en el tooltip, y su marcado de carga tenia una linea de descripcion que el grafico no tenia, lo que provocaba un salto de altura. El usuario eligio las propuestas del agente: DEC-38 y DEC-39 |
| Q-13 a Q-19, Q-21 | Detalles de presentacion | La iteracion 1 los resolvio sin anotarlos. Se copian sus valores aprobados; columnas desde `xl` por decision del usuario (el agente proponia `lg`). DEC-40 |
| Q-10 a Q-12 | Proceso: tests existentes de `App`, mutaciones y registro de evidencia | No son huecos de la spec; se responden en el chat del agente |

Otros hallazgos del agente:

- `Cell`, que la iteracion 1 usaba para colorear las barras de F3, esta obsoleto en Recharts 3.8.1. Comprobado en `node_modules/recharts/types/component/Cell.d.ts` (`@deprecated`, "will be removed in Recharts 4.0").
- El README de la spec decia "DEC-xx, v1.1 a v1.3".

Conclusion de la etapa: la spec v1.8 no bastaba. La mayoria de los huecos son decisiones que la iteracion 1 tomo con todo el contexto y no paso a la spec; la prueba sin contexto los hizo visibles.

### Correcciones (rama `feature/frontend-specs-v2-fase9-evidence`)

| Commit | Contenido |
| --- | --- |
| `02cd62d` | Spec v1.9: DEC-33 a DEC-40, AC-F2-04, AC-F2-05, AC-F3-10 y AC-F3-16 ajustados, seccion "Presentacion de F3", README |
| `197275c` | Planes F1 v8.1, F2 v5.5 y F3 v5.4 |
| `46b2afd` | Grafico de F3: importe sobre cada barra con `LabelList`, descripcion visible y color con `shape` en lugar de `Cell` |
| `4a7571d` | Tests de los comportamientos que la v1.9 fija y el codigo ya tenia |

| Comando (desde la raiz) | Resultado |
| --- | --- |
| `npm --prefix frontend test` | 11 archivos, 115 passed (antes 110) |
| `npm --prefix frontend run lint` | Sin errores ni avisos |
| `npm --prefix frontend run build` | Sin avisos; chunk principal 193.74 kB, `comparison-page` 20.10 kB |

| Rotura provocada | Test que falla |
| --- | --- |
| Hook sin la guarda `ignore` | `shows only the response for the latest path` y `discards a pending response when path becomes null` |
| Hook con `data` a null mientras carga | `keeps the last data while a new path loads` |
| Hook que no vuelve a pedir la ruta del ultimo resultado | `does not stay loading when returning to the last loaded path` |
| `App` sin pedir alertas con texto de umbral invalido | `refetches alerts with the applied threshold when dates change and the text is invalid` |
| Aviso de rango vacio sin la condicion de carga | `hides the empty-range notice while reloading` |
| `aria-invalid` en los dos inputs con fecha fuera de rango | `flags a date outside the available range` y `shows one notice at a time, out of range first` |

Fallo de un test durante la correccion: al anadir al test de "volver a la ultima ruta" la comprobacion de 2 peticiones, solo hubo 1. Con una copia temporal del test que esperaba 50 ms entre renders salieron 2, asi que el hook era correcto: un `setTimeout` de 0 ms no dejaba a React confirmar el render con ruta `null`, y el test original pasaba sin ejercitar ese paso. Ahora el test espera a que React confirme cada ruta (atributo `data-path` de `Probe`); paso 3 de 3 veces.

Prueba visual del usuario (2026-11-19, tras `docker compose restart frontend` y comprobar con `curl` que Vite servia `LabelList`): importe sobre cada barra, `$0` del grupo vacio y descripcion visible. Aprobada sin hallazgos.

### Ronda 1, etapa 1 repetida con la spec v1.9

Mensaje al agente: releer la spec v1.9, marcar cada entrada como resuelta o abierta, anadir dudas nuevas, actualizar los planes y responder a Q-10 a Q-12 (Q-10: actualizar los valores de los tests existentes sin relajarlos; Q-11: paso rojo de TDD y mutaciones de los comportamientos clave; Q-12: seccion "Registro de ejecucion" en cada plan; no tocar memory-bank).

Resultado en `a4cc8bf` (sin push ni codigo):

- Intento ver el diff de `0102f10` y el entorno lo bloqueo por la prohibicion de consultar el historial; releyo la spec y lo anoto en `decisions.md`.
- Q-01 a Q-09 y Q-13 a Q-21: resueltas por la v1.9. En Q-14 a Q-18 la spec no coincidia con su propuesta y los planes siguen la spec. Q-10 a Q-12: abiertas en la spec por ser de proceso, con las respuestas anotadas.
- Tres dudas nuevas:

| Entrada | Duda | Contraste | Resultado |
| --- | --- | --- | --- |
| Q-22 | Al volver a una ruta cuyo ultimo resultado fue un error, DEC-33 dice "los datos anteriores", que no existen | La iteracion 1 sigue mostrando el error mientras vuelve a pedir, que es la propuesta del agente | DEC-41 |
| Q-23 | Alcance de "sin resultado previo" al reabrir la vista comparativa, que se desmonta | La iteracion 1 muestra los estados vacios, que es la propuesta del agente | DEC-42 |
| Q-24 | Aspecto del vacio del grafico de F3 | La iteracion 1 usa el de los graficos existentes, que es la propuesta del agente | DEC-43 |

Correcciones, sin cambios de comportamiento ni prueba visual:

| Commit | Contenido |
| --- | --- |
| `670fe6c` | Spec v1.10: DEC-41 a DEC-43 |
| `4be8574` | Planes F1 v8.2 y F3 v5.5 |
| `3ecc51e` | Tests de DEC-41 (hook) y DEC-42 (`App`) |

| Comando o rotura | Resultado |
| --- | --- |
| `npm --prefix frontend test` | 11 archivos, 117 passed |
| `npm --prefix frontend run lint` y `run build` | Sin errores ni avisos; chunk principal 193.74 kB |
| Hook en carga al volver a una ruta con error | Fallan `sets error and drops data on a failed request` y `shows the last error when returning to a failed path` |
| `ComparisonPage` montada y oculta en lugar de desmontada | Falla `shows empty states when reopening the comparison with a filter that cannot be requested` |

El nuevo test de `App` paso 3 de 3 veces.

### Ronda 1, etapa 1 con la spec v1.10

Pendiente.
