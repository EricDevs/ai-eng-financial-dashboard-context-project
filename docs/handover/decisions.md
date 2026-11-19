# Registro de decisiones del traspaso

Fase 9 (prueba de traspaso, [ROADMAP-Project-3](../entregables/ROADMAP-Project-3.md#92-fase-9-prueba-de-traspaso)).
Fuente: spec v1.8 en [frontend/specs](../../frontend/specs/README.md). Cada entrada anota
una pregunta, hueco o decision que la spec no resuelve: seccion, duda, opciones y
propuesta. **Ninguna se aplica hasta que el mantenedor responda**; la columna
`Estado` recoge la respuesta.

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
- **Estado:** pendiente.

### Q-02. La ruta pasa a `null` con una peticion en curso

- **Seccion:** Capa de datos compartida ("Solo cuenta la respuesta del `path` vigente") y regla unica de peticion.
- **Duda:** si el usuario escribe un filtro valido (sale la peticion) y enseguida uno invalido (ruta `null`), no se dice si la respuesta en curso se muestra.
- **Opciones:** (a) se descarta y queda el ultimo resultado anterior; (b) se acepta al llegar.
- **Propuesta:** (a): la ruta vigente es `null`, ninguna respuesta le corresponde. `loading` es false con ruta `null`.
- **Estado:** pendiente.

### Q-03. Que vale `data` mientras se carga una ruta nueva

- **Seccion:** Capa de datos compartida; props de `AlertsTable` (`alerts` es null "si aun no hay resultado (primera carga o error)").
- **Duda:** al cambiar de ruta, `data` puede seguir siendo el resultado anterior o pasar a null.
- **Opciones:** (a) conserva el anterior hasta que llegue el nuevo; (b) null.
- **Propuesta:** (a), coherente con la prop de `AlertsTable`. Los componentes muestran `Skeleton` igualmente porque `loading` tiene precedencia (DEC-16).
- **Estado:** pendiente.

### Q-04. Aviso `No movements found...` durante una recarga

- **Seccion:** F1, Comportamiento de la pagina, puntos 5 y 6.
- **Duda:** con Q-03 (a), si el ultimo resultado fue `[]` y se cambia el filtro, `data` sigue siendo `[]` mientras carga. No se dice si el aviso se mantiene durante la carga.
- **Opciones:** (a) se oculta mientras `loading`; (b) se mantiene hasta que llegue la respuesta.
- **Propuesta:** (a), igual que la precedencia `loading` > vacio de DEC-16.
- **Estado:** pendiente.

### Q-05. Umbral invalido y cambio de fechas a la vez

- **Seccion:** F2, AC-F2-04 frente a AC-F2-05 y Comportamiento de la pagina, punto 3.
- **Duda:** AC-F2-04 dice que con el texto del umbral invalido "no deberá pedir datos"; AC-F2-05 y el punto 3 dicen que un cambio de fechas vuelve a pedir "con el ultimo umbral aplicado". Si el texto es invalido y el usuario cambia una fecha, los dos criterios chocan.
- **Opciones:**
  - (a) Se piden las alertas con el umbral aplicado (la tabla sigue al filtro, como KPI y graficos; el aviso del umbral sigue visible).
  - (b) No se piden mientras el texto sea invalido; la tabla conserva el resultado del rango anterior.
- **Propuesta:** (a). La spec separa `appliedThreshold` del texto justamente para pedir con el ultimo valor valido (DEC-08 es el caso simetrico), y el estado vacio muestra el umbral aplicado.
- **Estado:** pendiente.

### Q-06. Vista comparativa abierta con un filtro no pedible que no es un rango invertido

- **Seccion:** F3, Datos y peticiones (DEC-14) y AC-F3-16, que solo nombran el rango invertido; regla unica de peticion (v1.4), que tambien bloquea ano a medio escribir y fecha fuera de `bounds`.
- **Duda:** si la vista se abre con una fecha fuera de rango o a medio escribir y sin resultado previo, no se dice que muestra.
- **Opciones:** (a) el mismo estado vacio de DEC-14 en paneles y grafico; (b) `Skeleton` hasta que el filtro se pueda pedir.
- **Propuesta:** (a): la spec dice que en F3 "rango invalido" es cualquier filtro que no cumple la regla.
- **Estado:** pendiente.

### Q-07. Como se ve el `$0` de la barra vacia

- **Seccion:** F3, AC-F3-10 y Grafico (`GroupComparisonChart`).
- **Duda:** una barra de valor 0 no tiene altura; la spec pide mostrarla "con total `$0`" pero no dice donde aparece ese texto.
- **Opciones:**
  - (a) Etiqueta con `formatCurrency` sobre cada barra (`LabelList`): el grupo vacio muestra `$0` y el otro su total.
  - (b) Solo en el tooltip (no se ve sin pasar el raton).
  - (c) Solo la marca `$0` del eje Y.
- **Propuesta:** (a). Limite: en jsdom `ResponsiveContainer` mide 0 px y no pinta barras, asi que AC-F3-09 y AC-F3-10 se comprueban con tests de los datos que recibe el grafico mas la prueba visual.
- **Estado:** pendiente.

### Q-08. Fallback de `Suspense` de `ComparisonPage` sin cargar Recharts

- **Seccion:** F3, Navegacion entre vistas (DEC-23) y DEC-13.
- **Duda:** DEC-23 pide que el fallback muestre "los dos paneles y el grafico en su estado de carga, con el mismo marcado". Si el fallback importa `GroupComparisonChart`, Recharts vuelve al chunk principal y se pierde lo que busca DEC-13.
- **Opciones:** (a) el fallback usa `GroupTopTable` con `loading` (no usa Recharts) y el marcado de carga de graficos que ya existe en `App` (`ChartFallback`), que DEC-17 declara igual al de carga del grafico de F3; (b) importar `GroupComparisonChart` en `App`.
- **Propuesta:** (a). Se comprueba con la salida del build (chunk principal sin aviso de 500 kB).
- **Estado:** pendiente.

### Q-09. `aria-invalid` cuando hay dos problemas de fecha

- **Seccion:** F1, Renderizado condicional (un solo aviso, el del primer problema).
- **Duda:** con una fecha fuera de rango y ademas el rango invertido solo se muestra el aviso de fuera de rango; no se dice si `aria-invalid` va tambien en el otro input por el rango invertido.
- **Opciones:** (a) `aria-invalid` sigue al aviso mostrado (solo el input fuera de rango); (b) ambos inputs.
- **Propuesta:** (a): lo que anuncia el lector de pantalla coincide con el aviso.
- **Estado:** pendiente.

## Preguntas sobre el proceso

### Q-10. Tests existentes de `App.test.tsx`

- **Seccion:** DEC-19 ("`App.test.tsx` cuenta las `section` con `aria-busy`").
- **Duda:** los dos tests actuales comparan valores exactos (`["true", "true"]` y la lista de `h2`). F2 anade la `section` de alertas y el `h2` `Anomaly Alerts`, y F1 anade la peticion de `facets`. La spec no dice como adaptarlos.
- **Propuesta:** actualizar los valores esperados en la misma tarea que cambia la pagina (tres secciones, `h2` nuevo), sin relajar las comparaciones exactas. No es debilitar el test: la spec cambia la pagina.
- **Estado:** pendiente.

### Q-11. Como cumplir el paso 4 de `verify-frontend-change`

- **Seccion:** [verify-frontend-change](../../.skills/verify-frontend-change/SKILL.md), paso 4: cada test nuevo debe fallar al menos una vez ante la rotura que protege.
- **Duda:** con unos 60 tests nuevos, una mutacion por test es mucho trabajo; no se dice si el paso rojo de TDD cuenta.
- **Opciones:** (a) paso rojo de TDD para cada test y mutacion explicita solo de los comportamientos clave (lista en cada plan); (b) mutacion explicita de cada test.
- **Propuesta:** (a), registrando cada mutacion y que test fallo.
- **Estado:** pendiente.

### Q-12. Donde se registra la evidencia de la etapa 2

- **Seccion:** regla WF (registrar comandos, resultados y limites); AGENTS.md envia a `05-rules-checks.md` solo los ejercicios de reglas.
- **Opciones:** (a) seccion `Registro de ejecucion` al final de cada plan de `docs/handover`; (b) un archivo nuevo `docs/handover/evidence.md`; (c) `docs/validations/`.
- **Propuesta:** (a).
- **Estado:** pendiente.

## Huecos de presentacion (propuestas por defecto para la prueba visual)

La spec fija la presentacion de F1 y de la tarjeta de F2, pero no estos detalles. Si no hay respuesta, se aplica la propuesta y se revisa en la prueba visual.

| ID | Seccion | Hueco | Propuesta |
| --- | --- | --- | --- |
| Q-13 | F1, Comportamiento 5 | Estilo del aviso `No movements found...` | Texto `text-sm text-muted-foreground`, sin caja (no es un error) |
| Q-14 | F1, Renderizado condicional | Tamano del `Skeleton` de la linea `Available data` | Una barra `h-5 w-64`, la altura de una linea `text-sm` |
| Q-15 | F2, Tabla; F3, Tablas | Estilo de las tablas | Cabecera `text-xs` en `muted-foreground`, columnas numericas alineadas a la derecha, separador `border-border/60` entre filas |
| Q-16 | F2, Renderizado condicional | Filas de `Skeleton` de `AlertsTable` | 3 filas `tr`, cada una con 4 celdas con una barra `h-4` |
| Q-17 | F3, `ViewTabs` | Aspecto de las pestanas | Botones `text-sm` de 44 px de alto; activa en `foreground` con borde inferior `primary`, inactiva en `muted-foreground`; anillo de foco `ring` |
| Q-18 | F3, Disposicion | Dos columnas en pantallas estrechas | `grid-cols-1` y dos columnas desde `lg`, como los graficos existentes (`xl`) |
| Q-19 | F3, `GroupTopTable` | Que se ve en vacio y en error | Titulo y descripcion siempre visibles; el mensaje sustituye a la tabla |
| Q-20 | F3, Grafico | Descripcion visible, alto, leyenda y tooltip | `CardDescription` con el mismo texto que `desc`; 280 px de alto como los graficos actuales; sin leyenda (una sola serie); tooltip propio con el estilo de los existentes y `formatCurrency` |
| Q-21 | F2, `ThresholdInput` | Valores validos para `parseThreshold` pero fuera de `step=0.01` (`0.015`) | Se aceptan: la spec define la validez con `parseThreshold`, no con el `step` del navegador |

## Observaciones (no requieren respuesta)

- Los enlaces de la spec a `docs/plans` estan rotos a proposito; los planes de esta fase estan en `docs/handover`.
- `memory-bank/status.md` y `overview.md` describen la spec 1.0 sin implementar; la spec vigente es la 1.8. Se senala como memoria desactualizada; esta fase no la modifica salvo que el mantenedor lo pida.
- En el [README de las specs](../../frontend/specs/README.md#mapa-de-archivos), el mapa de archivos dice "DEC-xx, v1.1 a v1.3"; hoy van de la v1.1 a la v1.8.
- Recharts 3.8.1 (instalado) marca `Cell` como obsoleto; el color por barra de F3 se hace con la prop `shape` de `Bar`. Es un detalle de implementacion, no una decision de la spec.
- `React.StrictMode` (en `main.tsx`) duplica en desarrollo las peticiones del montaje; al revisar los logs del backend en la prueba visual hay que tenerlo en cuenta.
