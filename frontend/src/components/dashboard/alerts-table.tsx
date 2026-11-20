import { ErrorNotice } from '@/components/dashboard/error-notice'
import { ThresholdInput } from '@/components/dashboard/threshold-input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { AlertsResponse } from '@/lib/api-types'
import { formatCurrency, formatPercent, parseThreshold } from '@/lib/financial-utils'

interface AlertsTableProps {
  /** Last valid result. null if there is no result yet (first load or error). */
  alerts: AlertsResponse | null
  /** Threshold that `alerts` belongs to (the last applied one, not the typed text). */
  appliedThreshold: number
  /** Current input text (may be invalid). */
  thresholdText: string
  /** Called on every input change. */
  onThresholdChange: (text: string) => void
  loading?: boolean
  /** True if the last request failed. */
  error?: boolean
}

const COLUMNS = ['Period', 'Outcome', 'Avg. of previous periods', 'Increase']
const rowClass = 'border-t border-border/60'

function TableBody({ alerts, appliedThreshold, loading }: Pick<AlertsTableProps, 'alerts' | 'appliedThreshold' | 'loading'>) {
  if (loading) {
    return [0, 1, 2].map((index) => (
      <tr key={index} className={rowClass}>
        <td colSpan={4} className="py-2">
          <Skeleton className="h-5 w-full" />
        </td>
      </tr>
    ))
  }
  if (alerts?.length === 0) {
    return (
      <tr className={rowClass}>
        <td colSpan={4} className="py-2 text-center text-sm text-muted-foreground">
          <div role="status">
            <p>No anomalies detected for the current threshold ({formatPercent(appliedThreshold * 100)}).</p>
            <p>Try a lower threshold or a wider date range.</p>
          </div>
        </td>
      </tr>
    )
  }
  return (alerts ?? []).map((alert) => (
    <tr key={alert.period} className={rowClass}>
      <td className="py-2 text-left">{alert.period}</td>
      <td className="py-2 text-right">{formatCurrency(alert.outcome_total)}</td>
      <td className="py-2 text-right">{formatCurrency(alert.baseline_average)}</td>
      <td className="py-2 text-right">{formatPercent(alert.increase_ratio * 100)}</td>
    </tr>
  ))
}

export function AlertsTable({
  alerts,
  appliedThreshold,
  thresholdText,
  onThresholdChange,
  loading,
  error,
}: AlertsTableProps) {
  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <CardTitle className="text-base font-semibold">Anomaly Alerts</CardTitle>
          <CardDescription>Average outcome of all earlier periods in the selected range.</CardDescription>
        </div>
        <ThresholdInput value={thresholdText} onChange={onThresholdChange} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {parseThreshold(thresholdText) === null ? (
          <ErrorNotice message="Enter a value between 0.01 and 1.0." />
        ) : null}
        {error && !loading ? (
          <ErrorNotice message="Could not load anomaly alerts." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                {COLUMNS.map((column, index) => (
                  <th
                    key={column}
                    className={`py-2 text-xs font-medium uppercase text-muted-foreground ${index === 0 ? 'text-left' : 'text-right'}`}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <TableBody alerts={alerts} appliedThreshold={appliedThreshold} loading={loading} />
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}
