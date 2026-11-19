import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { type BusinessType, type GroupTotal } from '@/lib/financial-types'
import { formatCurrency } from '@/lib/financial-utils'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ErrorNotice } from './error-notice'

interface GroupComparisonChartProps {
  /** Always two items, B2B then B2C. */
  totals: GroupTotal[]
  loading?: boolean
  /** True if the request of either group failed. */
  error?: boolean
}

const BAR_COLORS: Record<BusinessType, string> = {
  B2B: 'var(--chart-1)',
  B2C: 'var(--chart-5)',
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
        <CardTitle className="text-base font-semibold">Income: B2B vs B2C</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex h-[280px] items-center justify-center">
            <ErrorNotice>Could not load the comparison.</ErrorNotice>
          </div>
        ) : !hasIncome ? (
          <div role="status" className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            No income to compare in the selected range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={totals}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              title="Income: B2B vs B2C"
              desc="Total income of B2B and B2C in the selected range."
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.6} vertical={false} />
              <XAxis
                dataKey="business_type"
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value: number) => formatCurrency(value)}
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                width={88}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                cursor={{ fill: 'var(--color-border)', opacity: 0.3 }}
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--foreground)' }}
                itemStyle={{ color: 'var(--foreground)' }}
              />
              <Bar dataKey="total_income" name="Income" radius={[6, 6, 0, 0]}>
                {totals.map((total) => (
                  <Cell key={total.business_type} fill={BAR_COLORS[total.business_type]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
