# Registro de decisiones del traspaso

Fase 9 (prueba de traspaso, [ROADMAP-Project-3](../entregables/ROADMAP-Project-3.md#92-fase-9-prueba-de-traspaso)).
Fuente: [frontend/specs](../../frontend/specs/README.md). Q-01 a Q-21 salen de la spec v1.8
(etapa 1); su `Estado` se reviso contra la v1.9 (2026-11-19). Q-22 a Q-24 salen de la
v1.9 y su `Estado` se reviso contra la v1.10 (2026-11-19). La v1.10 no genera dudas nuevas. Q-25 en adelante salen de la implementacion (etapa 2). Cada entrada anota una pregunta, hueco o decision que la spec no resuelve:
seccion, duda, opciones y propuesta. **Ninguna entrada pendiente se aplica hasta que el
mantenedor responda.**

Valores de `Estado`:

- **resuelta por la spec v1.9** o **v1.10**: indica la seccion o el `DEC` que la cierra y si coincide con la propuesta.
- **sigue abierta**: la spec no la cierra; se explica por que y, si el mantenedor ya respondio, que respondio.
- **pendiente**: entrada nueva sin respuesta.

Planes: [F1](f1-plan.md), [F2](f2-plan.md), [F3](f3-plan.md).

## Preguntas que cambian el comportamiento

### Q-01. Volver a una ruta igual a la del ultimo resultado

- **Seccion:** [Capa de datos compartida](../../frontend/specs/components.md#capa-de-datos-compartida-v11-dec-05) y AC-F3-15.
- **Duda:** `useApiResource` dice que `loading` es true "mientras el ultimo resultado no corresponde a `path`". Al volver a `Dashboard` sin cambiar el filtro, la ruta es la misma del ultimo resultado, pero AC-F3-15 pide volver a pedir movimientos y alertas. No se dice si durante esa peticion se ven los `Skeleton` o los datos anteriores.
- **Opciones:**
  - (a) Se vuelve a pedir y, mientras llega, se ven los datos anteriores sin `Skeleton` (`loading=false`, lectura literal de la definicion).
  - (b) Se vuelve a pedir con `loading=true` y `Skeleton` hasta que llegue.
  - (c) No se vuelve a pedir si la ruta no cambio (contradice AC-F3-15).
- **Propuesta:** (a).
- **Estado:** resuelta por la spec v1.9: DEC-33, en la [Capa de datos compartida](../../frontend/specs/components.md#capa-de-datos-compartida-v11-dec-05) ("se pide de nuevo; mientras llega, loading es false y se ven los datos anteriores"). Coincide con (a).

### Q-02. La ruta pasa a `null` con una peticion en curso

- **Seccion:** Capa de datos compartida ("Solo cuenta la respuesta del `path` vigente") y regla unica de peticion.
- **Duda:** si el usuario escribe un filtro valido (sale la peticion) y enseguida uno invalido (ruta `null`), no se dice si la respuesta en curso se muestra.
- **Opciones:** (a) se descarta y queda el ultimo resultado anterior; (b) se acepta al llegar.
- **Propuesta:** (a): la ruta vigente es `null`, ninguna respuesta le corresponde. `loading` es false con ruta `null`.
- **Estado:** resuelta por la spec v1.9: DEC-33, en la Capa de datos compartida ("su respuesta se descarta; con path null, loading es false"). Coincide con (a).

### Q-03. Que vale `data` mientras se carga una ruta nueva

- **Seccion:** Capa de datos compartida; props de `AlertsTable` (`alerts` es null "si aun no hay resultado (primera carga o error)").
- **Duda:** al cambiar de ruta, `data` puede seguir siendo el resultado anterior o pasar a null.
- **Opciones:** (a) conserva el anterior hasta que llegue el nuevo; (b) null.
- **Propuesta:** (a), coherente con la prop de `AlertsTable`. Los componentes muestran `Skeleton` igualmente porque `loading` tiene precedencia (DEC-16).
- **Estado:** resuelta por la spec v1.9: DEC-33, en la Capa de datos compartida ("Mientras carga una ruta nueva, `data` conserva el ultimo resultado"). Coincide con (a).

### Q-04. Aviso `No movements found...` durante una recarga

- **Seccion:** F1, Comportamiento de la pagina, puntos 5 y 6.
- **Duda:** con Q-03 (a), si el ultimo resultado fue `[]` y se cambia el filtro, `data` sigue siendo `[]` mientras carga. No se dice si el aviso se mantiene durante la carga.
- **Opciones:** (a) se oculta mientras `loading`; (b) se mantiene hasta que llegue la respuesta.
- **Propuesta:** (a), igual que la precedencia `loading` > vacio de DEC-16.
- **Estado:** resuelta por la spec v1.9: DEC-33 y F1, Comportamiento de la pagina, punto 5 ("El aviso no se muestra mientras se cargan los movimientos"). Coincide con (a).

### Q-05. Umbral invalido y cambio de fechas a la vez

- **Seccion:** F2, AC-F2-04 frente a AC-F2-05 y Comportamiento de la pagina, punto 3.
- **Duda:** AC-F2-04 dice que con el texto del umbral invalido "no deberá pedir datos"; AC-F2-05 y el punto 3 dicen que un cambio de fechas vuelve a pedir "con el ultimo umbral aplicado". Si el texto es invalido y el usuario cambia una fecha, los dos criterios chocan.
- **Opciones:**
  - (a) Se piden las alertas con el umbral aplicado (la tabla sigue al filtro, como KPI y graficos; el aviso del umbral sigue visible).
  - (b) No se piden mientras el texto sea invalido; la tabla conserva el resultado del rango anterior.
- **Propuesta:** (a). La spec separa `appliedThreshold` del texto justamente para pedir con el ultimo valor valido (DEC-08 es el caso simetrico), y el estado vacio muestra el umbral aplicado.
- **Estado:** resuelta por la spec v1.9: DEC-34; AC-F2-04 y AC-F2-05 ajustados; F2, Comportamiento de la pagina, punto 3. Coincide con (a).

### Q-06. Vista comparativa abierta con un filtro no pedible que no es un rango invertido

- **Seccion:** F3, Datos y peticiones (DEC-14) y AC-F3-16, que solo nombran el rango invertido; regla unica de peticion (v1.4), que tambien bloquea ano a medio escribir y fecha fuera de `bounds`.
- **Duda:** si la vista se abre con una fecha fuera de rango o a medio escribir y sin resultado previo, no se dice que muestra.
- **Opciones:** (a) el mismo estado vacio de DEC-14 en paneles y grafico; (b) `Skeleton` hasta que el filtro se pueda pedir.
- **Propuesta:** (a): la spec dice que en F3 "rango invalido" es cualquier filtro que no cumple la regla.
- **Estado:** resuelta por la spec v1.9: DEC-35; AC-F3-16 ampliado; F3, [Datos y peticiones](../../frontend/specs/components.md#datos-y-peticiones). Coincide con (a). Queda una duda derivada, Q-23.

### Q-07. Como se ve el `$0` de la barra vacia

- **Seccion:** F3, AC-F3-10 y Grafico (`GroupComparisonChart`).
- **Duda:** una barra de valor 0 no tiene altura; la spec pide mostrarla "con total `$0`" pero no dice donde aparece ese texto.
- **Opciones:**
  - (a) Etiqueta con `formatCurrency` sobre cada barra (`LabelList`): el grupo vacio muestra `$0` y el otro su total.
  - (b) Solo en el tooltip (no se ve sin pasar el raton).
  - (c) Solo la marca `$0` del eje Y.
- **Propuesta:** (a). Limite: en jsdom `ResponsiveContainer` mide 0 px y no pinta barras, asi que AC-F3-09 y AC-F3-10 se comprueban con tests de los datos que recibe el grafico mas la prueba visual.
- **Estado:** resuelta por la spec v1.9: DEC-38; AC-F3-10 ajustado ("visible en su etiqueta"); F3, Grafico, "Etiquetas y descripcion". Coincide con (a). El limite de jsdom sigue: es de las pruebas, no de la spec, y el plan de F3 lo cubre con la prueba visual.

### Q-08. Fallback de `Suspense` de `ComparisonPage` sin cargar Recharts

- **Seccion:** F3, Navegacion entre vistas (DEC-23) y DEC-13.
- **Duda:** DEC-23 pide que el fallback muestre "los dos paneles y el grafico en su estado de carga, con el mismo marcado". Si el fallback importa `GroupComparisonChart`, Recharts vuelve al chunk principal y se pierde lo que busca DEC-13.
- **Opciones:** (a) el fallback usa `GroupTopTable` con `loading` (no usa Recharts) y el marcado de carga de graficos que ya existe en `App` (`ChartFallback`), que DEC-17 declara igual al de carga del grafico de F3; (b) importar `GroupComparisonChart` en `App`.
- **Propuesta:** (a). Se comprueba con la salida del build (chunk principal sin aviso de 500 kB).
- **Estado:** resuelta por la spec v1.9: DEC-36; F3, [Navegacion entre vistas](../../frontend/specs/components.md#navegacion-entre-vistas-v11-dec-12). Coincide con (a).

### Q-09. `aria-invalid` cuando hay dos problemas de fecha

- **Seccion:** F1, Renderizado condicional (un solo aviso, el del primer problema).
- **Duda:** con una fecha fuera de rango y ademas el rango invertido solo se muestra el aviso de fuera de rango; no se dice si `aria-invalid` va tambien en el otro input por el rango invertido.
- **Opciones:** (a) `aria-invalid` sigue al aviso mostrado (solo el input fuera de rango); (b) ambos inputs.
- **Propuesta:** (a): lo que anuncia el lector de pantalla coincide con el aviso.
- **Estado:** resuelta por la spec v1.9: DEC-37; F1, Renderizado condicional, fila "Cualquier error de validacion". Coincide con (a).

## Preguntas sobre el proceso

La spec v1.9 no trata estas tres: son de proceso, no de producto. Las respondio el mantenedor el 2026-11-19.

### Q-10. Tests existentes de `App.test.tsx`

- **Seccion:** DEC-19 ("`App.test.tsx` cuenta las `section` con `aria-busy`").
- **Duda:** los dos tests actuales comparan valores exactos (`["true", "true"]` y la lista de `h2`). F2 anade la `section` de alertas y el `h2` `Anomaly Alerts`, y F1 anade la peticion de `facets`. La spec no dice como adaptarlos.
- **Propuesta:** actualizar los valores esperados en la misma tarea que cambia la pagina (tres secciones, `h2` nuevo), sin relajar las comparaciones exactas. No es debilitar el test: la spec cambia la pagina.
- **Estado:** sigue abierta en la spec, que no habla de los tests existentes. **Respuesta del mantenedor:** si, se actualizan los valores esperados en la misma tarea que cambia la pagina, sin relajar las comparaciones.

### Q-11. Como cumplir el paso 4 de `verify-frontend-change`

- **Seccion:** [verify-frontend-change](../../.skills/verify-frontend-change/SKILL.md), paso 4: cada test nuevo debe fallar al menos una vez ante la rotura que protege.
- **Duda:** con unos 60 tests nuevos, una mutacion por test es mucho trabajo; no se dice si el paso rojo de TDD cuenta.
- **Opciones:** (a) paso rojo de TDD para cada test y mutacion explicita solo de los comportamientos clave (lista en cada plan); (b) mutacion explicita de cada test.
- **Propuesta:** (a), registrando cada mutacion y que test fallo.
- **Estado:** sigue abierta en la spec, que no trata el proceso de verificacion. **Respuesta del mantenedor:** opcion (a). Paso rojo de TDD en cada test y mutacion explicita de los comportamientos clave, registrando cada mutacion y que test fallo.

### Q-12. Donde se registra la evidencia de la etapa 2

- **Seccion:** regla WF (registrar comandos, resultados y limites); AGENTS.md envia a `05-rules-checks.md` solo los ejercicios de reglas.
- **Opciones:** (a) seccion `Registro de ejecucion` al final de cada plan de `docs/handover`; (b) un archivo nuevo `docs/handover/evidence.md`; (c) `docs/validations/`.
- **Propuesta:** (a).
- **Estado:** sigue abierta en la spec, que no trata donde se guarda la evidencia. **Respuesta del mantenedor:** opcion (a). Los tres planes ya tienen la seccion vacia.

## Huecos de presentacion

En la etapa 1 eran propuestas por defecto para la prueba visual. La v1.9 los cierra todos: Q-13 a Q-19 y Q-21 con DEC-40 y Q-20 con DEC-39. Donde la spec difiere de la propuesta, los planes siguen la spec.

| ID | Seccion | Hueco | Propuesta (etapa 1) | Estado (v1.9) |
| --- | --- | --- | --- | --- |
| Q-13 | F1, Comportamiento 5 | Estilo del aviso `No movements found...` | Texto `text-sm text-muted-foreground`, sin caja (no es un error) | Resuelta: DEC-40, [Presentacion de F1](../../frontend/specs/components.md#presentacion-v14-dec-27-dec-28). Igual a la propuesta |
| Q-14 | F1, Renderizado condicional | Tamano del `Skeleton` de la linea `Available data` | Una barra `h-5 w-64`, la altura de una linea `text-sm` | Resuelta: DEC-40, Presentacion de F1. **Difiere:** `h-4 w-64` |
| Q-15 | F2, Tabla; F3, Tablas | Estilo de las tablas | Cabecera `text-xs` en `muted-foreground`, columnas numericas alineadas a la derecha, separador `border-border/60` entre filas | Resuelta: DEC-40, [Presentacion de F2](../../frontend/specs/components.md#presentacion-de-f2-v16-dec-30) (fila `Tabla`) y [Presentacion de F3](../../frontend/specs/components.md#presentacion-de-f3-v19-dec-40). **Anade** a la propuesta: cuerpo `text-sm`, cabecera en mayusculas y `font-medium`, borde superior en cada fila y celdas `py-2` |
| Q-16 | F2, Renderizado condicional | Filas de `Skeleton` de `AlertsTable` | 3 filas `tr`, cada una con 4 celdas con una barra `h-4` | Resuelta: DEC-40, Presentacion de F2 (fila `Carga`). **Difiere:** cada `tr` tiene una sola celda que ocupa las 4 columnas, con una barra `h-5` a todo el ancho. Tambien fija el vacio: una celda que ocupa las 4 columnas, con los textos centrados |
| Q-17 | F3, `ViewTabs` | Aspecto de las pestanas | Botones `text-sm` de 44 px de alto; activa en `foreground` con borde inferior `primary`, inactiva en `muted-foreground`; anillo de foco `ring` | Resuelta: DEC-40, Presentacion de F3. **Difiere:** `px-4 py-2`, sin alto de 44 px, `font-medium`, borde inferior de 2 px (transparente en la inactiva, que pasa a `foreground` al pasar el raton) y barra con borde inferior `border-border` |
| Q-18 | F3, Disposicion | Dos columnas en pantallas estrechas | `grid-cols-1` y dos columnas desde `lg`, como los graficos existentes (`xl`) | Resuelta: DEC-40, Presentacion de F3. **Difiere:** dos columnas desde `xl` (1280 px), decidido por el mantenedor |
| Q-19 | F3, `GroupTopTable` | Que se ve en vacio y en error | Titulo y descripcion siempre visibles; el mensaje sustituye a la tabla | Resuelta: DEC-40, Presentacion de F3. Igual a la propuesta; **anade** que en la carga tampoco se pinta tabla (3 barras `Skeleton` `h-5` a todo el ancho) |
| Q-20 | F3, Grafico | Descripcion visible, alto, leyenda y tooltip | `CardDescription` con el mismo texto que `desc`; 280 px de alto como los graficos actuales; sin leyenda (una sola serie); tooltip propio con el estilo de los existentes y `formatCurrency` | Resuelta: DEC-39, F3, Grafico, "Etiquetas y descripcion". Igual a la propuesta, decidido por el mantenedor |
| Q-21 | F2, `ThresholdInput` | Valores validos para `parseThreshold` pero fuera de `step=0.01` (`0.015`) | Se aceptan: la spec define la validez con `parseThreshold`, no con el `step` del navegador | Resuelta: DEC-40, F2, [`ThresholdInput`](../../frontend/specs/components.md#thresholdinput) ("`0.015` es valido y se pide con ese valor"). Igual a la propuesta |

## Dudas de la spec v1.9

Las tres las cierra la v1.10 (DEC-41 a DEC-43). Al releer la v1.10 no aparecio ninguna duda nueva de la spec; Q-25 a Q-27 salen de la implementacion (etapa 2).

### Q-22. Volver a la misma ruta cuando el ultimo resultado fue un error

- **Seccion:** Capa de datos compartida, DEC-33 ("se pide de nuevo; mientras llega, loading es false y se ven los datos anteriores").
- **Duda:** DEC-33 habla de "datos anteriores". Si el ultimo resultado de esa ruta fue un error (`data` null, `error` true), no se dice que se ve mientras llega la nueva peticion. Caso: falla la peticion de alertas, el usuario va a `B2B vs B2C` y vuelve a `Dashboard` sin cambiar el filtro.
- **Opciones:**
  - (a) Se sigue viendo el error hasta que llega la respuesta: el ultimo resultado se muestra tal cual, sea dato o error.
  - (b) Se oculta el error y se muestra la carga (`loading=true` solo en este caso).
- **Propuesta:** (a). Es la lectura literal (el hook expone el ultimo resultado y `loading` es false con la misma ruta) y no anade casos al hook. Se prueba en el test del hook `refetches when the same path comes back after null`, con una variante con error.
- **Estado:** resuelta por la spec v1.10: DEC-41, en la [Capa de datos compartida](../../frontend/specs/components.md#capa-de-datos-compartida-v11-dec-05) ("se ve el ultimo resultado: los datos anteriores o, si la ultima peticion fallo, el error"). Coincide con (a).

### Q-23. "Sin resultado previo" en la vista comparativa tras cambiar de pestana

- **Seccion:** F3, Datos y peticiones (DEC-14, DEC-35), AC-F3-05 y AC-F3-16; F1, "al cambiar de pestana se desmonta la vista pero el filtro se conserva".
- **Duda:** `ComparisonPage` pide sus datos y se desmonta al volver a `Dashboard`, asi que pierde su ultimo resultado. Caso: el usuario abre `B2B vs B2C` con un filtro valido y ve datos; vuelve a `Dashboard`, invierte el rango y abre otra vez `B2B vs B2C`. No se dice si cuenta como "sin resultado previo" (estado vacio, DEC-35) o si debe ver los datos de la visita anterior (AC-F3-05, "conservar el ultimo resultado mostrado").
- **Opciones:**
  - (a) El resultado previo es el de la vista montada: al volver con un filtro no pedible se ven los estados vacios de DEC-35.
  - (b) Conservar los resultados de F3 entre visitas, subiendo sus dos `useApiResource` a `App` o guardando el ultimo resultado en `App`.
- **Propuesta:** (a). La spec dice que la vista se desmonta al cambiar de pestana y que `ComparisonPage` pide sus propios datos; (b) anade estado en `App` que la spec no pide. Contrapartida: el dashboard si conserva sus datos en ese caso, porque sus hooks viven en `App`. Test en la Tarea 5 de F3: `shows empty states when it reopens with an invalid filter`.
- **Estado:** resuelta por la spec v1.10: DEC-42, en F3, [Datos y peticiones](../../frontend/specs/components.md#datos-y-peticiones) ("'Sin resultado previo' cuenta desde que se abre la vista"). Coincide con (a), incluida la diferencia con el dashboard, que la spec tambien recoge.

### Q-24. Aspecto del estado vacio del grafico de F3

- **Seccion:** F3, [Presentacion de F3](../../frontend/specs/components.md#presentacion-de-f3-v19-dec-40) y Grafico (AC-F3-11).
- **Duda:** DEC-40 fija el error del grafico ("centrado en el area de 280 px") pero no el vacio `No income to compare in the selected range.` Tampoco dice si el titulo y la descripcion se ven en el vacio y en el error.
- **Opciones:**
  - (a) Como el vacio de los graficos existentes: titulo y descripcion visibles y el texto `text-sm` en `muted-foreground`, centrado en un area de 280 px (`flex h-[280px] items-center justify-center`). El error usa la misma area con el aviso rojo dentro.
  - (b) Solo el mensaje, sin titulo ni descripcion.
- **Propuesta:** (a). AC-F3-11 dice "en lugar de las barras", es decir, dentro de la tarjeta, y asi no hay salto de altura.
- **Estado:** resuelta por la spec v1.10: DEC-43, en la [Presentacion de F3](../../frontend/specs/components.md#presentacion-de-f3-v19-dec-40) (fila `Vacio del grafico`). Coincide con (a). Para el error, DEC-43 no nombra el titulo, pero la fila `Errores` ya lo centra "en el area de 280 px", que es el area del grafico bajo la cabecera (DEC-39). Leo que en el error el titulo y la descripcion tambien se ven. No abro una entrada nueva porque la spec lo implica; si no es asi, el test `shows the comparison error` de la Tarea 4 de F3 es el que cambia. **Confirmado por el mantenedor (2026-11-19):** con error, el grafico muestra titulo y descripcion y el aviso va centrado en el area de 280 px.

## Dudas de la implementacion (etapa 2)

### Q-25. Tests de F1 que dejan de pasar al anadir las alertas

- **Seccion:** [F2, Tarea 3](f2-plan.md#tarea-3-integracion-en-app) y Q-10. Q-10 solo autoriza cambiar los valores esperados de los dos tests de `App loading and error states`; el plan no menciona los tests de `F1 date range filter`.
- **Duda:** con `App` pidiendo alertas, 10 de los 11 tests de F1 fallan sin que haya un defecto (evidencia en el [Registro de ejecucion de F2](f2-plan.md#tarea-3-2026-11-20)):
  - 7 comprueban `requested.at(-1)` tras cambiar fechas, y ahora la ultima URL es la de alertas (`/api/metrics/alerts?threshold=0.3&start_date=...`), que la spec exige pedir tambien (AC-F2-05). El test de montaje compara la lista exacta de URLs, que pasa de 2 a 3 (AC-F2-02).
  - 3 comparan la lista exacta de `role="alert"`. Sus rutas de `routeFetch` no incluyen `/api/metrics/alerts`, el stub devuelve 404 y aparece `Could not load anomaly alerts.` (AC-F2-11).
- **Opciones:**
  - (a) Cambiar solo el montaje de los tests de F1, sin tocar ningun valor esperado: (1) anadir `/api/metrics/alerts` a sus rutas con el fixture de alertas, asi no aparece el error; (2) comprobar la ultima URL de movimientos (`/api/metrics` sin `/alerts`) en lugar de la ultima URL de cualquier ruta, y en el test de montaje excluir las URL de alertas de la lista exacta. Las comparaciones siguen siendo exactas.
  - (b) Lo mismo que (a), pero el test de montaje compara la lista completa con la URL de alertas incluida (`["/api/metrics", "/api/metrics/alerts?threshold=0.3", "/api/metrics/facets"]`). Mezcla F2 en un test de F1, pero no filtra nada.
  - (c) Mantener la ruta de alertas con 404 en los tests de F1 y buscar los avisos solo dentro del grupo `Date range`. Oculta cualquier `role="alert"` inesperado fuera del picker; no la recomiendo.
- **Propuesta:** (a). Los tests de F1 siguen comprobando lo mismo (URL de movimientos, avisos exactos) y la peticion de alertas la cubren los tests de F2.
- **Estado:** sigue abierta en la spec, que no habla de los tests existentes. **Respuesta del mantenedor (2026-11-20):** opcion (a).

### Q-26. Test inestable por la carga diferida de los graficos

- **Seccion:** [F2, Tarea 4](f2-plan.md#tarea-4-verificacion-2026-11-20), regla WF (no debilitar asserts) y DEC-19. El test es anterior a F2 y el plan no lo trata.
- **Duda:** `announces a load error in Spanish and keeps the heading structure` falla a veces con `expected [ 'Total Income', …(5) ] to include 'Income vs. Outcome'`. Los graficos son `lazy()` y su chunk de Recharts tarda en cargarse; el primer `vi.waitFor` del test tiene el limite por defecto de 1000 ms y el test dura entre 580 y 1300 ms. Con el codigo de F1 fallo 4 de 8 veces: ya existia antes de F2.
- **Opciones:**
  - (a) Dar a ese `vi.waitFor` un limite mayor (`{ timeout: 3000 }`, por debajo de los 5000 ms del test). No cambia ningun valor esperado.
  - (b) Cargar los dos modulos de graficos en un `beforeAll` de `App.test.tsx` (`await import(...)`), para que `lazy()` los encuentre ya cargados. Tampoco cambia los asserts, pero el test deja de pasar por el `Suspense`.
  - (c) No tocarlo en F2 y dejarlo anotado como defecto conocido.
- **Propuesta:** (a). Es el cambio mas pequeno, ataca la causa (el limite de espera de un chunk diferido) y no cambia lo que comprueba el test.
- **Estado:** sigue abierta en la spec, que no trata los tests existentes. **Respuesta del mantenedor (2026-11-20):** opcion (a).

### Q-27. Como comprobar la mutacion 5 sin el aviso de 500 kB

- **Seccion:** [F3, Tarea 6](f3-plan.md#tarea-6-verificacion-2026-11-20), mutacion 5 ("el build vuelve a avisar del chunk"), y DEC-13 ("importarlo directamente lo devuelve al chunk principal y reaparece el aviso de chunk > 500 kB").
- **Duda:** con la rotura (importar `GroupComparisonChart` en `App` sin `lazy`), el build no avisa. Vite 8.0.8 deja Recharts en un chunk compartido (`CartesianChart-*.js`, 372 kB) que el principal importa estaticamente y `index.html` precarga; ningun chunk pasa de 500 kB. La rotura existe (Recharts se descarga al abrir la pagina), pero el criterio del plan no la detecta.
- **Opciones:**
  - (a) Cambiar el criterio de la mutacion 5 a "el chunk principal importa estaticamente el chunk de Recharts y `index.html` lo precarga". Se comprueba con `grep` sobre el build, sin cambiar codigo ni configuracion. En el build limpio no ocurre (solo `skeleton-*.js` y `use-api-resource-*.js`).
  - (b) Anadir un test que lo compruebe automaticamente (por ejemplo, que `App.tsx` no importe `group-comparison-chart` ni `recharts`). Anade un test que la spec no pide.
  - (c) Dar la mutacion 5 por no verificable con el criterio del plan y dejarlo anotado.
- **Propuesta:** (a). Mide la consecuencia que DEC-13 quiere evitar (Recharts en la carga inicial) con el mismo build, y el resultado de la mutacion ya esta en el Registro de ejecucion de F3.
- **Estado:** sigue abierta en la spec, que no trata el criterio de esa mutacion. **Respuesta del mantenedor (2026-11-20):** opcion (a).

## Observaciones (no requieren respuesta)

- Los enlaces de la spec a `docs/plans` siguen rotos a proposito en la v1.9 (el README y la ultima restriccion negativa de components.md). Los planes de esta fase estan en `docs/handover`.
- `memory-bank/status.md` y `overview.md` describen la spec 1.0 sin implementar. El mantenedor confirmo que en esta rama se espera que esten desactualizados: no se modifican.
- Cerrada en la v1.9: el [mapa de archivos del README](../../frontend/specs/README.md#mapa-de-archivos) ya incluia la ultima version; en la v1.10 dice "v1.1 a v1.10".
- Recharts 3.8.1 (instalado) marca `Cell` como obsoleto; el color por barra de F3 se hace con la prop `shape` de `Bar`. Es un detalle de implementacion, no una decision de la spec.
- `React.StrictMode` (en `main.tsx`) duplica en desarrollo las peticiones del montaje; al revisar los logs del backend en la prueba visual hay que tenerlo en cuenta.
- La diferencia entre la v1.8 y la v1.9, y entre la v1.9 y la v1.10, se saco leyendo la spec actual (historial de versiones, DEC-33 a DEC-40 y marcas `v1.9` en el texto), no del diff del commit, porque las reglas de la etapa prohiben consultar el historial de git.
