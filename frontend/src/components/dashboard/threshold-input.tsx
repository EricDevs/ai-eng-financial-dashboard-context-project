import { useId } from 'react'
import { parseThreshold, THRESHOLD_MAX, THRESHOLD_MIN } from '@/lib/financial-utils'

interface ThresholdInputProps {
  value: string
  onChange: (text: string) => void
}

/** Threshold label, input and help in one row. AlertsTable renders its error notice (spec DEC-31). */
export function ThresholdInput({ value, onChange }: ThresholdInputProps) {
  const id = useId()
  const invalid = parseThreshold(value) === null

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        Alert threshold
      </label>
      <input
        id={id}
        type="number"
        min={THRESHOLD_MIN}
        max={THRESHOLD_MAX}
        step={0.01}
        value={value}
        aria-invalid={invalid || undefined}
        aria-describedby={`${id}-help`}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-32 rounded-md border border-border bg-secondary px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-red-400"
      />
      <p id={`${id}-help`} className="text-sm text-muted-foreground">
        Ratio between 0.01 and 1.0 (default 0.3).
      </p>
    </div>
  )
}
