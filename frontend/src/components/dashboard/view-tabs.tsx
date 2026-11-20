import type { AppView } from '@/lib/financial-types'

interface ViewTabsProps {
  view: AppView
  onChange: (view: AppView) => void
}

const TABS: { view: AppView; id: string; label: string }[] = [
  { view: 'dashboard', id: 'tab-dashboard', label: 'Dashboard' },
  { view: 'comparison', id: 'tab-comparison', label: 'B2B vs B2C' },
]

/** Two tabs that switch the view by state; no arrow-key navigation (DEC-10). */
export function ViewTabs({ view, onChange }: ViewTabsProps) {
  return (
    <div role="tablist" className="flex border-b border-border">
      {TABS.map((tab) => {
        const active = tab.view === view
        return (
          <button
            key={tab.view}
            type="button"
            role="tab"
            id={tab.id}
            aria-controls="view-panel"
            aria-selected={active}
            onClick={() => onChange(tab.view)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
