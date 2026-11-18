import { useId, useRef, type Ref } from 'react'
import { X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorNotice } from './error-notice'
import { type FacetsResponse } from '@/lib/api-types'
import { getDateRangeIssue } from '@/lib/financial-utils'
import { type DateRangeFilter } from '@/lib/param-types'

interface DateRangePickerProps {
  /** Current filter. A missing key means an empty input. */
  value: DateRangeFilter
  /** Called on every change, also with an invalid range. An empty input omits its key. */
  onChange: (next: DateRangeFilter) => void
  /** Dataset range from facets; null while loading or if facets failed. */
  bounds: Pick<FacetsResponse, 'min_date' | 'max_date'> | null
  boundsLoading?: boolean
}

interface DateFieldProps {
  label: string
  value?: string
  onChange: (text: string) => void
  invalid: boolean
  min?: string
  max?: string
  inputRef?: Ref<HTMLInputElement>
}

function DateField({ label, value, onChange, invalid, min, max, inputRef }: DateFieldProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        type="date"
        value={value ?? ''}
        min={min}
        max={max}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 min-w-44 rounded-md border border-border bg-card px-3 text-base text-foreground [color-scheme:dark] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-red-400"
      />
    </div>
  )
}

export function DateRangePicker({ value, onChange, bounds, boundsLoading }: DateRangePickerProps) {
  const startRef = useRef<HTMLInputElement>(null)
  const issue = getDateRangeIssue(value, bounds)
  const hasDate = Boolean(value.start_date || value.end_date)

  function isInvalid(date?: string) {
    if (issue === 'inverted') return true
    return issue === 'outOfBounds' && !!date && !!bounds && (date < bounds.min_date || date > bounds.max_date)
  }

  function update(key: keyof DateRangeFilter, text: string) {
    const next = { ...value }
    if (text) next[key] = text
    else delete next[key]
    onChange(next)
  }

  function clear() {
    onChange({})
    startRef.current?.focus()
  }

  return (
    <div role="group" aria-label="Date range" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-4">
        <DateField
          label="Start date"
          value={value.start_date}
          onChange={(text) => update('start_date', text)}
          invalid={isInvalid(value.start_date)}
          min={bounds?.min_date}
          max={bounds?.max_date}
          inputRef={startRef}
        />
        <DateField
          label="End date"
          value={value.end_date}
          onChange={(text) => update('end_date', text)}
          invalid={isInvalid(value.end_date)}
          min={bounds?.min_date}
          max={bounds?.max_date}
        />
        {hasDate ? (
          <button
            type="button"
            onClick={clear}
            className="inline-flex h-11 items-center gap-1.5 rounded-md border border-primary/60 bg-primary/15 px-4 text-sm font-medium text-foreground transition-colors hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          {`Available data: ${bounds.min_date} to ${bounds.max_date}`}
        </p>
      ) : null}
      {issue === 'outOfBounds' && bounds ? (
        <ErrorNotice>{`Dates must be between ${bounds.min_date} and ${bounds.max_date}.`}</ErrorNotice>
      ) : null}
      {issue === 'inverted' ? <ErrorNotice>Start date must be on or before end date.</ErrorNotice> : null}
    </div>
  )
}
