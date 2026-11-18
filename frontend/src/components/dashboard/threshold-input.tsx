import { useId } from 'react'
import { parseThreshold, THRESHOLD_MAX, THRESHOLD_MIN } from '@/lib/financial-utils'
import { ErrorNotice } from './error-notice'

interface ThresholdInputProps {
  value: string
  onChange: (text: string) => void
}

export function ThresholdInput({ value, onChange }: ThresholdInputProps) {
  const id = useId()
  const invalid = parseThreshold(value) === null

  return (
    <div className="flex flex-col gap-1.5">
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
        className="h-11 w-32 rounded-md border border-border bg-card px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-red-400"
      />
      <p id={`${id}-help`} className="text-sm text-muted-foreground">
        Ratio between 0.01 and 1.0 (default 0.3).
      </p>
      {invalid ? <ErrorNotice>Enter a value between 0.01 and 1.0.</ErrorNotice> : null}
    </div>
  )
}
