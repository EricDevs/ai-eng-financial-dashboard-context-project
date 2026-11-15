/**
 * Tipos de parametros de query para las funcionalidades F1, F2 y F3.
 * Verificados contra http://localhost:8000/openapi.json (ver verification.md).
 * Los nombres coinciden con los parametros de la API (snake_case).
 * Un parametro opcional que no se envia no debe aparecer en la query string.
 */
import type {
  BusinessType,
  OperationType,
} from '../src/lib/financial-types'

/**
 * Filtro de rango de fechas (F1). Se incluye en las peticiones de
 * GET /api/metrics, /api/metrics/alerts y /api/metrics/categories/top.
 * Ambos extremos son inclusivos y opcionales; puede enviarse solo uno
 * (el otro extremo queda abierto) o ninguno (todo el dataset).
 * La API no valida start_date <= end_date: un rango invertido devuelve [].
 */
export interface DateRangeFilter {
  /**
   * Fecha de inicio, inclusive. Formato YYYY-MM-DD (por ejemplo '2026-01-31').
   * Omitir el parametro cuando el input esta vacio: una cadena vacia provoca 422.
   * Una fecha mal formada provoca 422.
   */
  start_date?: string
  /**
   * Fecha de fin, inclusive. Formato YYYY-MM-DD (por ejemplo '2026-01-31').
   * Omitir el parametro cuando el input esta vacio: una cadena vacia provoca 422.
   * Una fecha mal formada provoca 422.
   */
  end_date?: string
}

/**
 * Parametros de GET /api/metrics/alerts (F2): umbral mas filtro de fechas.
 * La UI no envia group_by (la API agrupa por mes por defecto) ni business_type.
 */
export interface AlertsParams extends DateRangeFilter {
  /**
   * Umbral de alerta, como ratio. Solo se devuelven periodos cuyo
   * increase_ratio es mayor que este valor. La API acepta cualquier numero
   * >= 0 (sin maximo) y usa 0.3 si se omite; un valor negativo o no numerico
   * provoca 422. La UI restringe el input al rango 0.01 a 1.0.
   */
  threshold?: number
}

/**
 * Parametros de GET /api/metrics/categories/top (F3): tipo de operacion,
 * limite y filtro de fechas, mas el grupo de negocio.
 */
export interface TopCategoriesParams extends DateRangeFilter {
  /**
   * Tipo de operacion a agregar: 'income' o 'outcome'. El valor por defecto de
   * la API es 'outcome'; la vista B2B vs B2C debe enviar siempre 'income'.
   */
  operation_type?: OperationType
  /**
   * Numero maximo de categorias a devolver. Entero de 1 a 20 (otro valor
   * provoca 422); por defecto 5. Es un maximo, no una garantia: pueden
   * devolverse menos filas.
   */
  limit?: number
  /**
   * Grupo de negocio: 'B2B' o 'B2C'. Sin este parametro se agregan ambos
   * grupos. La vista B2B vs B2C hace una peticion por grupo.
   */
  business_type?: BusinessType
}
