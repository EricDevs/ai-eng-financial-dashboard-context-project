// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type GroupTotal } from '@/lib/financial-types'
import { mountRoot } from '@/test-helpers'
import { GroupComparisonChart } from './group-comparison-chart'

const ONE_GROUP: GroupTotal[] = [
  { business_type: 'B2B', total_income: 615540.72 },
  { business_type: 'B2C', total_income: 0 },
]
const NONE: GroupTotal[] = [
  { business_type: 'B2B', total_income: 0 },
  { business_type: 'B2C', total_income: 0 },
]
const EMPTY = 'No income to compare in the selected range.'
const ERROR = 'Could not load the comparison.'

let view: ReturnType<typeof mountRoot>

beforeEach(() => {
  view = mountRoot()
})

afterEach(() => {
  view.cleanup()
})

const text = () => view.container.textContent ?? ''

describe('GroupComparisonChart', () => {
  it('shows the title and no empty message when a group has income', async () => {
    view.root.render(<GroupComparisonChart totals={ONE_GROUP} />)
    await vi.waitFor(() => {
      expect(view.container.querySelector('h2')?.textContent).toBe('Income: B2B vs B2C')
      expect(text()).not.toContain(EMPTY)
      expect(text()).not.toContain(ERROR)
    })
  })

  it('shows the description under the title', async () => {
    // By data-slot: the chart's accessible `desc` holds the same sentence.
    const description = () => view.container.querySelector('[data-slot="card-description"]')?.textContent
    for (const props of [{ totals: ONE_GROUP }, { totals: NONE }, { totals: NONE, error: true }]) {
      view.root.render(<GroupComparisonChart {...props} />)
      await vi.waitFor(() => expect(description()).toBe('Total income of B2B and B2C in the selected range.'))
    }
  })

  it('shows the empty message when both totals are zero', async () => {
    view.root.render(<GroupComparisonChart totals={NONE} />)
    await vi.waitFor(() => expect(view.container.querySelector('[role="status"]')?.textContent).toBe(EMPTY))
  })

  it('shows a skeleton while loading', async () => {
    view.root.render(<GroupComparisonChart totals={NONE} loading />)
    await vi.waitFor(() => {
      expect(view.container.querySelector('[data-slot="skeleton"]')).not.toBeNull()
      expect(text()).not.toContain(EMPTY)
    })
  })

  it('shows the comparison error', async () => {
    view.root.render(<GroupComparisonChart totals={NONE} error />)
    await vi.waitFor(() => expect(view.container.querySelector('[role="alert"]')?.textContent).toBe(ERROR))
  })

  it('prefers loading over error', async () => {
    view.root.render(<GroupComparisonChart totals={NONE} loading error />)
    await vi.waitFor(() => {
      expect(view.container.querySelector('[data-slot="skeleton"]')).not.toBeNull()
      expect(text()).not.toContain(ERROR)
    })
  })
})
