import { buildQuery } from '@/lib/api'
import { type TopCategoriesResponse } from '@/lib/api-types'
import { type BusinessType, type GroupTotal } from '@/lib/financial-types'
import { type DateBounds, getDateRangeIssue, sumTotals, toGroupRows } from '@/lib/financial-utils'
import { type DateRangeFilter } from '@/lib/param-types'
import { useApiResource } from '@/lib/use-api-resource'
import { GroupComparisonChart } from './group-comparison-chart'
import { GroupTopTable } from './group-top-table'

interface ComparisonPageProps {
  /** Shared date filter; this page has no picker of its own. */
  filter: DateRangeFilter
  /** Facets range, for the single request rule. null if facets did not load. */
  bounds: DateBounds | null
}

/** Route of one group's top income categories, or null when the filter cannot be requested (DEC-26). */
function topPath(filter: DateRangeFilter, bounds: DateBounds | null, businessType: BusinessType): string | null {
  if (getDateRangeIssue(filter, bounds) !== null) return null
  const query = buildQuery({ operation_type: 'income', limit: 5, business_type: businessType, ...filter })
  return `/api/metrics/categories/top${query}`
}

export function ComparisonPage({ filter, bounds }: ComparisonPageProps) {
  const b2b = useApiResource<TopCategoriesResponse>(topPath(filter, bounds, 'B2B'))
  const b2c = useApiResource<TopCategoriesResponse>(topPath(filter, bounds, 'B2C'))
  const loading = b2b.loading || b2c.loading
  const totals: GroupTotal[] = [
    { business_type: 'B2B', total_income: sumTotals(b2b.data ?? []) },
    { business_type: 'B2C', total_income: sumTotals(b2c.data ?? []) },
  ]

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-label="Income by business type"
        aria-busy={loading}
        className="grid grid-cols-1 gap-4 xl:grid-cols-2"
      >
        <GroupTopTable businessType="B2B" rows={toGroupRows(b2b.data ?? [])} loading={b2b.loading} error={b2b.error} />
        <GroupTopTable businessType="B2C" rows={toGroupRows(b2c.data ?? [])} loading={b2c.loading} error={b2c.error} />
      </section>
      <section aria-label="Income comparison" aria-busy={loading}>
        <GroupComparisonChart totals={totals} loading={loading} error={b2b.error || b2c.error} />
      </section>
    </div>
  )
}
