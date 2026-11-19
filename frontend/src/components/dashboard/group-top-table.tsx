import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { type BusinessType, type GroupCategoryRow } from '@/lib/financial-types'
import { formatCategoryLabel, formatCurrency, formatPercent } from '@/lib/financial-utils'
import { ErrorNotice } from './error-notice'

interface GroupTopTableProps {
  businessType: BusinessType
  /** Rows of the group, 0 to 5. Empty when the group has no income. */
  rows: GroupCategoryRow[]
  loading?: boolean
  /** True if the request for this group failed. */
  error?: boolean
}

function GroupBody({ businessType, rows, loading, error }: GroupTopTableProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-5 w-full" />
        ))}
      </div>
    )
  }
  if (error) {
    return <ErrorNotice>{`Could not load ${businessType} income data.`}</ErrorNotice>
  }
  if (rows.length === 0) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {`No income in the selected range for ${businessType}.`}
      </p>
    )
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs uppercase text-muted-foreground">
          <th scope="col" className="pb-2 text-left font-medium">Category</th>
          <th scope="col" className="pb-2 text-right font-medium">Total income</th>
          <th scope="col" className="pb-2 text-right font-medium">Share of group</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.category} className="border-t border-border/60">
            <td className="py-2">{formatCategoryLabel(row.category)}</td>
            <td className="py-2 text-right">{formatCurrency(row.total_amount)}</td>
            <td className="py-2 text-right">{formatPercent(row.share * 100)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function GroupTopTable(props: GroupTopTableProps) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{`${props.businessType} - Top income categories`}</CardTitle>
        <CardDescription>Top 5 categories by total income</CardDescription>
      </CardHeader>
      <CardContent>
        <GroupBody {...props} />
      </CardContent>
    </Card>
  )
}
