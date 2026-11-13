# 04 - Conventions

## Objetivo y alcance

Este documento recoge convenciones que ya se observan en el repositorio y riesgos concretos que conviene tener presentes al modificarlo. Las reglas propuestas se basan en archivos o comportamientos existentes; no presuponen que una práctica observada sea automáticamente adecuada para todo cambio.

**Ámbito inspeccionado:** `backend/`, `frontend/`, `docs/`, los dos `README`, `AGENTS.md`, `docker-compose.yml` y las configuraciones de lint, TypeScript y ejecución. Se excluyeron dependencias instaladas y artefactos generados.

**Registro de fase 2:** revisión documental del 2026-11-13 por el agente, en la rama `phase-2-engineering-findings` y [PR #2](https://github.com/EricDevs/ai-eng-financial-dashboard-context-project/pull/2). Este es el entregable elegido por el mantenedor en lugar del nombre inicialmente sugerido `docs/validations/03-engineering-findings.md`; no se duplica el informe.

**Límite:** los hechos se contrastan con código y configuración. Las tareas y checks de este documento son propuestas para la fase 3, no ejecuciones realizadas ni correcciones comprometidas. No se crean reglas activas, skills ni memoria. La aprobación del conjunto final y su commit se registran por separado del merge de la PR.

## Convenciones y hallazgos por categoría

### Arquitectura y límites entre capas

- El backend expone FastAPI desde `backend/app/main.py` y registra un router definido en `backend/app/routes.py`. Los modelos Pydantic, las funciones de generación/filtrado/agregación de datos y las rutas HTTP residen actualmente juntos en `routes.py`.
- El frontend organiza componentes en `frontend/src/components/dashboard/` y `frontend/src/components/ui/`; los tipos y los cálculos puros están en `frontend/src/lib/financial-types.ts` y `financial-utils.ts`.
- `frontend/src/App.tsx` obtiene los movimientos y calcula los KPI y la serie mensual antes de pasar datos a los componentes de presentación. Los componentes de gráficos reciben datos y estado `loading` mediante props.
- `kpi-card.tsx` reutiliza Card, Skeleton, iconos Lucide y `cn`; `frontend/src/index.css` define tokens del tema. Los gráficos tienen ramas de carga y vacío y `App.tsx` muestra un error de carga. Esos estados existen en código, pero esta revisión no demuestra su corrección visual.
- Las rutas `/api/metrics/b2b` y `/api/metrics/b2c` en `backend/app/routes.py` repiten la selección por tipo de negocio, el filtrado y el ordenamiento.

### Contratos y datos financieros

- Los valores permitidos para `operation_type`, `category` y `business_type` están limitados mediante `Literal` en `backend/app/routes.py` y uniones de tipos en `frontend/src/lib/financial-types.ts`. `GroupBy` solo está declarado en el backend; no existe un contrato cliente para todos los endpoints de agregación.
- El backend define modelos Pydantic para movimientos, facetas, resúmenes, comparación y alertas. El frontend mantiene interfaces TypeScript propias para movimientos y métricas; no se observa generación automática de tipos desde el esquema API.
- Los importes se modelan como `float` en el backend y `number` en el frontend. El frontend calcula beneficio como ingresos menos gastos en `computeKPIs` y `computeMonthlyData`; el backend repite la operación en `calculate_net_value` y `summarize_movements`.
- Hay dos fuentes de datos de demostración: `generate_mock_movements(seed=42)` en el backend y `mockMovements` en `frontend/src/lib/mock-data.ts`. El flujo actual de `App.tsx` consume el backend, no la constante local.
- `backend/app/routes.py` llama a `random.seed(seed)` dentro de `generate_mock_movements`; esto altera el generador aleatorio global del proceso, no solo la generación local.

### Fechas, periodos y presentación

- El backend usa `date` y produce agrupaciones por día, semana ISO y mes en `backend/app/routes.py`. En el frontend, `FinancialMovement.create_date` se documenta como fecha ISO y `computeMonthlyData` construye claves `YYYY-MM` para ordenar cronológicamente.
- `frontend/src/lib/financial-utils.ts` parsea la fecha con `new Date(m.create_date)` y obtiene el año y mes con getters locales. Las cadenas `YYYY-MM-DD` se parsean como UTC en JavaScript, por lo que el mes/año local puede diferir en determinadas zonas horarias.
- El periodo del encabezado está fijado en `frontend/src/App.tsx` (`2024 - Full Year`), mientras que el endpoint devuelve los datos generados en el backend; la generación elige años relativos a la fecha actual en `backend/app/routes.py`. El rótulo y el conjunto de datos pueden dejar de coincidir con el tiempo.
- `formatCurrency` y `formatMonthYearLabel` usan `en-US` y `USD`; hay textos de interfaz en inglés, mientras que `README.es.md` y documentación del proyecto están en español. Es una decisión visible de presentación, no una política de localización documentada.

### Naming y formato

- El backend sigue nombres Python `snake_case` para funciones y variables, y usa clases `PascalCase` para modelos Pydantic (`FinancialMovement`, `MetricsSummaryItem`).
- Los archivos de componentes del dashboard usan kebab-case (`kpi-row.tsx`) y sus exports usan `PascalCase` (`KPIRow`); no es una regla universal de archivos, pues la entrada `App.tsx` conserva otro patrón. Los imports usan tanto `@` como rutas relativas; Vite y TypeScript configuran el mismo alias hacia `src`.
- El formato del frontend no es uniforme: `App.tsx` y `financial-utils.ts` usan comillas dobles y punto y coma; varios componentes de dashboard y `mock-data.ts` usan comillas simples y omiten punto y coma. `frontend/eslint.config.js` configura ESLint, pero no se observa un formateador ni reglas explícitas de comillas/semicolons.
- `frontend/tsconfig.app.json` activa `noUnusedLocals`, `noUnusedParameters` y `noFallthroughCasesInSwitch`; mantener esos chequeos evita dejar código muerto o ramas incompletas.

### Testing y validación

- El backend tiene pruebas HTTP y de funciones en `backend/tests/test_routes.py`; `backend/tests/conftest.py` añade el directorio `backend` a `sys.path` para importar `app`.
- El frontend tiene pruebas unitarias de utilidades financieras en `frontend/src/lib/financial-utils.test.ts`, ejecutadas con Vitest. Incluyen agregación entre años, pero no cubren cambios de zona horaria ni los componentes React.
- `frontend/package.json` define `lint`, `build`, `test` y `test:coverage`. `backend/requirements.txt` incluye `pytest` y `pytest-cov`, pero no hay un comando de lint o formateo del backend definido allí.
- Las pruebas del backend verifican respuestas, filtros y propiedades de agregación; la prueba de movimientos mock comprueba 360 elementos y orden cronológico. Si cambia el contrato o una regla financiera, las pruebas deben cubrir la regla además de un ejemplo de respuesta.

### Configuración, seguridad y DX

- `docker-compose.yml` conecta frontend y backend; `frontend/vite.config.ts` reenvía `/api` a `http://backend:8000`. El README explica que `VITE_API_BASE_URL` es un override opcional y `frontend/.env.example` lo documenta.
- `backend/app/main.py` habilita CORS para cualquier origen, método y cabecera y, a la vez, permite credenciales (`allow_origins=["*"]`, `allow_credentials=True`). No debe asumirse que esta configuración sea apropiada para despliegues con datos reales.
- Los Dockerfiles son de desarrollo: el backend arranca con `debugpy` y `uvicorn --reload`; el frontend arranca el servidor de desarrollo de Vite. `frontend/Dockerfile` instala dependencias con `npm install`, aunque el repositorio versiona `package-lock.json`.
- La guía de inicio en ambos README usa `docker compose up --build`; las URLs de frontend, backend y OpenAPI están enumeradas. Se debe actualizar esa guía si cambian puertos, proxy o requisitos de arranque.

### Documentación e instrucciones para agentes

- `AGENTS.md` instruye revisar `.agents/rules`, `.agents/skills` y `memory-bank` antes de actuar. Esas carpetas no están presentes actualmente en la raíz inspeccionada; comprobar su existencia sigue siendo aplicable, pero no hay contenido local que leer o cargar.
- `README.md` y `README.es.md` ofrecen instrucciones equivalentes en inglés y español, incluidos comandos de arranque y estructura esperada de `.agents/`.
- `docs/ROADMAP.md` y `docs/validations/` contienen documentación de handover y validaciones. Al añadir documentos de proyecto, usar `docs/` y enlazarlos desde el índice o documento relacionado cuando corresponda.

## Decisiones de filtrado y consecuencias

Cada fila retenida identifica una convención observada (**C**), una limitación o riesgo (**L**), o ambos. Las mejoras son las reglas propuestas de la sección siguiente, no hechos ya implementados. `R01` corresponde a la regla 1, y así sucesivamente hasta `R24`.

### Hallazgos retenidos

| ID / categoría | Tipo | Hecho y fuente concreta | Consecuencia para una contribución futura / reglas |
| --- | --- | --- | --- |
| H01 / Arquitectura | C/L | [App.tsx](../frontend/src/App.tsx) delega cálculos en [financial-utils.ts](../frontend/src/lib/financial-utils.ts); [routes.py](../backend/app/routes.py) contiene modelos, helpers y handlers | Reutilizar cálculos testeables sin introducir fórmulas en JSX; separar dominio del transporte cuando el incremento lo requiera. R01 |
| H02 / Arquitectura | L | `get_b2b_metrics` y `get_b2c_metrics` en [routes.py](../backend/app/routes.py) repiten selección, filtrado y orden | Una variante nueva puede divergir de las existentes; conservar filtros inclusivos y orden al compartir lógica. R02 |
| H03 / Arquitectura y UI | C | [kpi-card.tsx](../frontend/src/components/dashboard/kpi-card.tsx) usa Card/Skeleton/`cn`; [index.css](../frontend/src/index.css) define tokens; [App.tsx](../frontend/src/App.tsx) gestiona carga/error | Reutilizar primitivas y preservar los estados de la pieza modificada, sin trasladar fetch a cada tarjeta. R03 |
| H04 / Contratos | C/L | Literales y modelos en [routes.py](../backend/app/routes.py), uniones/interfaces independientes en [financial-types.ts](../frontend/src/lib/financial-types.ts); `GroupBy` solo existe en backend | Revisar ambos contratos solo para campos consumidos y no atribuir al cliente soporte de endpoints que no integra. R04 |
| H05 / Finanzas | L | `float` con redondeo de salida en [routes.py](../backend/app/routes.py); agregación `number` sin ese redondeo en [financial-utils.ts](../frontend/src/lib/financial-utils.ts) | Los totales pueden diferir por precisión/redondeo; explicitar la política antes de cambiar representación. R05 |
| H06 / Datos | L | Fixture fija en [mock-data.ts](../frontend/src/lib/mock-data.ts), pero [App.tsx](../frontend/src/App.tsx) consume `/api/metrics` | No usar la fixture de 2024 como prueba de lo mostrado por la API ni introducir fallback que oculte un error. R06 |
| H07 / Datos | L | `generate_mock_movements` llama a `random.seed` en [routes.py](../backend/app/routes.py) | Generar datos altera el RNG compartido; aislarlo en un cambio autorizado y comprobar reproducibilidad y ausencia de efectos laterales. R07 |
| H08 / Fechas | L | Getters locales tras parsear ISO en [financial-utils.ts](../frontend/src/lib/financial-utils.ts), `date.today()` en [routes.py](../backend/app/routes.py), prueba diciembre/enero en [financial-utils.test.ts](../frontend/src/lib/financial-utils.test.ts) | La semilla no fija el reloj y la zona horaria puede desplazar el mes; un solo hallazgo origina guía de calendario R08 y diseño de pruebas R15 |
| H09 / Periodos | L | [App.tsx](../frontend/src/App.tsx) fija `2024 - Full Year`; [dashboard-header.tsx](../frontend/src/components/dashboard/dashboard-header.tsx) tiene también un valor por defecto de 2024 | Un rótulo estático puede contradecir fechas generadas respecto a hoy; obtenerlo de los datos/filtros. R09 |
| H10 / Presentación | C/L | `en-US` y `USD` en [financial-utils.ts](../frontend/src/lib/financial-utils.ts), textos ingleses y error español en [App.tsx](../frontend/src/App.tsx) | No inferir moneda/idioma desde el idioma del README; acordar localización antes de sustituir formatters. R10 |
| H11 / Naming e imports | C | [kpi-row.tsx](../frontend/src/components/dashboard/kpi-row.tsx) y [routes.py](../backend/app/routes.py) muestran naming por carpeta/lenguaje; [vite.config.ts](../frontend/vite.config.ts) y [tsconfig.app.json](../frontend/tsconfig.app.json) alinean `@` | Seguir nombres e imports vecinos y mantener coherencia del alias en ambos resolutores. R11 |
| H12 / Formato | L | [App.tsx](../frontend/src/App.tsx) y [dashboard-header.tsx](../frontend/src/components/dashboard/dashboard-header.tsx) difieren en comillas/punto y coma; [eslint.config.js](../frontend/eslint.config.js) no fija esas opciones | No convertir un estilo local en norma global ni reformatear archivos ajenos al cambio. R12 |
| H13 / Tipos | C/L | [tsconfig.app.json](../frontend/tsconfig.app.json) activa checks de no usados y fallthrough, pero no declara `strict` | Preservar los checks reales y no prometer garantías de tipado estricto no configuradas. R13 |
| H14 / Testing | C/L | [test_routes.py](../backend/tests/test_routes.py) contiene tests HTTP; [financial-utils.test.ts](../frontend/src/lib/financial-utils.test.ts) verifica totales numéricos y margen sin ingresos | Un test de forma no demuestra una fórmula: añadir casos numéricos/límite para cada comportamiento nuevo. R14 |
| H15 / Testing y DX | C | Scripts `test`, `lint`, `build` en [package.json](../frontend/package.json), pytest en [requirements.txt](../backend/requirements.txt), comando backend registrado en [ROADMAP.md](ROADMAP.md) | Ejecutar el runner del área afectada y registrar su salida real; no reinstalar dependencias por rutina. R16 |
| H16 / Evidencia de tests | L | La suite cliente [financial-utils.test.ts](../frontend/src/lib/financial-utils.test.ts) no renderiza React; el test semanal de [test_routes.py](../backend/tests/test_routes.py) solo exige payload no vacío | No declarar validación visual ni exactitud de todos los filtros a partir de esos tests. R17 |
| H17 / Configuración | L | [main.py](../backend/app/main.py) combina orígenes `*` y credenciales CORS | No presentar la política de desarrollo como aprobada para datos reales; revisar orígenes y preflight en un despliegue autorizado. R18 |
| H18 / DX y ejecución | L | [Dockerfile backend](../backend/Dockerfile) usa Debugpy/recarga, [Dockerfile frontend](../frontend/Dockerfile) Vite dev, [vite.config.ts](../frontend/vite.config.ts) apunta al hostname Compose `backend` | Distinguir servidor dev/build de producción y host/contenedor; cambiar un puerto exige revisar el proxy. R19 |
| H19 / Dependencias | C/L | [package-lock.json](../frontend/package-lock.json) está versionado; [Dockerfile frontend](../frontend/Dockerfile) instala con `npm install` | Conservar el lockfile y usar instalación reproducible cuando se modifique build/CI. R20 |
| H20 / Entorno | C | [.gitignore](../.gitignore) excluye `.env` y permite ejemplos; [.env.example](../frontend/.env.example) documenta `VITE_API_BASE_URL` | Cambiar nombres de variables exige un ejemplo no sensible; ignore no demuestra que un archivo ya versionado esté libre de secretos. R21 |
| H21 / Agentes | C/L | [AGENTS.md](../AGENTS.md) exige buscar reglas/skills/memoria y esas carpetas no existen en esta revisión | Registrar ausencia, no inventar contenido ni afirmar activación automática. R22 |
| H22 / Documentación | C | [README.md](../README.md) y [README.es.md](../README.es.md) describen Compose, proxy y override | Un cambio de arranque debe reflejarse en los dos idiomas sin equiparar el proxy de Compose al arranque separado en host. R23 |
| H23 / Documentación | C | [ROADMAP.md](ROADMAP.md) enlaza el [registro de checks](validations/02-handover-checks.md) | Mantener una fuente canónica y enlaces relativos comprobables; no duplicar informes con estados contradictorios. R24 |

### Candidatos descartados o reformulados

Estos candidatos se evalúan ahora como controles negativos del filtrado; no se afirma que procedan de una búsqueda anterior no registrada.

| Candidato | Decisión y razón | Evidencia o destino |
| --- | --- | --- |
| «Usar buenas prácticas» / «escribir código limpio» | Descartado: no define archivo, comportamiento ni resultado verificable | Sustituido por H01-H23 y tareas concretas, no por una regla genérica |
| «Todo el proyecto usa TypeScript estricto» | Descartado: los checks existentes no equivalen a `strict` | [tsconfig.app.json](../frontend/tsconfig.app.json); H13 / R13 |
| «Todas las rutas filtran por negocio» | Descartado: `get_metrics` no declara `business_type`; resumen/top/comparación/alertas sí | Firmas en [routes.py](../backend/app/routes.py); H04 / R04 |
| «La semilla 42 fija un año calendario completo» | Descartado: `date.today()` y `_year_for_month` siguen cambiando las fechas | [routes.py](../backend/app/routes.py); H08-H09 / R08-R09-R15 |
| «Todo el frontend debe usar comillas dobles y punto y coma» | Descartado como convención: hay estilos distintos y no se configura esa norma | [App.tsx](../frontend/src/App.tsx), [dashboard-header.tsx](../frontend/src/components/dashboard/dashboard-header.tsx), [eslint.config.js](../frontend/eslint.config.js); H12 / R12 |
| «Todos los archivos de React se nombran en kebab-case» | Reformulado: solo se retiene el patrón de la carpeta dashboard | La entrada [App.tsx](../frontend/src/App.tsx) es contraejemplo; H11 / R11 |
| «El dashboard usa datos reales» / «la fixture local refleja la API» | Descartado: hay un generador mock y la fixture no es la fuente del fetch actual | [routes.py](../backend/app/routes.py), [App.tsx](../frontend/src/App.tsx), [mock-data.ts](../frontend/src/lib/mock-data.ts); H06 / R06 |
| «Crear Markdown activa automáticamente las reglas» | Descartado: [AGENTS.md](../AGENTS.md) prescribe lectura, no prueba un cargador automático | H21 / R22; activación y tareas reales pertenecen a fase 3 |
| «Un test que devuelve 200 prueba filtros, números y UI» | Descartado: no demuestra valores esperados ni renderiza componentes | [test_routes.py](../backend/tests/test_routes.py), [financial-utils.test.ts](../frontend/src/lib/financial-utils.test.ts); H14-H16 / R14-R17 |
| «Docker dev equivale al despliegue de producción» | Descartado: recarga, Debugpy y Vite dev son modos de desarrollo | [Dockerfile backend](../backend/Dockerfile), [Dockerfile frontend](../frontend/Dockerfile); H18 / R19 |
| Repetir el riesgo UTC/local como dos hallazgos independientes | Consolidado en H08: la decisión de calendario y su test tienen alcances diferentes, no dos riesgos nuevos | R08 guía la implementación; R15 controla reloj y fixtures |
| «Crear un formateador o eliminar todos los mocks ya» | Reformulado: no es una convención existente ni una tarea autorizada de esta fase | H06/H12; R06 conserva fixtures con propósito explícito y R12 evita tooling/reformatting no acordados |

## Reglas propuestas

Cada regla incluye el hecho observado que la motiva. Son normas para cambios futuros; no significan que el comportamiento existente ya las cumpla en todos los casos.

### Arquitectura y límites entre capas

1. **Mantén las reglas financieras independientes de HTTP y de React.** Añade cálculos puros a utilidades o módulos de dominio testeables y deja que rutas/componentes orquesten y presenten el resultado. **Hecho:** los cálculos del frontend ya están aislados en `frontend/src/lib/financial-utils.ts`, mientras que `backend/app/routes.py` mezcla lógica de dominio y endpoints; esa mezcla es un límite a mejorar al crecer el backend.
2. **Extrae la lógica compartida antes de añadir otra variante de endpoint.** Las rutas por tipo de negocio deben reutilizar una función común de filtrado/selección. **Hecho:** `/api/metrics/b2b` y `/api/metrics/b2c` tienen implementaciones paralelas en `backend/app/routes.py`.
3. **Conserva componentes de presentación reutilizables y sus estados.** Los gráficos y tarjetas deben recibir datos por props; la carga/API permanece en el nivel de página o en una capa de datos compartida. Reutiliza Card, Skeleton, `cn` y tokens existentes y preserva carga, vacío y error al modificar la pieza correspondiente. **Hecho:** [App.tsx](../frontend/src/App.tsx) prepara datos y error; [kpi-card.tsx](../frontend/src/components/dashboard/kpi-card.tsx) usa primitivas y `cn`, y [profit-percent-chart.tsx](../frontend/src/components/dashboard/profit-percent-chart.tsx) tiene ramas de carga/vacío.

### Contratos y cálculos

4. **Al cambiar un campo o valor del contrato, actualiza backend, frontend y pruebas en el mismo cambio.** Mantén alineados los `Literal` del backend y las uniones/interfases de TypeScript. **Hecho:** las categorías y tipos de operación se declaran independientemente en `backend/app/routes.py` y `frontend/src/lib/financial-types.ts`.
5. **Trata la precisión monetaria como una decisión explícita; no introduzcas más cálculos con `float` sin evaluar el impacto.** Si se adopta otra representación, documenta y prueba redondeo, serialización y formato en ambos lados. **Hecho:** el backend acumula importes `float` y redondea resultados en `backend/app/routes.py`; el frontend agrega valores `number` sin redondeo en `financial-utils.ts`.
6. **Distingue la fuente activa de las fixtures de demostración.** Conserva fixtures locales cuando tengan un propósito explícito, pero no las presentes como equivalentes al dataset API ni como fallback de una carga fallida sin un modo offline acordado. **Hecho:** existen `generate_mock_movements` y [mock-data.ts](../frontend/src/lib/mock-data.ts), pero [App.tsx](../frontend/src/App.tsx) obtiene los datos de `/api/metrics`.
7. **No alteres estado aleatorio global para producir datos deterministas.** Prefiere un generador local con semilla o inyección de la fuente aleatoria. **Hecho:** `generate_mock_movements(seed=42)` llama a `random.seed(seed)` en `backend/app/routes.py`, modificando el RNG global.

### Fechas y localización

8. **Maneja las fechas API como fechas de calendario, no como instantes locales implícitos.** Al convertir `YYYY-MM-DD` en frontend, usa una estrategia UTC o parseo explícito de año/mes/día y añade pruebas en zonas horarias distintas. **Hecho:** `computeMonthlyData` usa `new Date(m.create_date)` y getters locales en `frontend/src/lib/financial-utils.ts`.
9. **Deriva el periodo mostrado de los datos o de filtros reales; evita rótulos estáticos que puedan quedar obsoletos.** **Hecho:** `App.tsx` muestra `2024 - Full Year`, pero `backend/app/routes.py` genera fechas relativas al año actual.
10. **Centraliza y documenta locale, moneda y lenguaje de interfaz antes de ampliar la localización.** No mezcles cambios parciales de moneda/locale en componentes aislados. **Hecho:** `financial-utils.ts` fija `en-US`/`USD`, la interfaz contiene textos en inglés y el proyecto mantiene un README español.

### Naming, estilo y tipos

11. **Sigue el naming y los imports de la carpeta modificada.** Usa `snake_case` en funciones Python, kebab-case en archivos de componentes dashboard y `PascalCase` en componentes/modelos; conserva las excepciones de las entradas. Usa alias o imports relativos como los vecinos y, si cambias `@`, actualiza ambos resolutores. **Hecho:** [kpi-row.tsx](../frontend/src/components/dashboard/kpi-row.tsx) y [routes.py](../backend/app/routes.py) muestran esos patrones; [vite.config.ts](../frontend/vite.config.ts) y [tsconfig.app.json](../frontend/tsconfig.app.json) configuran `@`, y `App.tsx` no usa kebab-case.
12. **Conserva el formato local y evita reformatting incidental.** No impongas comillas/punto y coma globales ni introduzcas un formateador sin acuerdo y un cambio específico de tooling. **Hecho:** coexisten estilos distintos en [App.tsx](../frontend/src/App.tsx), `financial-utils.ts`, [dashboard-header.tsx](../frontend/src/components/dashboard/dashboard-header.tsx) y `mock-data.ts`; [eslint.config.js](../frontend/eslint.config.js) no fija esas opciones.
13. **No debilites los chequeos TypeScript existentes para silenciar errores puntuales.** Corrige tipos/imports o explica una excepción localizada. **Hecho:** `frontend/tsconfig.app.json` habilita comprobaciones de variables y parámetros no usados y de fallthrough.

### Testing y validación

14. **Añade o modifica pruebas junto con cualquier cambio de regla financiera, filtro, periodo o contrato.** Para cálculos, cubre entradas límite; para endpoints, verifica tanto el esquema como el comportamiento del filtro. **Hecho:** `backend/tests/test_routes.py` y `frontend/src/lib/financial-utils.test.ts` ya prueban filtros y agregaciones, y `package.json`/`requirements.txt` proporcionan los runners.
15. **Controla reloj y zona horaria en pruebas de fechas.** Usa fixtures de calendario fijas para límites de mes/año y ejecuta el mismo caso en UTC y una zona con offset negativo cuando pase de ISO a `Date`. Si pruebas la generación, controla la fecha de referencia: una semilla no fija `date.today()`. **Hecho:** [financial-utils.test.ts](../frontend/src/lib/financial-utils.test.ts) cubre diciembre/enero, pero no UTC/local; [routes.py](../backend/app/routes.py) usa `date.today()`.
16. **Ejecuta los chequeos del área afectada y registra su resultado real.** Desde la raíz usa `npm --prefix frontend test`, `npm --prefix frontend run lint` y `npm --prefix frontend run build` para cambios frontend; para backend, el comando pytest contrastado en el roadmap. Empieza por el test más pequeño del comportamiento; no repitas checks de producto por cambios solo documentales. **Hecho:** [package.json](../frontend/package.json) define los scripts y [ROADMAP.md](ROADMAP.md) registra `uv run --no-project --python 3.13 --with-requirements backend/requirements.txt pytest backend/tests/test_routes.py -q`; Compose no sustituye esas validaciones.
17. **Limita cada afirmación de validación al comportamiento probado.** En el informe de un cambio identifica tests/comandos, resultado y límites; no declares UI validada por tests de utilidades ni exactitud numérica por presencia de campos o HTTP 200. **Hecho:** [financial-utils.test.ts](../frontend/src/lib/financial-utils.test.ts) no renderiza React y el test semanal en [test_routes.py](../backend/tests/test_routes.py) solo comprueba respuesta exitosa y payload no vacío.

### Configuración y seguridad

18. **No despliegues la configuración CORS amplia actual con credenciales en un entorno que maneje datos reales.** Sustituye el comodín por orígenes permitidos explícitos desde configuración y valida la política con una prueba/configuración de despliegue. **Hecho:** `backend/app/main.py` combina `allow_origins=["*"]` con `allow_credentials=True`.
19. **Distingue desarrollo/producción y host/contenedor al cambiar ejecución.** No uses los Dockerfiles dev como garantía de producción; un despliegue requiere su configuración específica sin recarga/Debugpy y con build/servidor adecuado. Si cambias destino o puerto de la API, revisa Compose y el proxy: el hostname `backend` no equivale a localhost del host. **Hecho:** [Dockerfile backend](../backend/Dockerfile) usa Debugpy/recarga, [Dockerfile frontend](../frontend/Dockerfile) Vite dev y [vite.config.ts](../frontend/vite.config.ts) apunta a `backend:8000`.
20. **Mantén coherentes `package.json` y `package-lock.json`; usa instalación reproducible en build/CI.** **Hecho:** `frontend/package-lock.json` está versionado y `frontend/Dockerfile` usa `npm install`.
21. **No añadas secretos al repositorio.** Configura valores por entorno y actualiza `.env.example` con nombres y descripción de valores no secretos cuando cambie la configuración. **Hecho:** `.gitignore` excluye `.env` y permite `!.env.example`; el README y `frontend/.env.example` documentan `VITE_API_BASE_URL`.

### Documentación y trabajo con agentes

22. **Antes de modificar código o documentos, cumple las instrucciones de `AGENTS.md` y comprueba si existen las carpetas que referencia.** No inventes reglas o memoria de agentes si los archivos no están presentes; solicita o documenta su creación según la tarea. **Hecho:** `AGENTS.md` requiere revisar `.agents/rules`, `.agents/skills` y `memory-bank`, ausentes en la raíz inspeccionada.
23. **Actualiza ambos README cuando cambie la experiencia de arranque, configuración o estructura esperada de agentes.** Conserva equivalencia de pasos y comandos entre idiomas. **Hecho:** `README.md` y `README.es.md` replican las instrucciones y la configuración Vite/API en inglés y español.
24. **Guarda documentación de arquitectura, convenciones y validación en `docs/`, con enlaces relativos válidos.** Revisa documentos relacionados si cambia un flujo que describen. **Hecho:** `docs/ROADMAP.md` enlaza documentos en `docs/validations/`, y los README enlazan entre sí.

## Alcance, prioridad y validación propuesta por regla

La justificación y guía de cada `Rxx` son las de la regla numerada correspondiente; su hecho verificable está enlazado también en la tabla H01-H23. Esta matriz completa nombre, alcance, consecuencia priorizada, tarea pequeña y resultado de cumplimiento, sin crear otra copia de la regla.

**Prioridades para seleccionar tareas, no compromisos de producto:** **P1** si afecta números/fechas, contrato, exposición de datos o evidencia de aceptación; **P2** si facilita deriva de implementación, ejecución o mantenimiento; **P3** si afecta principalmente naming/presentación sin cambio de contrato. La selección de las reglas que se activarán se acuerda en fase 3.

**Comandos de referencia:** desde la raíz, `npm --prefix frontend test -- src/lib/financial-utils.test.ts`, `npm --prefix frontend run lint` y `npm --prefix frontend run build`; backend: `uv run --no-project --python 3.13 --with-requirements backend/requirements.txt pytest backend/tests/test_routes.py -q`. Usar los runners existentes, instalando/restaurando solo si falta una dependencia; no introducir otro manifiesto. Para tareas nuevas seleccionar su test específico y registrar antes/después cuando se corrija un defecto. Los checks HTTP/UI/Compose se ejecutan únicamente cuando la tarea los requiere y sin interferir con servicios ajenos.

| Regla / nombre | Alcance y prioridad motivada | Tarea pequeña propuesta para fase 3 | Check y resultado requerido |
| --- | --- | --- | --- |
| R01 / Cálculo fuera de transporte | Helpers en backend y `financial-utils.ts`; P2 por duplicación en handlers/JSX. H01 | En un cambio autorizado de margen, reutilizar el helper existente sin fórmulas en la tarjeta | Test numérico de ingresos 100/gastos 25 devuelve beneficio 75/margen 75%; diff de la tarjeta solo recibe/formatea props |
| R02 / Filtros compartidos | Rutas B2B/B2C en `routes.py`; P2 por variantes divergentes. H02 | Compartir la selección por negocio de B2B/B2C sin modificar sus query params | Tests con ambas variantes, categoría/operación y fechas de borde: mismos movimientos y orden que antes; ninguna ruta gana filtros implícitos |
| R03 / Primitivas y estados UI | Página, tarjetas, gráficos, `utils.ts` y tema; P2 por pérdida de estados. H03 | Cambiar el helper text de una tarjeta reutilizando Card/Skeleton/tokens | Lint/build; comprobar carga, datos y métricas nulas de la tarjeta, y que el error de página no se oculta; registrar evidencia visual sin afirmar nuevos estados correctos por defecto |
| R04 / Contrato coordinado | Modelos/query params API y tipos usados por cliente; P1 por incompatibilidad. H04 | En un incremento autorizado que consuma un filtro, alinear handler, tipo cliente y llamada | TestClient verifica valores y literal inválido (422); test/build cliente verifica el campo consumido; no afirmar que `/api/metrics` admite `business_type` si no se implementa |
| R05 / Precisión monetaria | Acumulación/serialización y formatos financieros; P1 por totales divergentes. H05 | Documentar y probar la política de redondeo de un total con importes decimales antes de cambiar su representación | Caso 0.10 + 0.20, gastos 0.10: resultado monetario 0.20 según política acordada; comparar salida API, cálculo cliente y formato, diferenciando precisión interna de visualización |
| R06 / Fuente activa y fixtures | Fetch de `App.tsx`, mock backend y fixture cliente; P2 por datos sustituidos silenciosamente. H06 | Añadir propósito explícito a la fixture local sin conectarla al fetch | Diff/imports confirman que la página sigue consumiendo API; respuesta no OK mantiene error y no muestra el dataset local como carga exitosa |
| R07 / RNG local | Generador y `_build_movement`; P2 por estado global compartido. H07 | Inyectar un RNG local con semilla en la generación mock | Con reloj controlado, misma semilla produce mismos 360 movimientos ordenados; `random.getstate()` externo es igual antes/después de generar |
| R08 / Calendario explícito | Parseo y claves año-mes en `financial-utils.ts`; P1 por desplazamiento de mes. H08 | Sustituir el parseo local implícito por calendario explícito sin alterar la etiqueta acordada | Mismo fixture `2026-01-01` y `2025-12-31` en UTC y `America/Los_Angeles` produce dos meses correctos en orden, con totales idénticos |
| R09 / Periodo derivado | `App.tsx` y default de `dashboard-header.tsx`; P1 por rótulo contradictorio. H09 | Derivar el rótulo de extremos del dataset e impedir fallback fijo de 2024 | Fixture diciembre 2025/enero 2026 muestra ese intervalo; dataset vacío no afirma un año completo; comprobar cabecera y llamada con fixture |
| R10 / Locale y moneda acordados | Formatters y texto UI; P3 por presentación inconsistente. H10 | Unificar el tooltip porcentual con `formatPercent` sin cambiar locale/moneda | 15.555 se muestra `15.6%` igual en tarjeta/tooltip; formato USD existente no cambia; cualquier migración de idioma/moneda requiere acuerdo aparte |
| R11 / Naming e imports locales | Funciones Python, dashboard y resolutores Vite/TS; P3 por naming, P2 si cambia resolución. H11 | Cambiar un import de dashboard siguiendo sus vecinos sin renombrar la entrada | Lint/build resuelven el import; Vite/TS siguen apuntando `@` a `src`; diff no renombra `App.tsx` para imponer kebab-case |
| R12 / Formato sin ruido | Archivos TS/TSX tocados y configuración ESLint; P3 por diffs incidentales. H12 | Modificar un texto en un componente conservando comillas/punto y coma locales | Diff contiene solo la modificación necesaria; no hay reformatting global ni paquetes nuevos; lint del área no introduce errores |
| R13 / Checks TypeScript preservados | `tsconfig.app.json` y tipos/imports afectados; P2 por debilitamiento de controles. H13 | Eliminar un import sin uso en el incremento que lo deja obsoleto | Build pasa con `noUnusedLocals`, `noUnusedParameters` y `noFallthroughCasesInSwitch` conservados; no añadir casts para ocultar el error ni declarar `strict` activo sin cambio explícito |
| R14 / Test de comportamiento | Tests API y utilidades; P1 por falsa aceptación financiera. H14 | Fortalecer un test de resumen para verificar ingresos/gastos/net con fixture pequeña | Datos ingresos 100/gastos 25 dan net 75; el test falla ante una fórmula incorrecta aunque los campos y HTTP 200 permanezcan iguales |
| R15 / Reloj y fixtures temporales | Tests de generación y agregación; P1 por resultados dependientes de fecha/zona. H08 | Añadir fixtures de primer día de mes y controlar hoy al probar el generador | Expectativas de borde diciembre/enero idénticas en UTC y zona negativa; fecha de referencia inyectada/congelada restaurada al terminar; no derivar año de la semilla |
| R16 / Runner y salida real | Scripts/frontend y comando pytest del roadmap; P2 por validación omitida. H15 | En una corrección de cálculo, ejecutar el test enfocado y los checks del área afectada | Registrar comando, salida/exit code y resultado; no declarar un check pasado sin ejecutarlo; documentos solos no disparan suites por rutina |
| R17 / Evidencia con límites | Registro de validación de cada incremento; P1 por conclusiones no demostradas. H16 | Describir qué demuestra y qué no el test semanal de resumen existente | Informe cita el nombre del test y sus asserts; indica que payload no vacío no demuestra filtro numérico ni UI; cada nueva afirmación apunta a su check específico |
| R18 / CORS por entorno | Middleware/configuración de despliegue; P1 por exposición. H17 | En un cambio autorizado de despliegue, configurar orígenes explícitos | Preflight de origen permitido obtiene su cabecera de autorización; el no permitido no obtiene `Access-Control-Allow-Origin`; no combinar wildcard con una política de credenciales declarada segura |
| R19 / Ejecución y red explícitas | Dockerfiles, Compose y proxy; P2 por arranque no equivalente. H18 | Explicar en la guía la diferencia entre proxy Compose y API desde host sin cambiar puertos | Documento coincide con `backend:8000`, puertos 8000/5678 y Vite 5173; si cambia configuración, validar Compose y HTTP del flujo afectado; no tratar Vite dev como build de producción |
| R20 / Lockfile reproducible | Manifiesto/lockfile y futuro build/CI; P2 por resolución cambiante. H19 | En un cambio específico de build, sustituir instalación frontend por `npm ci` | Instalación limpia con manifiesto/lockfile acordes y build posterior; lockfile no cambia durante `ci`; no reinstalar el entorno actual para demostrar una propuesta documental |
| R21 / Ejemplos sin secretos | `.gitignore`, variables frontend y configuración; P1 por valores sensibles versionados. H20 | Aclarar el scope de `.env.example` sin incluir valores reales | Diff/staged contiene solo nombres/descripciones no sensibles; `git check-ignore` excluye `.env` y no el ejemplo; revisar además archivos ya versionados, no confiar solo en ignore |
| R22 / Instrucciones y ausencia | `AGENTS.md` y ubicaciones locales indicadas; P2 por contexto inventado. H21 | Comenzar una tarea registrando qué instrucciones y carpetas existen | Nombrar archivos leídos o ausencia comprobada; no declarar reglas/skills/memoria cargados si faltan; demostrar carga real únicamente al implementarla en fase 3 |
| R23 / Arranque bilingüe | Ambos README y configuración proxy/entorno; P2 por guías divergentes. H22 | Precisar en ambos idiomas que el hostname backend corresponde a Compose | Dos README describen el mismo comando, puertos y override; ejemplo sitúa `.env` en frontend; contraste con `vite.config.ts` y Compose, no afirmación runtime sin HTTP |
| R24 / Fuente documental canónica | `docs/`, roadmap y registros; P2 por enlaces/estado obsoletos. H23 | Enlazar este informe en el roadmap y actualizar hitos con evidencia | Enlaces locales existen, tabla de hitos apunta al entregable real y hash contrastado; aprobación, commit y merge tienen estados independientes |

**Sin duplicados normativos:** R01 trata ubicación del cálculo y R03 composición/estados; R08 define calendario y R15 pruebas/reloj; R14 exige asserts del comportamiento y R17 limita los claims del informe; R19 distingue modos/red y R20 instalación; R23 mantiene guías bilingües y R24 trazabilidad documental. Se pueden agrupar al activar reglas en fase 3, sin ejecutar tareas de producto durante fase 2.

## PHASE2-CLOSE-01: aprobación y evidencia documental

Fecha: 2026-11-13. Responsable de análisis y comprobaciones: agente. Responsable de aprobación: mantenedor.

| Criterio del roadmap | Evidencia de esta entrega |
| --- | --- |
| 2.1 Extraer convenciones | Hallazgos por categoría y H01-H23: cada hecho tiene archivo/comportamiento y consecuencia para contribuciones |
| 2.2 Filtrar | Tabla de 12 decisiones explícitas de descarte/reformulación; distingue convención, limitación y propuesta |
| 2.3 Agrupar | Categorías del informe; matriz R01-R24 con alcance y prioridad motivada; límites entre reglas relacionados explícitos |
| 2.4 Proponer reglas comprobables | 24 reglas con hecho/justificación/guía y 24 filas con nombre, alcance, tarea pequeña y resultado de check |
| 2.5 Revisar con el mantenedor | Aprobación expresa en el formulario del chat: «Aprobar las 24 reglas como propuestas y registrar el cierre documental»; sin observaciones |
| Commit de contenido final | [d1f27fa3c9b2a83ea32ab3023353fe198e9735fc](https://github.com/EricDevs/ai-eng-financial-dashboard-context-project/commit/d1f27fa3c9b2a83ea32ab3023353fe198e9735fc), `docs: derive repository engineering rules (phase 2)`, modifica solo este informe; hash contrastado después de crear el commit y registrado también en el [control de cierre del roadmap](ROADMAP.md#7-control-final-y-registro-de-cierre). `db1285c` es el incremento inicial, no el cierre de estos criterios ampliados |
| Integración | [PR #2](https://github.com/EricDevs/ai-eng-financial-dashboard-context-project/pull/2) abierta; esta aprobación documental no autoriza merge, limpieza de rama ni tareas de producto |

Comprobaciones realizadas por el agente: lectura de los hechos en código/configuración; control estructural PowerShell de 24 reglas numeradas con `Hecho`, 24 filas únicas R01-R24 y 23 hallazgos H01-H23; resolución de enlaces relativos con `Test-Path`; `git diff --check` sin errores. No se ejecutaron suites, lint, build ni tareas de la matriz porque esta fase solo modifica documentación. Los resultados runtime de fase 1 permanecen en su registro histórico y no se atribuyen a esta revisión.

Las 24 propuestas quedan aprobadas para selección y refinamiento en fase 3, no como mejoras ya implementadas. No se activan `.agents/rules`, skills o memoria; no se declara resuelto CORS, precisión, calendario, periodo, estados UI ni despliegue.

## Comprobación rápida para contribuidores

- ¿El contrato actualizado conserva alineación entre los `Literal`/modelos de Pydantic y los tipos TypeScript?
- ¿Las fechas siguen siendo correctas en cambios de mes/año y en una zona horaria distinta de UTC?
- ¿Los cálculos financieros tienen pruebas que fijan la regla y sus límites?
- ¿Se evitó duplicar una ruta o alterar estado global compartido?
- ¿Se revisaron CORS, secretos, proxy y modo de ejecución si se tocó configuración o despliegue?
- ¿Se ejecutaron lint, build y tests del área afectada, y se actualizaron ambos README si cambió el arranque?
