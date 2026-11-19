import { useId, useRef, type Ref } from 'react'
import { AlertCircle, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { FacetsResponse } from '@/lib/api-types'
import { getDateRangeIssue } from '@/lib/financial-utils'
import type { DateRangeFilter } from '@/lib/param-types'

interface DateRangePickerProps {
  /** Current filter. A missing key means an empty input. */
  value: DateRangeFilter
  /** Called on every change, also with an invalid range. An empty input omits its key. */
  onChange: (next: DateRangeFilter) => void
  /** Dataset range (from facets). null while facets loads or if it failed. */
  bounds: Pick<FacetsResponse, 'min_date' | 'max_date'> | null
  /** True while facets is loading. */
  boundsLoading?: boolean
}

type DateKey = keyof DateRangeFilter

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

interface DateFieldProps {
  label: string
  value: string | undefined
  bounds: DateRangePickerProps['bounds']
  invalid: boolean
  onChange: (date: string) => void
  inputRef?: Ref<HTMLInputElement>
}

function DateField({ label, value, bounds, invalid, onChange, inputRef }: DateFieldProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-foreground">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        type="date"
        value={value ?? ''}
        min={bounds?.min_date}
        max={bounds?.max_date}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`h-11 min-w-44 rounded-md border border-input bg-card px-3 text-base text-foreground scheme-dark aria-invalid:border-red-500 ${focusRing}`}
      />
    </div>
  )
}

export function DateRangePicker({ value, onChange, bounds, boundsLoading }: DateRangePickerProps) {
  const startRef = useRef<HTMLInputElement>(null)
  const issue = getDateRangeIssue(value, bounds)
  const outOfBounds = (date: string | undefined) =>
    bounds !== null && date !== undefined && (date < bounds.min_date || date > bounds.max_date)
  const isInvalid = (key: DateKey) =>
    issue === 'inverted' || (issue === 'outOfBounds' && outOfBounds(value[key]))

  const message =
    issue === 'outOfBounds' && bounds
      ? `Dates must be between ${bounds.min_date} and ${bounds.max_date}.`
      : issue === 'inverted'
        ? 'Start date must be on or before end date.'
        : null

  function changeDate(key: DateKey, date: string) {
    const next: DateRangeFilter = { ...value, [key]: date }
    if (date === '') delete next[key]
    onChange(next)
  }

  function clearDates() {
    onChange({})
    startRef.current?.focus()
  }

  const hasDate = value.start_date !== undefined || value.end_date !== undefined

  return (
    <div role="group" aria-label="Date range" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <DateField
          label="Start date"
          value={value.start_date}
          bounds={bounds}
          invalid={isInvalid('start_date')}
          onChange={(date) => changeDate('start_date', date)}
          inputRef={startRef}
        />
        <DateField
          label="End date"
          value={value.end_date}
          bounds={bounds}
          invalid={isInvalid('end_date')}
          onChange={(date) => changeDate('end_date', date)}
        />
        {hasDate ? (
          <button
            type="button"
            onClick={clearDates}
            className={`inline-flex h-11 items-center gap-2 rounded-md border border-primary/60 bg-primary/15 px-4 text-sm text-foreground ${focusRing}`}
          >
            <X size={16} aria-hidden="true" />
            Clear dates
          </button>
        ) : null}
      </div>
      {boundsLoading ? (
        <Skeleton className="h-4 w-64" />
      ) : bounds ? (
        <p className="text-sm text-muted-foreground">
          Available data: {bounds.min_date} to {bounds.max_date}
        </p>
      ) : null}
      {message ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300"
        >
          <AlertCircle size={16} aria-hidden="true" />
          {message}
        </div>
      ) : null}
    </div>
  )
}
