// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type TopCategoriesResponse } from '@/lib/api-types'
import { toGroupRows } from '@/lib/financial-utils'
import { mountRoot } from '@/test-helpers'
import { GroupTopTable } from './group-top-table'

const B2B: TopCategoriesResponse = [
  { category: 'sales', operation_type: 'income', total_amount: 557903.97 },
  { category: 'others', operation_type: 'income', total_amount: 57636.75 },
]

let view: ReturnType<typeof mountRoot>

beforeEach(() => {
  view = mountRoot()
})

afterEach(() => {
  view.cleanup()
})

const text = () => view.container.textContent ?? ''
const rows = () =>
  [...view.container.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent))

describe('GroupTopTable', () => {
  it('renders the group title, description and headers', async () => {
    view.root.render(<GroupTopTable businessType="B2B" rows={toGroupRows(B2B)} />)
    await vi.waitFor(() => {
      expect(view.container.querySelector('h2')?.textContent).toBe('B2B - Top income categories')
      expect(text()).toContain('Top 5 categories by total income')
      expect([...view.container.querySelectorAll('thead th')].map((th) => th.textContent)).toEqual([
        'Category',
        'Total income',
        'Share of group',
      ])
    })
  })

  it('formats rows in API order', async () => {
    view.root.render(<GroupTopTable businessType="B2B" rows={toGroupRows(B2B)} />)
    await vi.waitFor(() =>
      expect(rows()).toEqual([
        ['Sales', '$557,904', '90.6%'],
        ['Others', '$57,637', '9.4%'],
      ]),
    )
  })

  it('renders only the rows it receives', async () => {
    view.root.render(<GroupTopTable businessType="B2B" rows={toGroupRows(B2B)} />)
    await vi.waitFor(() => expect(rows()).toHaveLength(2))
  })

  it('shows the empty message without a table', async () => {
    view.root.render(<GroupTopTable businessType="B2C" rows={[]} />)
    await vi.waitFor(() => {
      expect(view.container.querySelector('[role="status"]')?.textContent).toBe('No income in the selected range for B2C.')
      expect(view.container.querySelector('table')).toBeNull()
    })
  })

  it('shows the title and three skeleton rows while loading', async () => {
    view.root.render(<GroupTopTable businessType="B2B" rows={[]} loading />)
    await vi.waitFor(() => {
      expect(view.container.querySelector('h2')?.textContent).toBe('B2B - Top income categories')
      expect(view.container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3)
      expect(view.container.querySelector('table')).toBeNull()
    })
  })

  it('shows the group error', async () => {
    view.root.render(<GroupTopTable businessType="B2B" rows={[]} error />)
    await vi.waitFor(() => {
      expect(view.container.querySelector('[role="alert"]')?.textContent).toBe('Could not load B2B income data.')
      expect(view.container.querySelector('table')).toBeNull()
    })
  })

  it('prefers loading over error', async () => {
    view.root.render(<GroupTopTable businessType="B2B" rows={[]} loading error />)
    await vi.waitFor(() => {
      expect(view.container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3)
      expect(text()).not.toContain('Could not load')
    })
  })
})
