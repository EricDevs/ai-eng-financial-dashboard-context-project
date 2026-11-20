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

/** Active view of the app. */
export type AppView = 'dashboard' | 'comparison'

/** One row of a group panel: API data plus the share computed on the client. */
export interface GroupCategoryRow {
  category: Category
  total_amount: number
  /** Share of the group total, from 0 to 1. */
  share: number
}

/** Total income of one group, for the comparison chart. */
export interface GroupTotal {
  business_type: BusinessType
  total_income: number
}
