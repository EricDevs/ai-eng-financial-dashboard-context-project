import { type AppView } from '@/lib/financial-types'
import { cn } from '@/lib/utils'

interface ViewTabsProps {
  view: AppView
  onChange: (view: AppView) => void
}

const TABS: { view: AppView; label: string }[] = [
  { view: 'dashboard', label: 'Dashboard' },
  { view: 'comparison', label: 'B2B vs B2C' },
]

/** Two state-driven tabs; no arrow-key navigation (spec DEC-10). */
export function ViewTabs({ view, onChange }: ViewTabsProps) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-border">
      {TABS.map((tab) => {
        const selected = tab.view === view
        return (
          <button
            key={tab.view}
            id={`tab-${tab.view}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls="view-panel"
            onClick={() => onChange(tab.view)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
