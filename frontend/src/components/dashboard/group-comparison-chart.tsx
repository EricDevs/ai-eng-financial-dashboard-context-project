import { ErrorNotice } from '@/components/dashboard/error-notice'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { BusinessType, GroupTotal } from '@/lib/financial-types'
import { formatCurrency } from '@/lib/financial-utils'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
} from 'recharts'

interface GroupComparisonChartProps {
  /** Always two items, in the order B2B and B2C. */
  totals: GroupTotal[]
  loading?: boolean
  /** True if the request of either group failed. */
  error?: boolean
}

const TITLE = 'Income: B2B vs B2C'
const DESCRIPTION = 'Total income of B2B and B2C in the selected range.'
const BAR_COLORS: Record<BusinessType, string> = { B2B: 'var(--chart-1)', B2C: 'var(--chart-5)' }

interface CustomTooltipProps {
  active?: boolean
  payload?: { value: number; payload: GroupTotal }[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const { business_type, total_income } = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-lg text-sm">
      <p className="font-semibold text-foreground mb-1">{business_type}</p>
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: BAR_COLORS[business_type] }} />
        <span className="text-muted-foreground">Income:</span>
        <span className="font-medium text-foreground ml-auto pl-4">{formatCurrency(total_income)}</span>
      </div>
    </div>
  )
}

function ChartArea({ totals }: { totals: GroupTotal[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={totals} margin={{ top: 24, right: 8, left: 8, bottom: 0 }} title={TITLE} desc={DESCRIPTION}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.6} vertical={false} />
        <XAxis
          dataKey="business_type"
          tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) => formatCurrency(value)}
          width={80}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-border)', fillOpacity: 0.3 }} />
        <Bar
          dataKey="total_income"
          name="Income"
          shape={(props: BarShapeProps) => (
            <Rectangle {...props} fill={BAR_COLORS[totals[props.index].business_type]} />
          )}
        >
          <LabelList
            dataKey="total_income"
            position="top"
            formatter={(value) => formatCurrency(Number(value))}
            className="fill-foreground text-xs"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function GroupComparisonChart({ totals, loading, error }: GroupComparisonChartProps) {
  if (loading) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <Skeleton className="h-5 w-52 my-0.5" />
          <Skeleton className="h-3 w-64 my-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  const hasIncome = totals.some((total) => total.total_income > 0)

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">{TITLE}</CardTitle>
        <CardDescription>{DESCRIPTION}</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex h-[280px] items-center justify-center">
            <ErrorNotice message="Could not load the comparison." />
          </div>
        ) : !hasIncome ? (
          <div role="status" className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
            No income to compare in the selected range.
          </div>
        ) : (
          <ChartArea totals={totals} />
        )}
      </CardContent>
    </Card>
  )
}
