import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { type AlertsResponse } from '@/lib/api-types'
import { formatCurrency, formatPercent } from '@/lib/financial-utils'
import { ErrorNotice } from './error-notice'
import { ThresholdInput } from './threshold-input'

interface AlertsTableProps {
  /** Last valid result. null while there is none yet (first load or error). */
  alerts: AlertsResponse | null
  /** Threshold that `alerts` belongs to (the last applied one, not the typed text). */
  appliedThreshold: number
  /** Current input text (may be invalid). */
  thresholdText: string
  onThresholdChange: (text: string) => void
  loading?: boolean
  /** True if the last request failed. */
  error?: boolean
}

const HEADERS = ['Period', 'Outcome', 'Avg. of previous periods', 'Increase']

function AlertsBody({ alerts, appliedThreshold, loading }: Pick<AlertsTableProps, 'alerts' | 'appliedThreshold' | 'loading'>) {
  if (loading) {
    return [0, 1, 2].map((row) => (
      <tr key={row}>
        <td colSpan={HEADERS.length} className="py-2">
          <Skeleton className="h-5 w-full" />
        </td>
      </tr>
    ))
  }

  if (!alerts?.length) {
    return (
      <tr>
        <td colSpan={HEADERS.length} className="py-6 text-center text-sm text-muted-foreground">
          <div role="status">
            <p>No anomalies detected for the current threshold ({formatPercent(appliedThreshold * 100)}).</p>
            <p>Try a lower threshold or a wider date range.</p>
          </div>
        </td>
      </tr>
    )
  }

  return alerts.map((alert) => (
    <tr key={alert.period} className="border-t border-border/60">
      <td className="py-2">{alert.period}</td>
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
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Anomaly Alerts</CardTitle>
        <CardDescription>Average outcome of all earlier periods in the selected range.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <ThresholdInput value={thresholdText} onChange={onThresholdChange} />
        {!loading && error ? (
          <ErrorNotice>Could not load anomaly alerts.</ErrorNotice>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase text-muted-foreground">
                {HEADERS.map((header, index) => (
                  <th key={header} scope="col" className={index === 0 ? 'pb-2 text-left font-medium' : 'pb-2 text-right font-medium'}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AlertsBody alerts={alerts} appliedThreshold={appliedThreshold} loading={loading} />
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}
