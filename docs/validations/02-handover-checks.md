# 02. Registro de comprobaciones del handover

Cada comprobacion conserva fecha, comando, esperado, observado, resultado y limites. El [roadmap](../ROADMAP.md) muestra el progreso por hito; este registro conserva la evidencia. Ejecutar un comando sin guardar su resultado no completa el rastro exigido por el hito 1.5.

## CONFIG-01: validar la configuracion Compose

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-12 |
| Ejecutor y fuente | Mantenedor; salida compartida en la conversacion, no una nueva ejecucion del agente |
| Entorno | Windows, Git Bash, raiz del repositorio, rama `validation-init` |
| Comando | `docker compose config` |
| Esperado | Configuracion resuelta con frontend/backend, puertos 5173/8000/5678, montajes y dependencia de arranque |
| Observado | Dos servicios con sus Dockerfiles y contextos; backend publica 8000 y 5678, frontend 5173; fuentes montadas en `/app`, volumen anonimo `/app/node_modules` y red compartida |
| Resultado | Aprobado: la salida coincide con [docker-compose.yml](../../docker-compose.yml) y el [mapa](01-structure.md) |
| Limites | No construye imagenes, no instala dependencias, no ejecuta tests ni arranca servicios; no demuestra disponibilidad de Docker Engine, respuestas HTTP o compilacion del frontend |

Extracto de la salida compartida (sin repetir las rutas absolutas del equipo):

```yaml
name: ai-eng-financial-dashboard-context-project
# backend: puertos publicados 8000 y 5678, bind de fuentes a /app
# frontend: puerto publicado 5173, bind de fuentes a /app,
#           volumen anonimo /app/node_modules
# Ambos servicios pertenecen a la red default.
```

La salida resuelta contiene ademas esta dependencia dentro del servicio frontend:

```yaml
depends_on:
  backend:
    condition: service_started
    required: true
```

`service_started` ordena el arranque; no espera a que la API responda correctamente ni equivale a un healthcheck. Los puertos corresponden a interfaz (5173), API (8000) y depuracion Python (5678, no HTTP).

## RUN-01: intento 1, construccion y arranque bloqueados

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-12 |
| Ejecutor y fuente | Mantenedor; error compartido desde Git Bash en el entorno local Windows |
| Comando | `docker compose up --build` |
| Esperado | Construccion de imagenes y arranque de frontend/backend |
| Observado | No se pudo conectar con la API de Docker Desktop Linux Engine; el named pipe indicado no existe; salida de terminal con codigo 1 |
| Resultado | Bloqueado por entorno: motor Docker inaccesible en el endpoint seleccionado |
| Limites | No demuestra un fallo de compilacion o de codigo; no hay evidencia de construccion o arranque exitosos |

Error aportado:

```text
unable to get image 'ai-eng-financial-dashboard-context-project-frontend': failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine; check if the path is correct and if the daemon is running: open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

La causa inmediata comprobada por el error era la ausencia del canal de conexion al motor seleccionado. El 12 de noviembre de 2026 el mantenedor confirma la causa del primer intento: Docker Desktop no estaba ejecutandose. Abrio la aplicacion y pudo ejecutar Compose correctamente, como muestra el intento 2. Esta causa y su resolucion se registran con su confirmacion, no como una inspeccion de procesos realizada por el agente. No fue necesario cambiar codigo ni Compose.

En VS Code local, el editor no proporciona Docker Engine. Para el flujo documentado, abrir Docker Desktop, comprobar que usa contenedores Linux y esperar a que indique que el motor esta en ejecucion. Si no esta instalado o requiere cambios del sistema/permisos, el mantenedor debe realizar esa configuracion fuera del agente.

Tras este fallo se propuso iniciar Docker Desktop y comprobar `docker version`. No se recibio esa salida; el mantenedor compartio directamente el segundo intento de RUN-01, que demuestra que Docker ya pudo construir imagenes y arrancar contenedores. Se conserva el primer fallo como antecedente, no como bloqueo actual.

## RUN-01: intento 2, construccion y arranque aprobados

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-12 |
| Ejecutor y fuente | Mantenedor; log de `docker compose up --build` compartido desde Git Bash, rama `validation-init`; no una ejecucion del agente |
| Esperado | Construir ambas imagenes, crear contenedores y arrancar Vite/Uvicorn |
| Observado | Imagenes backend/frontend exportadas; red y contenedores creados; Vite 8.0.8 listo en 5173; Uvicorn escucha en 8000 y completa el startup |
| Resultado | Aprobado para construccion de imagenes y arranque inicial; bloqueo de conexion del intento 1 resuelto en esta ejecucion |
| Limites | No hay respuesta HTTP, prueba de UI, tests ni `npm run build` en el log; no se demuestra disponibilidad continua despues del instante observado. Compose permanece adjunto: no se atribuye un codigo de salida final exitoso |

Extractos relevantes del log compartido, omitiendo descargas y capas intermedias:

```text
[backend] naming to docker.io/library/ai-eng-financial-dashboard-context-project-backend:latest
[frontend] naming to docker.io/library/ai-eng-financial-dashboard-context-project-frontend:latest
Attaching to backend-1, frontend-1
frontend-1 | > vite --host 0.0.0.0 --port 5173
frontend-1 | VITE v8.0.8 ready in 1428 ms
backend-1  | INFO: Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
backend-1  | INFO: Started server process [20]
backend-1  | INFO: Application startup complete.
```

Dependencias Python observadas durante la construccion: FastAPI 0.162.5, Uvicorn 0.54.0, Pydantic 2.14.3, Debugpy 1.8.22, Pytest 9.2.0 y HTTPX 0.28.1. Son versiones instaladas en este intento, no versiones fijadas por el repositorio ni evidencia de que las pruebas pasen.

Avisos que no impidieron el arranque observado:

- npm informa 21 vulnerabilidades: 1 baja, 12 moderadas y 8 altas. No se dispone del detalle de `npm audit` ni de una evaluacion de explotabilidad; conservar como riesgo pendiente, no ejecutar `npm audit fix` o `--force` ni actualizar dependencias sin analizar y acordar ese cambio.
- Debugpy avisa sobre modulos congelados y posibles breakpoints omitidos; indica que la depuracion continua. No es un fallo de startup de Uvicorn.
- El instalador Python avisa del uso de root durante la construccion y de una actualizacion disponible. No se cambia el Dockerfile ni se actualizan herramientas por esos avisos en esta comprobacion.

La respuesta de salud desde el host se comprueba por separado en HEALTH-01, a continuacion; no se deduce del mensaje de startup.

## HEALTH-01: respuesta de salud desde el host

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-12; cabecera HTTP `19:32:16 GMT` |
| Ejecutor y fuente | Mantenedor; respuesta compartida desde Git Bash, no una peticion del agente |
| Comando | `curl -i http://localhost:8000/health` |
| Esperado | HTTP 200, contenido JSON y `{"status":"ok"}` |
| Observado | `HTTP/1.1 200 OK`, `server: uvicorn`, `content-type: application/json` y cuerpo exactamente igual al esperado |
| Resultado | Aprobado: el endpoint de salud responde desde el host a traves del puerto 8000 publicado |
| Limites | No comprueba movimientos, filtros, calculos, proxy Vite, UI, tests, seguridad ni disponibilidad continua |

Respuesta compartida:

```http
HTTP/1.1 200 OK
date: Thu, 12 Nov 2026 19:32:16 GMT
server: uvicorn
content-length: 15
content-type: application/json
vary: Origin

{"status":"ok"}
```

La ruta facets se comprueba por separado en FACETS-01; la salud aprobada no demuestra el funcionamiento de las rutas financieras.

## FACETS-01: opciones y rango de fechas

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-12; cabecera HTTP `19:33:55 GMT` |
| Ejecutor y fuente | Mantenedor; respuesta compartida desde Git Bash, no una peticion del agente |
| Comando | `curl -i http://localhost:8000/api/metrics/facets` |
| Esperado | HTTP 200 y objeto con opciones de operacion, negocio, categoria y fechas minima/maxima |
| Observado | Operaciones income/outcome, negocios B2B/B2C, cinco categorias; `min_date=2025-11-01`, `max_date=2026-10-28` |
| Resultado | Aprobado para la respuesta de facets: campos/opciones coinciden con el contrato descrito en el [mapa](01-structure.md), fechas ISO ordenadas |
| Limites | No se ha contrastado el rango contra la lista completa de movimientos; no comprueba filtros, importes, agregaciones, otras rutas, UI ni tests. Las fechas son las observadas en esta ejecucion, no constantes del proyecto |

Respuesta compartida:

```http
HTTP/1.1 200 OK
date: Thu, 12 Nov 2026 19:33:55 GMT
server: uvicorn
content-length: 194
content-type: application/json
vary: Origin

{"operation_types":["income","outcome"],"business_types":["B2B","B2C"],"categories":["administrative","operational","others","sales","suppliers"],"min_date":"2025-11-01","max_date":"2026-10-28"}
```

La consulta de movimientos para el dia minimo observado se registra por separado en METRICS-01; facets no demuestra por si sola la aplicacion de filtros.

## METRICS-01: movimientos de un dia inclusivo

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-12; cabecera HTTP `19:37:19 GMT` |
| Ejecutor y fuente | Mantenedor; respuesta compartida desde Git Bash, no una peticion del agente |
| Comando | `curl -i "http://localhost:8000/api/metrics?start_date=2025-11-01&end_date=2025-11-01"` |
| Esperado | HTTP 200 y lista no vacia, todos los movimientos del dia solicitado con los cinco campos del contrato |
| Observado | Un movimiento: fecha 2025-11-01, importe numerico 5465.56, operacion income, categoria sales, negocio B2C |
| Resultado | Aprobado para el contrato observado y la inclusion de un dia con inicio/fin iguales; la fecha coincide con el minimo de FACETS-01 |
| Limites | No demuestra conteo/orden/rango de la lista completa ni los filtros de categoria, operacion o negocio; no valida importes reales ni todas las fronteras de fechas |

Respuesta compartida:

```http
HTTP/1.1 200 OK
date: Thu, 12 Nov 2026 19:37:19 GMT
server: uvicorn
content-length: 114
content-type: application/json
vary: Origin

[{"create_date":"2025-11-01","amount":5465.56,"operation_type":"income","category":"sales","business_type":"B2C"}]
```

La exclusion del ingreso conocido mediante el filtro `outcome` se registra por separado en FILTER-OP-01.

## FILTER-OP-01: exclusion por tipo de operacion

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-12; cabecera HTTP `19:40:50 GMT` |
| Ejecutor y fuente | Mantenedor; respuesta compartida desde Git Bash, no una peticion del agente |
| Comando | `curl -i "http://localhost:8000/api/metrics?start_date=2025-11-01&end_date=2025-11-01&operation_type=outcome"` |
| Esperado | HTTP 200 y `[]`: METRICS-01 devolvio solo un ingreso para ese dia |
| Observado | HTTP 200, contenido JSON y lista vacia |
| Resultado | Aprobado para la exclusion del ingreso conocido al solicitar gastos en el mismo rango |
| Limites | No demuestra retencion de registros coincidentes ni todos los casos del filtro; no comprueba categoria, negocio, otras rutas o lista completa |

Respuesta compartida:

```http
HTTP/1.1 200 OK
date: Thu, 12 Nov 2026 19:40:50 GMT
server: uvicorn
content-length: 2
content-type: application/json
vary: Origin

[]
```

## FILTER-OP-02: retencion por tipo de operacion

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-12; cabecera HTTP `19:43:54 GMT` |
| Ejecutor y fuente | Mantenedor; respuesta compartida desde Git Bash, no una peticion del agente |
| Comando | `curl -i "http://localhost:8000/api/metrics?start_date=2025-11-01&end_date=2025-11-01&operation_type=income"` |
| Esperado | HTTP 200 y el mismo ingreso de METRICS-01 |
| Observado | Un movimiento de fecha `2025-11-01`, importe `5465.56`, operacion `income`, categoria `sales` y negocio `B2C` |
| Resultado | Aprobado para la retencion del ingreso conocido; junto a FILTER-OP-01 descarta un filtro que siempre devuelva vacio en estas consultas |
| Limites | No prueba retencion de gastos, rangos mixtos, filtros combinados, categoria, negocio ni otras rutas |

Respuesta compartida:

```http
HTTP/1.1 200 OK
date: Thu, 12 Nov 2026 19:43:54 GMT
server: uvicorn
content-length: 114
content-type: application/json
vary: Origin

[{"create_date":"2025-11-01","amount":5465.56,"operation_type":"income","category":"sales","business_type":"B2C"}]
```

## FILTER-CAT-01: exclusion por categoria

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-12; cabecera HTTP `19:46:19 GMT` |
| Ejecutor y fuente | Mantenedor; respuesta compartida desde Git Bash, no una peticion del agente |
| Comando | `curl -i "http://localhost:8000/api/metrics?start_date=2025-11-01&end_date=2025-11-01&category=operational"` |
| Esperado | HTTP 200 y `[]`: el unico movimiento de METRICS-01 pertenece a sales |
| Observado | HTTP 200, contenido JSON y lista vacia |
| Resultado | Aprobado para la exclusion del movimiento sales conocido al solicitar operational en el mismo rango |
| Limites | No demuestra retencion de registros coincidentes, otras categorias, rangos mixtos, filtros combinados ni negocio |

Respuesta compartida:

```http
HTTP/1.1 200 OK
date: Thu, 12 Nov 2026 19:46:19 GMT
server: uvicorn
content-length: 2
content-type: application/json
vary: Origin

[]
```

## FILTER-CAT-02: retencion por categoria

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-12; cabecera HTTP `19:47:58 GMT` |
| Ejecutor y fuente | Mantenedor; respuesta compartida desde Git Bash, no una peticion del agente |
| Comando | `curl -i "http://localhost:8000/api/metrics?start_date=2025-11-01&end_date=2025-11-01&category=sales"` |
| Esperado | HTTP 200 y el mismo ingreso de METRICS-01 |
| Observado | Fecha `2025-11-01`, importe `5465.56`, operacion `income`, categoria `sales` y negocio `B2C` |
| Resultado | Aprobado para retencion del movimiento sales conocido; complementa la exclusion observada en FILTER-CAT-01 |
| Limites | No prueba todas las categorias, rangos mixtos, filtros combinados, negocio ni otras rutas |

Respuesta compartida:

```http
HTTP/1.1 200 OK
date: Thu, 12 Nov 2026 19:47:58 GMT
server: uvicorn
content-length: 114
content-type: application/json
vary: Origin

[{"create_date":"2025-11-01","amount":5465.56,"operation_type":"income","category":"sales","business_type":"B2C"}]
```

## OPENAPI-01: inventario de rutas en Swagger

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-12; la captura no muestra hora |
| Ejecutor y fuente | Mantenedor; captura de Swagger compartida en el chat, transcrita abajo; no se ha guardado un archivo de imagen en el repositorio |
| Accion solicitada | Abrir `http://localhost:8000/docs` y comparar las operaciones con la seccion 5 del [mapa](01-structure.md) |
| Esperado | Nueve operaciones GET propias, coincidentes con el mapa |
| Observado | Financial Metrics API, version 0.1.0, OAS 3.1; nueve operaciones GET bajo default |
| Resultado | Aprobado para el contraste visual del inventario de rutas |
| Limites | La captura no muestra la barra de direccion, HTTP status, parametros ni campos de los esquemas desplegados; no se descargaron ni analizaron los bytes de openapi.json y no se ejecutaron estas nueve operaciones |

Operaciones visibles en la captura:

- GET `/health`
- GET `/api/metrics`
- GET `/api/metrics/facets`
- GET `/api/metrics/summary`
- GET `/api/metrics/categories/top`
- GET `/api/metrics/comparison`
- GET `/api/metrics/alerts`
- GET `/api/metrics/b2b`
- GET `/api/metrics/b2c`

## UI-PROXY-01: peticion del dashboard por Vite

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-13; cabecera HTTP `13:07:39 GMT` |
| Ejecutor y fuente | Mantenedor; capturas de dashboard, Network y Headers, seguidas de un extracto de Response compartido en el chat |
| Accion | Abrir localhost:5173, seleccionar Fetch/XHR en Network, filtrar metrics y recargar |
| Esperado | GET `http://localhost:5173/api/metrics`, HTTP 200, movimientos JSON y dashboard con datos |
| Observado | Dos peticiones GET metrics, HTTP 200, tipo fetch, iniciadas en App.tsx:16; URL en 5173, respuesta application/json y servidor uvicorn; dashboard con KPIs y grafico visibles |
| Contraste con codigo | [App.tsx](../../frontend/src/App.tsx) solicita `/api/metrics` y calcula KPIs/series; [vite.config.ts](../../frontend/vite.config.ts) reenvia `/api` a `http://backend:8000` |
| Resultado | Aprobado para el flujo UI/proxy observado; completa el contraste pendiente del hito 1.2 junto a CONFIG-01, el mapa y OPENAPI-01 |
| Limites | El extracto pegado esta truncado; no se valida el JSON completo, numero total de movimientos, orden global, totales exactos, estados de error/vacio ni todas las rutas. Las dos peticiones son compatibles con StrictMode, sin diagnosticar su causa por la captura sola |

Cabeceras relevantes transcritas; se omiten cookies y datos del navegador:

```text
Request URL: http://localhost:5173/api/metrics
Request Method: GET
Status Code: 200 OK
Remote Address: [::1]:5173
Content-Length: 41683
Content-Type: application/json
Date: Fri, 13 Nov 2026 13:07:39 GMT
Server: uvicorn
```

Primeros dos movimientos del extracto, conservados como muestra y no como respuesta completa:

```json
[
  {"create_date":"2025-11-01","amount":5465.56,"operation_type":"income","category":"sales","business_type":"B2C"},
  {"create_date":"2025-11-02","amount":2656.03,"operation_type":"outcome","category":"administrative","business_type":"B2C"}
]
```

La captura del dashboard muestra `2024 - Full Year`, mientras que el extracto incluye fechas de 2025 y 2026. Es la discrepancia de periodo fijo ya identificada en el mapa y en App, no un fallo del proxy ni una autorizacion para cambiar producto.

## SUMMARY-01: revision del resumen por el mantenedor

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-13 |
| Ejecutor y fuente | Mantenedor; sintesis escrita compartida en el chat tras revisar el [informe canonico](verification%20-%20resume.md) |
| Esperado | Explicar funcionalidad, origen de datos, conexion UI/API y arranque/parada |
| Funcionalidad explicada | Dashboard financiero con cuatro KPI y series mensuales de ingresos/egresos y margen |
| Datos explicados | Movimientos sinteticos generados en memoria, sin base de datos configurada en los archivos inspeccionados |
| Conexion explicada | React pide GET /api/metrics; proxy Vite envia a backend:8000 en Compose; FastAPI devuelve JSON y React calcula KPI/mes |
| Ejecucion explicada | docker compose up --build desde raiz; puertos 5173, 8000 y 5678, este ultimo de Debugpy, no HTTP; Ctrl+C o docker compose down para detener segun el modo de ejecucion |
| Resultado | Hito 1.3 completado para la revision de esta sintesis, coincidente con las secciones 1 a 4 del informe |
| Limites | Revision de comprension, no una prueba ejecutable ni aprobacion de todas las afirmaciones del informe. No demuestra ejecucion de parada ni correccion funcional de las nueve rutas |

Aclaracion de parada comunicada: Ctrl+C detiene los contenedores del comando en primer plano y los conserva; docker compose down detiene y retira los contenedores y la red de Compose, y puede usarse tambien despues de Ctrl+C. No es exclusivo del modo en segundo plano. Aplicarlo solo a los servicios de este proyecto. La sintesis del mantenedor ya distingue Debugpy de la API HTTP.

## SUMMARY-API-01: resumen diario del movimiento conocido

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-13; cabecera HTTP `14:09:47 GMT` |
| Ejecutor y fuente | Mantenedor; salida curl compartida en el chat, no una peticion del agente |
| Comando | `curl -i "http://localhost:8000/api/metrics/summary?group_by=day&start_date=2025-11-01&end_date=2025-11-01"` |
| Esperado independiente | METRICS-01 tiene un unico ingreso de 5465.56 en ese dia: income 5465.56, outcome 0 y net 5465.56 |
| Observado | HTTP 200 y un elemento con period 2025-11-01, income 5465.56, outcome 0.0 y net 5465.56 |
| Resultado | ✅ Aprobado para resumen por dia y calculo de neto del rango conocido |
| Limites | No demuestra agrupacion semanal/mensual, suma de varios movimientos, orden de varios periodos ni todos los filtros |

La primera copia compartida estaba cortada en net; no se aprobo hasta recibir el cuerpo completo con las mismas cabeceras. No se interpreta un pegado incompleto como respuesta defectuosa de la API.

```http
HTTP/1.1 200 OK
date: Fri, 13 Nov 2026 14:09:47 GMT
server: uvicorn
content-length: 70
content-type: application/json
vary: Origin

[{"period":"2025-11-01","income":5465.56,"outcome":0.0,"net":5465.56}]
```

## TOP-API-01: total de la categoria del ingreso conocido

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-13; cabecera HTTP `14:12:35 GMT` |
| Ejecutor y fuente | Mantenedor; salida curl compartida en el chat, no una peticion del agente |
| Comando | `curl -i "http://localhost:8000/api/metrics/categories/top?operation_type=income&limit=3&start_date=2025-11-01&end_date=2025-11-01"` |
| Esperado independiente | METRICS-01 tiene un unico ingreso sales de 5465.56 para ese dia; esperar una categoria con ese importe |
| Observado | HTTP 200 y un elemento con category sales, operation_type income y total_amount 5465.56 |
| Resultado | ✅ Aprobado para total por categoria del ingreso conocido |
| Limites | No prueba suma de varios movimientos, orden entre categorias, limite con mas resultados, gastos ni filtro de negocio |

```http
HTTP/1.1 200 OK
date: Fri, 13 Nov 2026 14:12:35 GMT
server: uvicorn
content-length: 71
content-type: application/json
vary: Origin

[{"category":"sales","operation_type":"income","total_amount":5465.56}]
```

## COMPARISON-API-01: comparacion con neto anterior cero

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-13; cabecera HTTP `14:14:06 GMT` |
| Ejecutor y fuente | Mantenedor; salida curl compartida en el chat, no una peticion del agente |
| Comando | `curl -i "http://localhost:8000/api/metrics/comparison?start_date=2025-11-01&end_date=2025-11-01"` |
| Esperado independiente | Neto actual 5465.56 de METRICS-01/SUMMARY-API-01; dia anterior 2025-10-31 antes del minimo informado en FACETS-01: neto previo 0, diferencia 5465.56 y porcentaje null |
| Observado | HTTP 200, current_period 5465.56, previous_period 0.0, delta_abs 5465.56 y delta_pct null |
| Resultado | ✅ Aprobado para la comparacion del dia conocido con neto anterior cero |
| Limites | No comprueba porcentaje con base distinta de cero, rangos de varios dias, filtro de negocio ni validacion de fechas requeridas |

```http
HTTP/1.1 200 OK
date: Fri, 13 Nov 2026 14:14:06 GMT
server: uvicorn
content-length: 85
content-type: application/json
vary: Origin

{"current_period":5465.56,"previous_period":0.0,"delta_abs":5465.56,"delta_pct":null}
```

## B2C-API-01: retencion del movimiento B2C conocido

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-13; cabecera HTTP `14:15:41 GMT` |
| Ejecutor y fuente | Mantenedor; salida curl compartida en el chat, no una peticion del agente |
| Comando | `curl -i "http://localhost:8000/api/metrics/b2c?start_date=2025-11-01&end_date=2025-11-01"` |
| Esperado independiente | El unico movimiento de METRICS-01 es B2C; debe conservarse con los mismos cinco campos |
| Observado | HTTP 200 y el mismo ingreso B2C de 5465.56, fecha 2025-11-01, categoria sales |
| Resultado | ✅ Aprobado para retencion del registro B2C conocido |
| Limites | No comprueba exclusion de B2B, rangos mixtos, orden global ni todos los filtros |

```http
HTTP/1.1 200 OK
date: Fri, 13 Nov 2026 14:15:41 GMT
server: uvicorn
content-length: 114
content-type: application/json
vary: Origin

[{"create_date":"2025-11-01","amount":5465.56,"operation_type":"income","category":"sales","business_type":"B2C"}]
```

## B2B-API-01: exclusion del movimiento B2C conocido

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-13; cabecera HTTP `14:33:25 GMT` |
| Ejecutor y fuente | Mantenedor; salida curl compartida en el chat, no una peticion del agente |
| Comando | `curl -i "http://localhost:8000/api/metrics/b2b?start_date=2025-11-01&end_date=2025-11-01"` |
| Esperado independiente | METRICS-01 contiene un unico registro B2C en ese dia; B2B debe excluirlo y devolver `[]` |
| Observado | HTTP 200 y lista vacia `[]` |
| Resultado | ✅ Aprobado para exclusion del registro B2C conocido |
| Limites | No comprueba retencion de registros B2B, rangos mixtos ni todos los filtros |

```http
HTTP/1.1 200 OK
date: Fri, 13 Nov 2026 14:33:25 GMT
server: uvicorn
content-length: 2
content-type: application/json
vary: Origin

[]
```

## ALERTS-REF-01: resumen diario para el control de alerts

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-13; cabecera HTTP `14:36:18 GMT` |
| Ejecutor y fuente | Mantenedor; salida curl compartida en el chat |
| Comando | `curl -i "http://localhost:8000/api/metrics/summary?group_by=day&start_date=2025-11-01&end_date=2025-11-07"` |
| Observado | HTTP 200; seis periodos, sin fila para 2025-11-05 |
| Resultado | ✅ Referencia recibida; los seis netos coinciden con income menos outcome, redondeado a dos decimales |
| Limites | No aprueba alerts ni prueba los totales contra la lista completa de movimientos |

```http
HTTP/1.1 200 OK
date: Fri, 13 Nov 2026 14:36:18 GMT
server: uvicorn
content-length: 426
content-type: application/json
vary: Origin

[{"period":"2025-11-01","income":5465.56,"outcome":0.0,"net":5465.56},{"period":"2025-11-02","income":5260.11,"outcome":5478.37,"net":-218.26},{"period":"2025-11-03","income":0.0,"outcome":1075.27,"net":-1075.27},{"period":"2025-11-04","income":11828.16,"outcome":0.0,"net":11828.16},{"period":"2025-11-06","income":11152.28,"outcome":1372.08,"net":9780.2},{"period":"2025-11-07","income":8945.03,"outcome":0.0,"net":8945.03}]
```

Control positivo elegido: rango 2025-11-03 a 2025-11-07, agrupacion diaria y threshold 0.3. [detect_outcome_alerts](../../backend/app/routes.py#L219) toma solo los periodos presentes, incluye gastos cero en el historial y omite alertas sin media positiva. Para el dia 6, los periodos previos son el 3 (1075.27) y el 4 (0.0): media sin redondear `(1075.27 + 0) / 2 = 537.635`; aumento `(1372.08 - 537.635) / 537.635`, aproximadamente 1.5521, mayor que 0.3. El dia 5 no se introduce como cero porque no tiene fila. Esperamos una unica alerta del dia 6; baseline_average se devuelve redondeado a dos decimales e increase_ratio a cuatro. El primer periodo se omite y los dias 4 y 7 no superan el umbral. Este es un esperado calculado, no una respuesta observada de alerts.

## ALERTS-API-01: deteccion positiva sobre la media previa

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-13; cabecera HTTP `14:38:40 GMT` |
| Ejecutor y fuente | Mantenedor; salida curl compartida en el chat, no una peticion del agente |
| Comando | `curl -i "http://localhost:8000/api/metrics/alerts?group_by=day&start_date=2025-11-03&end_date=2025-11-07&threshold=0.3"` |
| Esperado independiente | ALERTS-REF-01: una unica alerta del dia 6; gastos 1372.08, media previa sin redondear 537.635 y aumento 1.5521 > 0.3 |
| Observado | HTTP 200; una alerta del 2025-11-06, outcome_total 1372.08, baseline_average 537.63, increase_ratio 1.5521 |
| Resultado | ✅ Aprobado para el control diario positivo y ausencia de alertas en los otros periodos de este rango |
| Limites | No prueba semana/mes, filtro de negocio, umbral exactamente igual al aumento ni todas las ramas con media cero |

```http
HTTP/1.1 200 OK
date: Fri, 13 Nov 2026 14:38:40 GMT
server: uvicorn
content-length: 99
content-type: application/json
vary: Origin

[{"period":"2025-11-06","outcome_total":1372.08,"baseline_average":537.63,"increase_ratio":1.5521}]
```

La media publicada 537.63 se conserva exactamente como fue recibida; la comparacion y el aumento usan la media previa sin redondear, no el valor publicado. No se declara un defecto por esperar un redondeo decimal financiero distinto del `round` sobre float usado en el backend.

## BACKEND-TEST-01: suite existente del backend

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-13; salida sin hora propia |
| Ejecutor y fuente | Mantenedor; salida de Git Bash compartida en el chat |
| Comando | `uv run --no-project --python 3.13 --with-requirements backend/requirements.txt pytest backend/tests/test_routes.py -q` |
| Esperado | 15 tests aprobados y codigo de salida 0 |
| Observado | 31 paquetes instalados en 1.33 s; `15 passed, 1 warning in 1.94s`; retorno al prompt; codigo de salida 0 en el contexto del terminal |
| Resultado | ✅ Suite backend aprobada para los 15 tests existentes |
| Limites | No mide cobertura ni prueba todos los filtros, agregaciones, estados UI o respuesta completa; frontend, lint y build siguen pendientes |

Extracto de la salida; se omiten las rutas locales de cache y el prompt:

```text
Installed 31 packages in 1.33s
...............                                                     [100%]
============================ warnings summary ============================
StarletteDeprecationWarning: Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead.
  from starlette.testclient import TestClient as TestClient  # noqa

15 passed, 1 warning in 1.94s
```

El aviso aparece al importar TestClient desde FastAPI y comunica la deprecacion del uso de httpx con Starlette TestClient. No es un test fallido. Se conserva como pendiente de evaluacion; no se han instalado httpx2, actualizado dependencias ni modificado codigo para silenciarlo.

## FRONTEND-TEST-01: intento 1 bloqueado antes de ejecutar tests

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-13; salida sin hora propia |
| Ejecutor y fuente | Mantenedor; salida de Git Bash compartida en el chat |
| Comando | `npm --prefix frontend test` |
| Esperado | Un archivo y cinco tests aprobados, salida 0 |
| Observado | npm encuentra el script `vitest run`, pero Windows no reconoce vitest; codigo de salida 1 en el contexto del terminal |
| Resultado | ❌ Intento bloqueado antes de ejecutar tests; ❓ suite frontend pendiente, no hay tests fallidos observados |
| Causa comprobada | Vitest figura en devDependencies; existe frontend/node_modules, pero no existen frontend/node_modules/vitest ni frontend/node_modules/.bin, comprobado por el agente con listados locales |
| Limite | No se determina por que la instalacion local estaba incompleta; no se infiere un defecto de financial-utils |

```text
npm notice run frontend@0.0.0 test
npm notice run vitest run
"vitest" no se reconoce como un comando interno o externo,
programa o archivo por lotes ejecutable.
```

Resolucion propuesta en el intento 1: `npm --prefix frontend install --include=dev`, ejecutada posteriormente por el mantenedor y conservada en FRONTEND-INSTALL-01. Instala en el host las dependencias declaradas, incluidas las de desarrollo donde esta Vitest; no instalar Vitest globalmente ni sustituir la prueba por npx que descargue otra version. Existe un package-lock.json local: npm lo utiliza y puede actualizarlo si no coincide con package.json; conservar y revisar cualquier cambio. Despues de una instalacion correcta, repetir `npm --prefix frontend test` y registrar el intento 2. No se han instalado paquetes, editado manifiestos ni aprobado la suite por el agente.

## FRONTEND-INSTALL-01: dependencias locales instaladas

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-13; salida sin hora propia |
| Ejecutor y fuente | Mantenedor; salida de Git Bash compartida en el chat |
| Comando | `npm --prefix frontend install --include=dev` |
| Observado | 263 paquetes anadidos, 264 auditados en 1m; 67 con solicitud de financiacion; codigo de salida 0 en el contexto del terminal |
| Comprobacion local | El agente confirma que ahora existe frontend/node_modules/.bin/vitest.cmd |
| Resultado | ✅ Instalacion completada y lanzador local disponible; por si sola no aprueba la suite frontend |
| Riesgo | 21 vulnerabilidades: 1 low, 12 moderate y 8 high; alcance y paquetes afectados no evaluados con esta salida |

```text
added 263 packages, and audited 264 packages in 1m

67 packages are looking for funding
  run `npm fund` for details

21 vulnerabilities (1 low, 12 moderate, 8 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
```

Las sugerencias de npm se conservan como salida, no como acciones ejecutadas ni instrucciones del agente. No se ha aplicado audit fix ni audit fix --force. Este conteo coincide con el observado durante RUN-01, pero no prueba que los paquetes o versiones afectados sean los mismos. La instalacion no demuestra que tests, lint o build pasen; el resultado posterior de la suite se conserva en FRONTEND-TEST-01 intento 2. No se han revertido cambios del mantenedor en manifiestos o lockfile.

## FRONTEND-TEST-01: intento 2 aprobado

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-13; Start at 15:46:16, sin zona horaria indicada |
| Ejecutor y fuente | Mantenedor; salida de Git Bash compartida en el chat |
| Comando | `npm --prefix frontend test` |
| Observado | Vitest v4.1.4; un archivo aprobado, cinco tests aprobados; tests 78ms, duracion total 487ms; codigo de salida 0 en el contexto del terminal |
| Resultado | ✅ Suite frontend aprobada para los cinco tests existentes, tras FRONTEND-INSTALL-01 |
| Alcance | computeKPIs: totales/beneficio y porcentaje sin ingresos; computeMonthlyData: orden y agregacion mensual; formatos de moneda y porcentaje |
| Limites | No prueba la respuesta financiera completa, integracion API, renderizado de graficas ni estados UI; lint y build siguen pendientes |

Extracto de la salida; se omite solo la linea RUN con la ruta absoluta del workspace. La version observada se conserva en la tabla:

```text
npm notice run frontend@0.0.0 test
npm notice run vitest run

 ✓ src/lib/financial-utils.test.ts (5 tests) 78ms
   ✓ computeKPIs (2)
     ✓ calculates totals and profit values 2ms
     ✓ returns 0 profitPercent when there is no income 0ms
   ✓ computeMonthlyData (1)
     ✓ returns chronological year-month points with aggregated totals 65ms
   ✓ formatters (2)
     ✓ formats currency without decimals 8ms
     ✓ formats percent with one decimal 0ms

 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  15:46:16
   Duration  487ms (transform 70ms, setup 0ms, import 94ms, tests 78ms, environment 0ms)
```

El intento 1 bloqueado se conserva como historial; el intento 2 confirma la suite despues de instalar las dependencias locales. No se modifico codigo para obtener este resultado ni se resolvieron las vulnerabilidades npm.

## FRONTEND-LINT-01: ESLint aprobado

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-13; salida sin hora propia |
| Ejecutor y fuente | Mantenedor; salida de Git Bash compartida en el chat |
| Comando | `npm --prefix frontend run lint` |
| Observado | npm ejecuta `eslint .`; no muestra errores ni avisos; codigo de salida 0 en el contexto del terminal |
| Resultado | ✅ Lint frontend aprobado con la configuracion existente |
| Limites | No equivale a typecheck, build, cobertura de tests ni validacion funcional de la UI |

```text
npm notice run frontend@0.0.0 lint
npm notice run eslint .
```

No se modifico codigo ni configuracion ESLint para obtener este resultado. Las 21 vulnerabilidades npm y el aviso TestClient permanecen pendientes de evaluacion.

## FRONTEND-BUILD-01: TypeScript y bundle aprobados

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-13; salida sin hora propia |
| Ejecutor y fuente | Mantenedor; salida de Git Bash compartida en el chat |
| Comando | `npm --prefix frontend run build` |
| Observado | `tsc -b && vite build`; Vite v8.0.8, 2290 modulos transformados, build en 917ms; codigo de salida 0 en el contexto del terminal |
| Resultado | ✅ TypeScript y generacion del bundle completados; Vite solo se ejecuta si tsc termina correctamente |
| Aviso | Chunk JavaScript de 584.26 kB (gzip 175.20 kB), superior al umbral de aviso de 500 kB tras minificacion |
| Limites | No prueba despliegue, conectividad API del bundle publicado, rendimiento medido ni estados UI |

```text
npm notice run frontend@0.0.0 build
npm notice run tsc -b && vite build
vite v8.0.8 building client environment for production...
✓ 2290 modules transformed.
computing gzip size...
dist/index.html                   0.47 kB │ gzip:   0.30 kB
dist/assets/index-DCNIvorZ.css   17.61 kB │ gzip:   4.28 kB
dist/assets/index-z8H6cNp0.js   584.26 kB │ gzip: 175.20 kB

✓ built in 917ms
[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```

El aviso no impidio completar el build. Se conserva como observacion de tamano pendiente de evaluacion, no como un fallo ni prueba de lentitud. No se modifico codigo, particion de chunks ni umbral para silenciarlo. Las recomendaciones impresas por Vite no se han aplicado. Las 21 vulnerabilidades npm y el aviso TestClient siguen pendientes de evaluacion.

## PARAM-OP-01: rechazo de operation_type invalido

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-13; cabecera HTTP `14:52:12 GMT` |
| Ejecutor y fuente | Mantenedor; salida curl compartida en el chat |
| Comando | `curl -i "http://localhost:8000/api/metrics?operation_type=invalid"` |
| Esperado | HTTP 422 y detalle de validacion para operation_type, que admite income/outcome |
| Observado | HTTP 422 Unprocessable Content; literal_error en query/operation_type, input invalid, valores esperados income/outcome |
| Resultado | ✅ Rechazo del valor invalido contrastado |
| Limites | No valida todos los parametros, fechas obligatorias ni todos los valores invalidos |

```http
HTTP/1.1 422 Unprocessable Content
date: Fri, 13 Nov 2026 14:52:12 GMT
server: uvicorn
content-length: 177
content-type: application/json
vary: Origin

{"detail":[{"type":"literal_error","loc":["query","operation_type"],"msg":"Input should be 'income' or 'outcome'","input":"invalid","ctx":{"expected":"'income' or 'outcome'"}}]}
```

HTTP 422 es el resultado esperado de esta prueba negativa, no un defecto de la API. La salida 0 de curl indica que la peticion termino; la confirmacion se basa en el estado HTTP y el cuerpo, no solo en ese codigo de salida.

## PARAM-DATES-01: fechas obligatorias de comparison

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-13; cabecera HTTP `14:53:42 GMT` |
| Ejecutor y fuente | Mantenedor; salida curl compartida en el chat |
| Comando | `curl -i "http://localhost:8000/api/metrics/comparison"` |
| Esperado | HTTP 422 por start_date y end_date obligatorios |
| Observado | HTTP 422 Unprocessable Content; dos errores missing, en query/start_date y query/end_date, Field required, input null |
| Resultado | ✅ Obligatoriedad de ambas fechas contrastada al omitirlas juntas |
| Limites | No prueba omision individual, formatos invalidos, rangos invertidos ni todos los parametros |

```http
HTTP/1.1 422 Unprocessable Content
date: Fri, 13 Nov 2026 14:53:42 GMT
server: uvicorn
content-length: 178
content-type: application/json
vary: Origin

{"detail":[{"type":"missing","loc":["query","start_date"],"msg":"Field required","input":null},{"type":"missing","loc":["query","end_date"],"msg":"Field required","input":null}]}
```

El 422 confirma esta prueba negativa; no es un fallo del endpoint ni valida el calculo financiero de comparison.

## METRICS-FULL-01: conteo, orden y extremos de la lista completa

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-13; resumen sin hora propia |
| Ejecutor y fuente | Mantenedor; comando Node y salida JSON compartidos en el chat |
| Comando | Node con dos GET a metrics y facets; reproducible en el bloque siguiente |
| Esperado | Ambos estados 200, count 360, ordered true, extremos 2025-11-01 / 2026-10-28 y facets_match true |
| Observado | Los siete campos coinciden con el esperado; codigo de salida 0 en el contexto del terminal |
| Resultado | ✅ Conteo completo, orden no decreciente por create_date y extremos contra facets contrastados |
| Limites | No prueba orden entre movimientos de la misma fecha, opciones de facets, sumas globales, KPI ni estados UI; no se conserva el cuerpo completo, sino el comando y su resumen |

Comando ejecutado por el mantenedor, desde Git Bash con backend activo y Node disponible; no modifica archivos:

```bash
node --input-type=module -e '
const metricsResponse = await fetch("http://localhost:8000/api/metrics");
const facetsResponse = await fetch("http://localhost:8000/api/metrics/facets");
if (!metricsResponse.ok || !facetsResponse.ok) throw new Error("HTTP no OK");
const movements = await metricsResponse.json();
const facets = await facetsResponse.json();
const dates = movements.map(movement => movement.create_date);
const sortedDates = dates.toSorted();
console.log(JSON.stringify({metrics_status: metricsResponse.status, facets_status: facetsResponse.status, count: movements.length, ordered: dates.every((value, index) => index === 0 || dates[index - 1] <= value), min_date: sortedDates[0], max_date: sortedDates.at(-1), facets_match: sortedDates[0] === facets.min_date && sortedDates.at(-1) === facets.max_date}, null, 2));
'
```

Salida observada:

```json
{
  "metrics_status": 200,
  "facets_status": 200,
  "count": 360,
  "ordered": true,
  "min_date": "2025-11-01",
  "max_date": "2026-10-28",
  "facets_match": true
}
```

## GIT-STATUS-01: alcance del trabajo sin versionar

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-13; salida sin hora propia |
| Ejecutor y fuente | Mantenedor; salida Git Bash compartida en el chat |
| Comando | `git status --short` |
| Observado | `?? docs/`; codigo de salida 0 en el contexto del terminal |
| Resultado | ✅ Git solo muestra docs como no versionado en esta salida |
| Limites | El estado resumido agrupa el directorio; no muestra archivos ignorados ni implica revision del contenido o autorizacion de staging/commit |

```text
?? docs/
```

El agente contrasta por listado cuatro documentos: docs/ROADMAP.md, docs/validations/01-structure.md, docs/validations/02-handover-checks.md y docs/validations/verification - resume.md. No aparecen cambios de aplicacion o lockfile en la salida aportada; no se infiere que los artefactos ignorados esten ausentes. No se han ejecutado git add ni git commit.

## PHASE1-CLOSE-01: aprobacion y commit de fase 1

| Campo | Evidencia |
| --- | --- |
| Fecha | 2026-11-13; salida sin hora propia |
| Ejecutor y fuente | Mantenedor; aprobacion y salidas Git Bash compartidas en el chat |
| Preparacion | Mantenedor ejecuto git add .; diff cached name-status mostro exclusivamente los cuatro documentos previstos como A |
| Revision | Mantenedor ejecuto git diff --cached y confirmo: "apruebo el contenido." |
| Comando de commit | `git commit -m "docs: document verified project handover (phase 1)"` |
| Observado | Rama validation-init, hash corto 3f31fdd, cuatro archivos nuevos, 1534 inserciones, codigo de salida 0 en el contexto del terminal |
| Resultado | ✅ Hitos 1.4-1.6 completados; fase 1 cerrada con limites explicitos |
| Limites | No demuestra push, estado limpio posterior ni resolucion de discrepancias de producto o avisos de dependencias |

Salida del mantenedor:

```text
[validation-init 3f31fdd] docs: document verified project handover (phase 1)
 4 files changed, 1534 insertions(+)
 create mode 100644 docs/ROADMAP.md
 create mode 100644 docs/validations/01-structure.md
 create mode 100644 docs/validations/02-handover-checks.md
 create mode 100644 docs/validations/verification - resume.md
```

Esta nota y la sincronizacion del estado se redactan despues de 3f31fdd; no forman parte de ese commit y quedan pendientes de versionar. No se modifica el commit creado ni se ejecuta push. GIT-STATUS-01 conserva el estado historico anterior al staging.

## Siguiente paso: clasificacion del resumen del hito 1.4

El bloque previsto de API/calidad esta contrastado: nueve rutas con casos concretos, PARAM-OP-01, PARAM-DATES-01, METRICS-FULL-01, 15 tests backend, cinco frontend, lint y build. La [matriz del resumen](verification%20-%20resume.md#matriz-de-contraste-del-resumen) conserva ✅ con alcance, ❌ para la incoherencia del periodo UI y ❓ para exactitud global de KPI, estados UI y parada. No se exige que todas las filas sean ✅ ni se ocultan limites para cerrar el handover.

PHASE1-CLOSE-01 registra aprobacion y commit de los cuatro documentos. Por requisito posterior del mantenedor, falta integrar fase 1 mediante PR antes de iniciar fase 2: incluir notas locales, publicar validation-init, revisar y hacer merge hacia main del fork, sincronizar main y eliminar validation-init local/remota. Vulnerabilidades npm, aviso TestClient y chunk grande siguen pendientes de evaluacion, sin cambios automaticos.

## PR de fase 1: borrador y seguimiento de integracion

Destino comprobado por el agente: origin apunta al fork EricDevs/ai-eng-financial-dashboard-context-project; git ls-remote --symref origin HEAD devuelve refs/heads/main. GitHub CLI esta disponible. Esto no demuestra autenticacion, push, existencia de PR ni merge. Rama actual validation-init; las tres notas posteriores a 3f31fdd estan modificadas y aun deben incluirse en la rama.

Titulo propuesto: `docs: document verified project handover (phase 1)`.

Base: main del fork EricDevs. Head: validation-init. No se propone un PR al repositorio upstream.

### Cuerpo propuesto del PR

#### Resumen

Documenta el handover del dashboard financiero y el plan de cuatro fases. Fase 1 revisada y aprobada por el mantenedor; commit inicial 3f31fdd. No implementa funcionalidades ni reglas de agentes ni memoria del proyecto.

#### Alcance

- Mapa de estructura, servicios, puertos, entradas y flujo React/Vite/FastAPI.
- Informe canonico consolidado, con afirmaciones confirmadas, discrepancias y limites pendientes.
- Registro reproducible de comandos, resultados, intentos bloqueados y avisos.
- Roadmap incremental, con commits independientes e integracion de fase 1 antes de fase 2.
- Notas de aprobacion y cierre posteriores al commit inicial; no se reescribe 3f31fdd.

#### Verificacion registrada

- Compose, arranque, health, nueve rutas GET con casos concretos y flujo UI/proxy contrastados.
- Dos controles negativos HTTP 422: literal invalido y fechas requeridas omitidas.
- METRICS-FULL-01: 360 movimientos, orden por fecha y extremos coincidentes con facets.
- Backend: 15 tests aprobados; frontend: cinco tests de utilidades aprobados.
- ESLint y build TypeScript/Vite completados sin errores.
- Enlaces locales y bloques Markdown comprobados por el agente.

Estas son comprobaciones locales registradas, no resultados de CI ni garantia de cobertura exhaustiva. Comandos y salidas completos en docs/validations/02-handover-checks.md.

#### Limites y riesgos

- Periodo UI fijo 2024 frente a datos observados 2025-2026; discrepancia de producto no corregida.
- Exactitud global de KPI/series, estados UI y efectos de parada no confirmados.
- 21 vulnerabilidades reportadas por npm: 1 low, 12 moderate y 8 high; evaluacion pendiente, sin remediacion automatica.
- Aviso de deprecacion TestClient y aviso de chunk frontend mayor de 500 kB conservados.
- Sin cambios de codigo, dependencias, reglas ni memory-bank en esta fase.

#### Revision e integracion

- [x] Contenido inicial aprobado por el mantenedor; commit 3f31fdd creado.
- [ ] Notas posteriores revisadas e incluidas en validation-init.
- [ ] Diff final del PR limitado a documentacion; requisitos/checks de GitHub revisados.
- [ ] PR merged en main; URL y hash de merge registrados.
- [ ] Main local sincronizado sin perder cambios.
- [ ] Validation-init eliminada local/remota despues del merge.
- [ ] Rama nueva de fase 2 creada desde main actualizado.

### Estado de integracion

| Dato | Estado |
| --- | --- |
| URL y numero de PR | Pendientes |
| Publicacion de validation-init | Pendiente |
| Revision final y checks GitHub | Pendientes; no se afirma CI configurada |
| Metodo y hash de merge | Pendientes; conservar identificacion del commit de fase 1 |
| Sincronizacion de main y eliminacion local/remota | Pendientes |
| Rama fase 2 | Pendiente; nombre propuesto phase-2-engineering-findings |

No hacer push forzado, omitir protecciones ni borrar ramas con cambios no integrados. Si se usa squash, registrar su hash y la relacion con 3f31fdd, que puede no quedar como ancestro de main. No se han ejecutado push, merge, eliminacion ni creacion de ramas por el agente.

## Seguimiento de comprobaciones

- [x] CONFIG-01: configuracion Compose contrastada.
- [x] RUN-01: construccion de imagenes y arranque inicial de ambos servicios, aprobados en el intento 2.
- [x] HEALTH-01: HTTP 200 y respuesta de salud del backend desde el host.
- [x] FACETS-01: HTTP 200, opciones y rango de fechas de facets contrastados.
- [x] METRICS-01: contrato de movimiento y rango inclusivo de un dia contrastados.
- [x] FILTER-OP-01: filtro outcome excluye el ingreso conocido del dia observado.
- [x] FILTER-OP-02: filtro income conserva el ingreso conocido del dia observado.
- [x] FILTER-CAT-01: filtro operational excluye el movimiento sales conocido.
- [x] FILTER-CAT-02: filtro sales conserva el movimiento sales conocido.
- [x] OPENAPI-01: nueve operaciones GET del mapa contrastadas visualmente con Swagger.
- [ ] Cobertura ampliada de filtros y combinaciones: no afirmada por los casos de este handover.
- [x] UI-PROXY-01: interfaz con datos y peticion `/api/metrics` por el proxy Vite contrastadas.
- [x] SUMMARY-01: sintesis del mantenedor cubre funcionalidad, datos, conexion y ejecucion; hito 1.3 completado.
- [x] SUMMARY-API-01: resumen diario y neto del ingreso conocido contrastados.
- [x] TOP-API-01: total de la categoria sales del ingreso conocido contrastado.
- [x] COMPARISON-API-01: neto actual, diferencia y porcentaje null con neto previo cero contrastados.
- [x] B2C-API-01: retencion del ingreso B2C conocido contrastada.
- [x] B2B-API-01: exclusion del ingreso B2C conocido contrastada.
- [x] ALERTS-REF-01: referencia diaria recibida y netos contrastados; no aprueba alerts.
- [x] ALERTS-API-01: alerta diaria positiva, media previa y aumento contrastados.
- [x] BACKEND-TEST-01: 15 tests backend aprobados, salida 0 y un aviso de deprecacion conservado.
- [x] FRONTEND-INSTALL-01: dependencias locales instaladas, vitest.cmd disponible y 21 vulnerabilidades conservadas.
- [x] FRONTEND-TEST-01: intento 1 bloqueado conservado; intento 2 aprobado, un archivo y cinco tests, salida 0.
- [x] FRONTEND-LINT-01: ESLint sin errores ni avisos mostrados, salida 0.
- [x] FRONTEND-BUILD-01: TypeScript y Vite completados, salida 0; aviso de chunk grande conservado.
- [x] PARAM-OP-01: operation_type invalid rechazado con HTTP 422 y detalle correcto.
- [x] PARAM-DATES-01: omision de ambas fechas rechazada con HTTP 422 y dos errores missing.
- [x] METRICS-FULL-01: 360 movimientos, orden por fecha y extremos coincidentes con facets.
- [x] GIT-STATUS-01: docs es el unico directorio no versionado mostrado; cuatro documentos identificados, sin staging ni commit.
- [x] PHASE1-CLOSE-01: contenido aprobado por el mantenedor y commit 3f31fdd creado para los cuatro documentos de fase 1.

RUN-01 esta aprobada para el arranque inicial observado. `docker compose up --build` construye imagenes y arranca servidores de desarrollo; el [Dockerfile frontend](../../frontend/Dockerfile) no ejecuta `npm run build`, por lo que no sustituye la comprobacion posterior de compilacion con TypeScript y Vite.

El hito 1.5 queda completado tras la aprobacion del contenido: los resultados previstos estan conservados con ejecutor, comando, esperado, observado y alcance, incluidos el intento frontend bloqueado, su resolucion y los avisos. PHASE1-CLOSE-01 registra el cierre con commit. Los limites restantes permanecen en el [informe canonico](verification%20-%20resume.md); este registro no autoriza cambios de producto ni remediaciones de dependencias.