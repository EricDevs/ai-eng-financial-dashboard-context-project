# 04 - Conventions

## Objetivo y alcance

Este documento recoge convenciones que ya se observan en el repositorio y riesgos concretos que conviene tener presentes al modificarlo. Las reglas propuestas se basan en archivos o comportamientos existentes; no presuponen que una práctica observada sea automáticamente adecuada para todo cambio.

**Ámbito inspeccionado:** `backend/`, `frontend/`, `docs/`, los dos `README`, `AGENTS.md`, `docker-compose.yml` y las configuraciones de lint, TypeScript y ejecución. Se excluyeron dependencias instaladas y artefactos generados.

## Convenciones y hallazgos por categoría

### Arquitectura y límites entre capas

- El backend expone FastAPI desde `backend/app/main.py` y registra un router definido en `backend/app/routes.py`. Los modelos Pydantic, las funciones de generación/filtrado/agregación de datos y las rutas HTTP residen actualmente juntos en `routes.py`.
- El frontend organiza componentes en `frontend/src/components/dashboard/` y `frontend/src/components/ui/`; los tipos y los cálculos puros están en `frontend/src/lib/financial-types.ts` y `financial-utils.ts`.
- `frontend/src/App.tsx` obtiene los movimientos y calcula los KPI y la serie mensual antes de pasar datos a los componentes de presentación. Los componentes de gráficos reciben datos y estado `loading` mediante props.
- Las rutas `/api/metrics/b2b` y `/api/metrics/b2c` en `backend/app/routes.py` repiten la selección por tipo de negocio, el filtrado y el ordenamiento.

### Contratos y datos financieros

- Los valores permitidos para `operation_type`, `category`, `business_type` y `group_by` están limitados mediante `Literal` en `backend/app/routes.py` y uniones de tipos en `frontend/src/lib/financial-types.ts`.
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
- Los nombres de archivos y componentes React usan kebab-case para archivos (`kpi-row.tsx`) y `PascalCase` para componentes exportados (`KPIRow`).
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

- `AGENTS.md` instruye revisar `.agents/rules`, `.agents/skills` y `memory-bank` antes de actuar. Esas carpetas no están presentes actualmente en la raíz inspeccionada; las instrucciones solo serán aplicables cuando se creen.
- `README.md` y `README.es.md` ofrecen instrucciones equivalentes en inglés y español, incluidos comandos de arranque y estructura esperada de `.agents/`.
- `docs/ROADMAP.md` y `docs/validations/` contienen documentación de handover y validaciones. Al añadir documentos de proyecto, usar `docs/` y enlazarlos desde el índice o documento relacionado cuando corresponda.

## Reglas propuestas

Cada regla incluye el hecho observado que la motiva. Son normas para cambios futuros; no significan que el comportamiento existente ya las cumpla en todos los casos.

### Arquitectura y límites entre capas

1. **Mantén las reglas financieras independientes de HTTP y de React.** Añade cálculos puros a utilidades o módulos de dominio testeables y deja que rutas/componentes orquesten y presenten el resultado. **Hecho:** los cálculos del frontend ya están aislados en `frontend/src/lib/financial-utils.ts`, mientras que `backend/app/routes.py` mezcla lógica de dominio y endpoints; esa mezcla es un límite a mejorar al crecer el backend.
2. **Extrae la lógica compartida antes de añadir otra variante de endpoint.** Las rutas por tipo de negocio deben reutilizar una función común de filtrado/selección. **Hecho:** `/api/metrics/b2b` y `/api/metrics/b2c` tienen implementaciones paralelas en `backend/app/routes.py`.
3. **Conserva la separación entre componentes de presentación y preparación de datos del dashboard.** Los gráficos y tarjetas deben recibir datos por props, y la carga/API debe permanecer en el nivel de página o en una capa de datos compartida. **Hecho:** `App.tsx` carga y transforma datos y `IncomeOutcomeChart`, `ProfitPercentChart` y `KPIRow` reciben props.

### Contratos y cálculos

4. **Al cambiar un campo o valor del contrato, actualiza backend, frontend y pruebas en el mismo cambio.** Mantén alineados los `Literal` del backend y las uniones/interfases de TypeScript. **Hecho:** las categorías y tipos de operación se declaran independientemente en `backend/app/routes.py` y `frontend/src/lib/financial-types.ts`.
5. **Trata la precisión monetaria como una decisión explícita; no introduzcas más cálculos con `float` sin evaluar el impacto.** Si se adopta otra representación, documenta y prueba redondeo, serialización y formato en ambos lados. **Hecho:** el backend acumula importes `float` y redondea resultados en `backend/app/routes.py`; el frontend agrega valores `number` sin redondeo en `financial-utils.ts`.
6. **Usa una sola fuente de verdad para datos de demostración cuando el flujo activo consuma la API.** Si se conserva una fixture local para tests o modo offline, aclara su propósito y evita presentarla como equivalente sin verificarlo. **Hecho:** existen `generate_mock_movements` y `frontend/src/lib/mock-data.ts`, pero `App.tsx` obtiene los datos de `/api/metrics`.
7. **No alteres estado aleatorio global para producir datos deterministas.** Prefiere un generador local con semilla o inyección de la fuente aleatoria. **Hecho:** `generate_mock_movements(seed=42)` llama a `random.seed(seed)` en `backend/app/routes.py`, modificando el RNG global.

### Fechas y localización

8. **Maneja las fechas API como fechas de calendario, no como instantes locales implícitos.** Al convertir `YYYY-MM-DD` en frontend, usa una estrategia UTC o parseo explícito de año/mes/día y añade pruebas en zonas horarias distintas. **Hecho:** `computeMonthlyData` usa `new Date(m.create_date)` y getters locales en `frontend/src/lib/financial-utils.ts`.
9. **Deriva el periodo mostrado de los datos o de filtros reales; evita rótulos estáticos que puedan quedar obsoletos.** **Hecho:** `App.tsx` muestra `2024 - Full Year`, pero `backend/app/routes.py` genera fechas relativas al año actual.
10. **Centraliza y documenta locale, moneda y lenguaje de interfaz antes de ampliar la localización.** No mezcles cambios parciales de moneda/locale en componentes aislados. **Hecho:** `financial-utils.ts` fija `en-US`/`USD`, la interfaz contiene textos en inglés y el proyecto mantiene un README español.

### Naming, estilo y tipos

11. **Sigue el naming establecido por lenguaje: `snake_case` en Python, kebab-case para archivos React y `PascalCase` para componentes y modelos.** **Hecho:** `backend/app/routes.py`, `frontend/src/components/dashboard/kpi-row.tsx` y `KPIRow`/`MetricsSummaryItem` muestran estos patrones.
12. **Antes de crear nuevas reglas de estilo, define y ejecuta un único formato para el frontend; evita corregir archivos existentes de forma incidental.** En cambios nuevos, conserva el formato del archivo tocado hasta que el proyecto adopte un formateador automatizado. **Hecho:** coexisten comillas dobles/con punto y coma y comillas simples/sin punto y coma en `frontend/src/App.tsx`, `financial-utils.ts`, `dashboard-header.tsx` y `mock-data.ts`; ESLint no fija esas opciones.
13. **No debilites los chequeos TypeScript existentes para silenciar errores puntuales.** Corrige tipos/imports o explica una excepción localizada. **Hecho:** `frontend/tsconfig.app.json` habilita comprobaciones de variables y parámetros no usados y de fallthrough.

### Testing y validación

14. **Añade o modifica pruebas junto con cualquier cambio de regla financiera, filtro, periodo o contrato.** Para cálculos, cubre entradas límite; para endpoints, verifica tanto el esquema como el comportamiento del filtro. **Hecho:** `backend/tests/test_routes.py` y `frontend/src/lib/financial-utils.test.ts` ya prueban filtros y agregaciones, y `package.json`/`requirements.txt` proporcionan los runners.
15. **Las pruebas de fechas deben cubrir límites de año y zonas horarias cuando el código pase entre fecha ISO y `Date`.** **Hecho:** la prueba frontend cubre diciembre/enero, pero no la interpretación UTC/local identificada en `financial-utils.ts`.
16. **Ejecuta los chequeos del área afectada antes de dar por terminado un cambio:** `npm test`, `npm run lint` y `npm run build` para frontend; pytest para backend. **Hecho:** `frontend/package.json` define esos scripts y `backend/requirements.txt` incluye `pytest`; la documentación de arranque describe Docker, pero no sustituye esas validaciones.
17. **No aumentes la cobertura asumida por el inventario actual.** Si agregas componentes o rutas, crea pruebas para los comportamientos nuevos; la presencia de pruebas de utilidades no valida automáticamente la UI. **Hecho:** el test frontend actual es `financial-utils.test.ts`; las pruebas backend están en `test_routes.py`.

### Configuración y seguridad

18. **No despliegues la configuración CORS amplia actual con credenciales en un entorno que maneje datos reales.** Sustituye el comodín por orígenes permitidos explícitos desde configuración y valida la política con una prueba/configuración de despliegue. **Hecho:** `backend/app/main.py` combina `allow_origins=["*"]` con `allow_credentials=True`.
19. **Trata las imágenes Docker actuales como configuración de desarrollo, no como receta de producción.** Antes de usarlas para despliegue, crea una configuración de producción con dependencias reproducibles, sin recarga/debugpy y con un servidor/build adecuado. **Hecho:** `backend/Dockerfile` ejecuta `debugpy` y `uvicorn --reload`; `frontend/Dockerfile` ejecuta Vite dev y `npm install`.
20. **Mantén coherentes `package.json` y `package-lock.json`; usa instalación reproducible en build/CI.** **Hecho:** `frontend/package-lock.json` está versionado y `frontend/Dockerfile` usa `npm install`.
21. **No añadas secretos al repositorio.** Configura valores por entorno y actualiza `.env.example` con nombres y descripción de valores no secretos cuando cambie la configuración. **Hecho:** `.gitignore` excluye `.env` y permite `!.env.example`; el README y `frontend/.env.example` documentan `VITE_API_BASE_URL`.

### Documentación y trabajo con agentes

22. **Antes de modificar código o documentos, cumple las instrucciones de `AGENTS.md` y comprueba si existen las carpetas que referencia.** No inventes reglas o memoria de agentes si los archivos no están presentes; solicita o documenta su creación según la tarea. **Hecho:** `AGENTS.md` requiere revisar `.agents/rules`, `.agents/skills` y `memory-bank`, ausentes en la raíz inspeccionada.
23. **Actualiza ambos README cuando cambie la experiencia de arranque, configuración o estructura esperada de agentes.** Conserva equivalencia de pasos y comandos entre idiomas. **Hecho:** `README.md` y `README.es.md` replican las instrucciones y la configuración Vite/API en inglés y español.
24. **Guarda documentación de arquitectura, convenciones y validación en `docs/`, con enlaces relativos válidos.** Revisa documentos relacionados si cambia un flujo que describen. **Hecho:** `docs/ROADMAP.md` enlaza documentos en `docs/validations/`, y los README enlazan entre sí.

## Comprobación rápida para contribuidores

- ¿El contrato actualizado conserva alineación entre los `Literal`/modelos de Pydantic y los tipos TypeScript?
- ¿Las fechas siguen siendo correctas en cambios de mes/año y en una zona horaria distinta de UTC?
- ¿Los cálculos financieros tienen pruebas que fijan la regla y sus límites?
- ¿Se evitó duplicar una ruta o alterar estado global compartido?
- ¿Se revisaron CORS, secretos, proxy y modo de ejecución si se tocó configuración o despliegue?
- ¿Se ejecutaron lint, build y tests del área afectada, y se actualizaron ambos README si cambió el arranque?
