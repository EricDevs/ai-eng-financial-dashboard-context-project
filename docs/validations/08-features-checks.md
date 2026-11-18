# 08 - Checks de las funcionalidades F1-F3

Evidencia de la implementacion (iteracion 1) de las specs de [frontend/specs](../../frontend/specs/README.md), siguiendo los planes de [docs/plans](../plans).

## F1 - Filtro de rango de fechas

Fecha: 2026-11-18. Rama `feature/frontend-specs-v2-fase6-f1`; codigo en el commit `2b8f862`. Se empezo con la spec v1.3 y el plan v5.0; la prueba visual llevo la spec a v1.4 y el plan a v7.0 (version de entrega sin codigo: v8.0).

### Linea base (antes de tocar codigo)

| Comando | Resultado |
| --- | --- |
| `npm --prefix frontend test` | 1 failed / 7 passed (8). Falla `announces a load error in Spanish and keeps the heading structure` |

Causa comprobada: el test espera con `vi.waitFor` (limite por defecto 1000 ms) los titulos de los graficos, que se cargan en diferido con Recharts; en esta maquina tardan unos 1100 ms. Una copia temporal del test con limite de 10 s paso 2 de 2 veces (copia borrada). No es un fallo de comportamiento. Correccion: `{ timeout: 5000 }` solo en las esperas que dependen de los graficos diferidos (`LAZY_CHARTS` en `App.test.tsx`); las aserciones no cambian.

### Checks automaticos tras la implementacion

| Comando (desde la raiz) | Resultado |
| --- | --- |
| `npm --prefix frontend run lint` | Sin errores ni avisos |
| `npm --prefix frontend test` | 5 archivos, 41 passed (antes 8) |
| `npm --prefix frontend run build` | Sin avisos. Chunk principal 190.38 kB (antes 187.77 kB); `LineChart` 342.29 kB en diferido |
| `npx tsc --ignoreConfig --noEmit --strict ... specs/api-types.ts specs/param-types.ts` (desde `frontend/`) | exit 0 |

Tests nuevos: `financial-utils.test.ts` (+4), `api.test.ts` (4), `use-api-resource.test.tsx` (5), `date-range-picker.test.tsx` (11), `App.test.tsx` (+9).

### Los tests detectan la rotura

Cada rotura se aplico sola, se ejecuto el test del archivo y se restauro desde una copia (comparada byte a byte).

| Rotura provocada | Test que falla |
| --- | --- |
| Quitar `role="alert"` del mensaje de rango invalido | `flags an inverted range` |
| Quitar `startRef.current?.focus()` de `Clear dates` | `moves focus to the start date after clearing` |
| Pedir movimientos sin comprobar `isValidDateRange` en `App` | `blocks requests and keeps data on an inverted range` |
| Aplicar respuestas sin la guarda `ignore` del hook | `shows only the response for the latest path` |

### No verificado todavia

- App en ejecucion: Docker no estaba en marcha (`docker compose ps` sin conexion al daemon). Queda pendiente la prueba visual y de funcionamiento del usuario.
- Lector de pantalla real, otros navegadores y zoom.

### Prueba visual del usuario (ronda 1)

App levantada con `docker compose up --build -d`. Hallazgos del usuario y causa comprobada:

| Hallazgo | Causa | Cambio (spec v1.4) |
| --- | --- | --- |
| Al escribir `02-02-1900` a mano, una peticion por cada digito del ano | Chrome entrega una fecha valida con el ano relleno de ceros en cada digito. Logs del backend: `start_date=0001-02-02`, `0019-02-02`, `0190-02-02`, `1900-02-02` | DEC-25: ano con cero inicial = fecha a medio escribir, sin peticion ni mensaje |
| Fecha muy anterior a los datos sin explicacion | La 1.0 la trataba como rango sin movimientos | DEC-26: aviso `Dates must be between ...`, sin peticion |
| Mensaje de rango invertido en blanco | `text-destructive-foreground` es `oklch(0.94 …)` en el tema oscuro | DEC-28: aviso rojo con borde, fondo e icono |
| `Available data` a la derecha, filtro pequeno, `Clear dates` poco visible | Diseno inicial | DEC-27 y DEC-28 |

### Checks tras los cambios

| Comando | Resultado |
| --- | --- |
| `npm --prefix frontend run lint` | Sin errores ni avisos |
| `npm --prefix frontend test` | 5 archivos, 51 passed (49 tras los cambios + 2 del caso "un solo aviso", anadidos al integrar la spec v1.4) |
| `npm --prefix frontend run build` | Sin avisos; chunk principal 191.21 kB |

| Rotura provocada | Test que falla |
| --- | --- |
| Quitar la deteccion de ano incompleto en `getDateRangeIssue` | `treats a zero-padded year as a date still being typed` y `shows no message while a year is being typed`. El test de `App` no la detecta: con `bounds` conocido, esos anos ya quedan fuera de rango |
| Calcular el aviso de rango invertido aparte de `getDateRangeIssue` | `shows one notice at a time, out of range first` |

Vite en Docker seguia sirviendo el `date-range-picker.tsx` anterior (0 coincidencias con el texto nuevo); tras `docker compose restart frontend`, sirve el nuevo.

### Prueba visual del usuario (ronda 2)

2026-11-18, tras `docker compose restart frontend`: el usuario confirma que el filtro funciona bien con los cambios de la spec v1.4. Sin hallazgos nuevos.

### Limites

Esta implementacion la hizo el mismo agente que escribio la spec y el plan, con todo el contexto de la conversacion. No prueba que el plan baste a un agente sin contexto: eso requiere una ejecucion limpia aparte.

## F2 - Tabla de alertas de anomalias

Fechas: 2026-11-18 y 2026-11-19. Rama `feature/frontend-specs-v2-fase7-f2`, creada sobre la fase 6 (F2 usa el codigo de F1). Se empezo con la spec v1.5 y el plan v5.1; las pruebas visuales llevaron la spec a v1.8 y el plan a v5.4.

### Commits

| Commit | Contenido |
| --- | --- |
| `acc8080` | Tarea 1: `parseThreshold` y constantes del umbral |
| `3662688` | Tarea 2: `ErrorNotice` compartido (extraido del filtro de fechas) y `ThresholdInput` |
| `13c7917` | Tarea 3: `AlertsTable` |
| `afd274c` | Tarea 4: integracion en `App` |
| `6ad24d6`, `ea98a96` | Ronda 1: spec v1.6 (DEC-30) y su cambio |
| `b3a0a1b`, `4a47b1f` | Ronda 2: spec v1.7 (DEC-31) y su cambio |
| `ba7b337`, `04ab5df` | Ronda 3: spec v1.8 (DEC-32 y correccion de `0,3`) y su cambio |

### Checks automaticos

| Comando (desde la raiz) | Resultado |
| --- | --- |
| `npm --prefix frontend run lint` | Sin errores ni avisos |
| `npm --prefix frontend test` | 7 archivos, 76 passed (antes 51): `financial-utils` 18, `api` 4, `use-api-resource` 5, `date-range-picker` 14, `threshold-input` 4, `alerts-table` 10, `App` 21 |
| `npm --prefix frontend run build` | Sin avisos; chunk principal 194.52 kB (191.21 kB tras F1) |

Al extraer `ErrorNotice` del filtro de fechas, sus 14 tests pasaron sin cambios. Los 2 tests existentes de `App` se actualizaron porque el producto cambia: 3 secciones con `aria-busy` y el titulo `Anomaly Alerts`.

### Los tests detectan la rotura

| Rotura provocada | Test que falla |
| --- | --- |
| Aviso del umbral sin `ErrorNotice` (sin `role="alert"`), cuando lo renderizaba `ThresholdInput` | `shows an error for invalid text` |
| Aviso del umbral dentro de la cabecera, tras DEC-31 | `places the threshold error below the header, outside the control` |
| Aplicar el umbral sin `parseThreshold` | `does not request with an invalid threshold` |
| Pedir alertas sin la regla unica de peticion | `does not request alerts with a date filter that cannot be requested` |

### Prueba visual del usuario

Valores de referencia obtenidos con `curl` a la API el mismo dia (el dataset depende de la fecha): con `0.3`, 4 alertas (`2025-12`, `2026-03`, `2026-06`, `2026-08`); con `1.0`, solo `2025-12`; con `0.01`, ademas `2026-09`; desde `2026-02-01`, 3 alertas (`2026-03` sube a 254.3% porque la base solo usa periodos del rango); un mes, `[]`.

| Ronda | Lo que comprobo el usuario | Hallazgo | Cambio |
| --- | --- | --- | --- |
| 1 | Umbrales `1.0`, `0.59`, `0.39`, `0.3` y `0.01`: filas iguales a la API; umbral vacio con aviso y tabla conservada | Hueco vacio entre el titulo y la tabla: el control, en una columna lateral de la cabecera, era mas alto que el titulo | DEC-30 (v1.6): tarjeta en una columna |
| 2 | Desde `2026-02-01`, 3 alertas; un mes, vacio; ventana estrecha correcta | Prefiere el control a la derecha del titulo; el campo del input no se distinguia de la tarjeta | DEC-31 (v1.7): control a la derecha, aviso a todo el ancho colocado por `AlertsTable`, campo con fondo `secondary` |
| 3 | Backend parado (`docker compose stop backend`): `Could not load anomaly alerts.` en la tarjeta | La etiqueta `Alert threshold` en blanco competia con el titulo. Ademas, `0,28` se acepto como `0.28` (navegador en espanol), lo que contradecia la spec | DEC-32 (v1.8): etiqueta en `muted-foreground`; correccion del caso `0,3` en la spec |
| 4 | Aspecto final | Aprobado | — |

Vite en Docker volvio a servir modulos antiguos tras dos cambios; en cada ronda se reinicio el contenedor del frontend y se comprobo con `curl` el modulo servido antes de la prueba.

### No verificado

- Error de alertas con los movimientos funcionando, en el navegador: con el backend parado fallan todas las peticiones (se ven el banner global y el aviso de la tarjeta). El aislamiento (AC-F2-11, INV-6) solo lo prueba el test `keeps alert errors inside the card`.
- Lector de pantalla real, otros navegadores y otros idiomas del navegador para el caso `0,3`.
- Mismo limite que F1: implementacion con todo el contexto de la conversacion.
