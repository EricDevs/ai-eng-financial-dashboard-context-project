# Overview

Revision: 2026-11-20, cierre de la ampliacion v2 del proyecto 3 (antes: 2026-11-17, proyecto 4). Fuentes primarias: [App.tsx](../frontend/src/App.tsx),
[routes.py](../backend/app/routes.py), [README.md](../README.md) y el
[informe canonico](../docs/validations/03-verification-resume.md) de fase 1.

## Que hace

Dashboard de metricas financieras: cuatro KPI (ingresos, egresos, beneficio,
margen de beneficio), una serie mensual de ingresos/egresos y otra de margen
de beneficio. Implementado en
[App.tsx](../frontend/src/App.tsx) (orquesta fetch, loading y error),
[kpi-row.tsx](../frontend/src/components/dashboard/kpi-row.tsx),
[income-outcome-chart.tsx](../frontend/src/components/dashboard/income-outcome-chart.tsx)
y [profit-percent-chart.tsx](../frontend/src/components/dashboard/profit-percent-chart.tsx).
Desde el proyecto 4 las graficas se cargan en diferido (`React.lazy`) y la UI
anuncia carga y error a tecnologias de asistencia (ver [progress.md](progress.md)).

Desde la ampliacion v2 del proyecto 3 (spec v1.11 en
[frontend/specs](../frontend/specs/README.md)) hay tres funcionalidades mas:
un filtro de rango de fechas compartido (F1,
[date-range-picker.tsx](../frontend/src/components/dashboard/date-range-picker.tsx)),
una tabla de alertas de anomalias con umbral configurable bajo los graficos
(F2, [alerts-table.tsx](../frontend/src/components/dashboard/alerts-table.tsx))
y una segunda pestana `B2B vs B2C` con las categorias de ingreso de cada grupo
y un grafico de dos barras (F3,
[comparison-page.tsx](../frontend/src/components/dashboard/comparison-page.tsx),
cargada en diferido). No hay evidencia de un usuario o cliente real; no se atribuye a ninguno.

## Flujo UI/API

React consulta `GET /api/metrics` (con `start_date` / `end_date` si hay filtro),
`/api/metrics/facets` (rango disponible), `/api/metrics/alerts` (F2) y
`/api/metrics/categories/top` (F3, una peticion por grupo), a traves de la capa
de datos compartida ([api.ts](../frontend/src/lib/api.ts) y
[use-api-resource.ts](../frontend/src/lib/use-api-resource.ts)). Vite reenvia `/api` al servicio backend de
Compose (`http://backend:8000`, no `localhost`), ver
[vite.config.ts](../frontend/vite.config.ts). Los calculos de KPI y
agregacion mensual ocurren en el navegador, en
[financial-utils.ts](../frontend/src/lib/financial-utils.ts), no en el
backend; los porcentajes de F3 tambien. De las ocho rutas analiticas del
backend (facetas, resumen, top categorias, comparacion, alertas, B2B, B2C),
la UI consume facetas, alertas y top categorias; resumen, comparacion, B2B y
B2C siguen sin consumirse. Ver [routes.py](../backend/app/routes.py) y el
[mapa de estructura](../docs/validations/01-structure.md).

## Datos

Sinteticos: `generate_mock_movements(seed=42)` en
[routes.py](../backend/app/routes.py) genera 360 movimientos en memoria por
llamada; no hay base de datos configurada en este repositorio (sin servicio
en [docker-compose.yml](../docker-compose.yml) ni driver/ORM declarado). La
semilla no fija el calendario: el generador usa `date.today()`, por lo que
el rango de fechas devuelto cambia con el reloj real.

## Limite de producto conocido (no corregido)

Sin filtro de fechas, la cabecera muestra el literal fijo `2024 - Full Year`
([App.tsx](../frontend/src/App.tsx),
[dashboard-header.tsx](../frontend/src/components/dashboard/dashboard-header.tsx)),
mientras el backend genera movimientos en anos relativos a la fecha actual.
Rotulo y dataset pueden no coincidir. Con un filtro activo muestra el rango
elegido (F1). La spec lo mantiene como excepcion explicita (DEC-22).
Documentado desde fase 1; su correccion no esta autorizada por este documento.

## No esta implementado o no se ha demostrado

- Persistencia de datos, pipeline de CI y pruebas end-to-end/navegador: no se
  encontraron en los archivos inspeccionados.
- `frontend/src/lib/mock-data.ts` y `frontend/src/assets/hero.png` no tienen
  importacion detectada en el codigo frontend inspeccionado.
- Exactitud numerica de KPI/graficas sobre la respuesta completa (360
  movimientos): no verificada de extremo a extremo: ver
  [status.md](status.md) para el detalle de lo probado.
