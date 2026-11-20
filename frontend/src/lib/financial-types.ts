export type OperationType = 'income' | 'outcome'
export type Category = 'suppliers' | 'sales' | 'operational' | 'administrative' | 'others'
export type BusinessType = 'B2B' | 'B2C'

export interface FinancialMovement {
  create_date: string // ISO date
  amount: number
  operation_type: OperationType
  category: Category
  business_type: BusinessType
}

export interface KPIMetrics {
  totalIncome: number
  totalOutcome: number
  profit: number
  profitPercent: number
}

export interface MonthlyDataPoint {
  month: string
  income: number
  outcome: number
  profitPercent: number
}

/** Active view of the application. */
export type AppView = 'dashboard' | 'comparison'

/** Row of a group panel: API entry plus the share computed on the client. */
export interface GroupCategoryRow {
  category: Category
  total_amount: number
  /** Part of the group total, from 0 to 1. */
  share: number
}

/** Income total of a group, for the comparison chart. */
export interface GroupTotal {
  business_type: BusinessType
  total_income: number
}
