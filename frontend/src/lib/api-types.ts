/**
 * Tipos de respuesta de la API para las funcionalidades F1, F2 y F3.
 * Verificados contra http://localhost:8000/openapi.json (ver verification.md).
 * Los nombres de campo son snake_case, igual que la API.
 */
import type {
  BusinessType,
  Category,
  OperationType,
} from './financial-types'

/**
 * Respuesta de GET /api/metrics/facets (schema MetricsFacets).
 * Sin parametros. Todos los campos son obligatorios.
 */
export interface FacetsResponse {
  /** Tipos de operacion disponibles: 'income' | 'outcome'. */
  operation_types: OperationType[]
  /** Grupos de negocio disponibles: 'B2B' | 'B2C'. */
  business_types: BusinessType[]
  /**
   * Categorias del dataset, lista GLOBAL (no por grupo de negocio).
   * Incluye categorias sin ingresos; no sirve para saber que categorias
   * tiene cada grupo B2B o B2C.
   */
  categories: Category[]
  /** Fecha mas antigua del dataset. Formato YYYY-MM-DD. Relativa a la fecha de hoy. */
  min_date: string
  /** Fecha mas reciente del dataset. Formato YYYY-MM-DD. Relativa a la fecha de hoy. */
  max_date: string
}

/**
 * Una alerta de gasto inusual (schema MetricsAlert).
 * Elemento de la respuesta de GET /api/metrics/alerts.
 */
export interface AlertEntry {
  /**
   * Periodo de la alerta. Formato YYYY-MM, porque la UI no envia group_by
   * y la API agrupa por mes por defecto.
   */
  period: string
  /** Gasto total (outcome) del periodo, en unidades monetarias. Redondeado a 2 decimales. */
  outcome_total: number
  /**
   * Promedio del gasto de TODOS los periodos anteriores dentro del rango
   * filtrado (no una media movil de 3 periodos). Redondeado a 2 decimales.
   */
  baseline_average: number
  /**
   * Incremento relativo sobre baseline_average, como RATIO (0.5917 = +59,17 %),
   * no como porcentaje. Siempre mayor que el threshold enviado. Redondeado a 4 decimales.
   */
  increase_ratio: number
}

/**
 * Respuesta de GET /api/metrics/alerts: array de AlertEntry, ordenado por periodo.
 * Array vacio ([]) cuando ningun periodo supera el umbral o hay un solo periodo;
 * la API responde 200, no un error.
 */
export type AlertsResponse = AlertEntry[]

/**
 * Total de una categoria (schema TopCategoryItem).
 * Elemento de la respuesta de GET /api/metrics/categories/top.
 */
export interface CategoryEntry {
  /** Categoria del movimiento. */
  category: Category
  /** Tipo de operacion por el que se agrego; igual al operation_type enviado. */
  operation_type: OperationType
  /** Suma de importes de la categoria, en unidades monetarias. Redondeado a 2 decimales. */
  total_amount: number
}

/**
 * Respuesta de GET /api/metrics/categories/top: array de CategoryEntry,
 * ordenado de mayor a menor total_amount. Tiene como maximo `limit` elementos
 * (y menos si hay menos categorias con movimientos); [] si no hay datos.
 * No incluye porcentajes ni el total del grupo.
 */
export type TopCategoriesResponse = CategoryEntry[]
