# Overview

Revision: 2026-11-13, fase 4. Fuentes primarias: [App.tsx](../frontend/src/App.tsx),
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
No hay evidencia de un usuario o cliente real; no se atribuye a ninguno.

## Flujo UI/API

React consulta `GET /api/metrics`; Vite reenvia `/api` al servicio backend de
Compose (`http://backend:8000`, no `localhost`), ver
[vite.config.ts](../frontend/vite.config.ts). Los calculos de KPI y
agregacion mensual ocurren en el navegador, en
[financial-utils.ts](../frontend/src/lib/financial-utils.ts), no en el
backend. El backend expone ademas ocho rutas analiticas (facetas, resumen,
top categorias, comparacion, alertas, B2B, B2C) que la UI actual no consume;
ver [routes.py](../backend/app/routes.py) y el
[mapa de estructura](../docs/validations/01-structure.md).

## Datos

Sinteticos: `generate_mock_movements(seed=42)` en
[routes.py](../backend/app/routes.py) genera 360 movimientos en memoria por
llamada; no hay base de datos configurada en este repositorio (sin servicio
en [docker-compose.yml](../docker-compose.yml) ni driver/ORM declarado). La
semilla no fija el calendario: el generador usa `date.today()`, por lo que
el rango de fechas devuelto cambia con el reloj real.

## Limite de producto conocido (no corregido)

La cabecera muestra el literal fijo `2024 - Full Year`
([App.tsx](../frontend/src/App.tsx),
[dashboard-header.tsx](../frontend/src/components/dashboard/dashboard-header.tsx)),
mientras el backend genera movimientos en anos relativos a la fecha actual.
Rotulo y dataset pueden no coincidir. Documentado desde fase 1; su correccion
no esta autorizada por este documento.

## No esta implementado o no se ha demostrado

- Persistencia de datos, pipeline de CI y pruebas end-to-end/navegador: no se
  encontraron en los archivos inspeccionados.
- `frontend/src/lib/mock-data.ts` y `frontend/src/assets/hero.png` no tienen
  importacion detectada en el codigo frontend inspeccionado.
- Exactitud numerica de KPI/graficas sobre la respuesta completa (360
  movimientos): no verificada de extremo a extremo: ver
  [status.md](status.md) para el detalle de lo probado.
