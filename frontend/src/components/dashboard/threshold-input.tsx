import { useId } from 'react'
import { parseThreshold } from '@/lib/financial-utils'

interface ThresholdInputProps {
  value: string
  onChange: (text: string) => void
}

export function ThresholdInput({ value, onChange }: ThresholdInputProps) {
  const id = useId()
  const invalid = parseThreshold(value) === null
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <label htmlFor={id} className="text-sm text-muted-foreground">
        Alert threshold
      </label>
      <input
        id={id}
        type="number"
        min="0.01"
        max="1"
        step="0.01"
        value={value}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-24 rounded-md border border-input bg-secondary px-3 text-base text-foreground scheme-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-red-500"
      />
      <p className="text-sm text-muted-foreground">Ratio between 0.01 and 1.0 (default 0.3).</p>
    </div>
  )
}
