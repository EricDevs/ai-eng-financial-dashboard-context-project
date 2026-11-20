import { GroupComparisonChart } from '@/components/dashboard/group-comparison-chart'
import { GroupTopTable } from '@/components/dashboard/group-top-table'
import { buildQuery } from '@/lib/api'
import type { TopCategoriesResponse } from '@/lib/api-types'
import type { BusinessType } from '@/lib/financial-types'
import { getDateRangeIssue, sumTotals, toGroupRows, type DateBounds } from '@/lib/financial-utils'
import type { DateRangeFilter } from '@/lib/param-types'
import { useApiResource } from '@/lib/use-api-resource'

interface ComparisonPageProps {
  /** Shared date filter; the page has no picker of its own. */
  filter: DateRangeFilter
  /** Dataset range from facets, for the single request rule. null if facets did not load. */
  bounds: DateBounds | null
}

function topPath(businessType: BusinessType, filter: DateRangeFilter): string {
  return (
    '/api/metrics/categories/top' +
    buildQuery({
      operation_type: 'income',
      limit: 5,
      business_type: businessType,
      start_date: filter.start_date,
      end_date: filter.end_date,
    })
  )
}

/** B2B vs B2C view: requests both groups in parallel and composes the panels and the chart. */
export function ComparisonPage({ filter, bounds }: ComparisonPageProps) {
  const canRequest = getDateRangeIssue(filter, bounds) === null
  const b2b = useApiResource<TopCategoriesResponse>(canRequest ? topPath('B2B', filter) : null)
  const b2c = useApiResource<TopCategoriesResponse>(canRequest ? topPath('B2C', filter) : null)
  const loading = b2b.loading || b2c.loading

  return (
    <>
      <section aria-label="Income by business type" aria-busy={loading} className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <GroupTopTable businessType="B2B" rows={toGroupRows(b2b.data ?? [])} loading={b2b.loading} error={b2b.error} />
        <GroupTopTable businessType="B2C" rows={toGroupRows(b2c.data ?? [])} loading={b2c.loading} error={b2c.error} />
      </section>
      <section aria-label="Income comparison" aria-busy={loading}>
        <GroupComparisonChart
          totals={[
            { business_type: 'B2B', total_income: sumTotals(b2b.data ?? []) },
            { business_type: 'B2C', total_income: sumTotals(b2c.data ?? []) },
          ]}
          loading={loading}
          error={b2b.error || b2c.error}
        />
      </section>
    </>
  )
}

export default ComparisonPage
