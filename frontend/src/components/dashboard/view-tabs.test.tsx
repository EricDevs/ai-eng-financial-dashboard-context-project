// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buttonByText, mountRoot } from '@/test-helpers'
import { ViewTabs } from './view-tabs'

let view: ReturnType<typeof mountRoot>

beforeEach(() => {
  view = mountRoot()
})

afterEach(() => {
  view.cleanup()
})

const tabs = () => [...view.container.querySelectorAll('[role="tab"]')]

describe('ViewTabs', () => {
  it('renders Dashboard and B2B vs B2C tabs', async () => {
    view.root.render(<ViewTabs view="dashboard" onChange={vi.fn()} />)
    await vi.waitFor(() => {
      expect(view.container.querySelector('[role="tablist"]')).not.toBeNull()
      expect(tabs().map((tab) => tab.textContent)).toEqual(['Dashboard', 'B2B vs B2C'])
      expect(tabs().map((tab) => tab.id)).toEqual(['tab-dashboard', 'tab-comparison'])
      expect(tabs().every((tab) => tab.getAttribute('aria-controls') === 'view-panel')).toBe(true)
    })
  })

  it('marks the active tab', async () => {
    view.root.render(<ViewTabs view="comparison" onChange={vi.fn()} />)
    await vi.waitFor(() => {
      expect(tabs().map((tab) => tab.getAttribute('aria-selected'))).toEqual(['false', 'true'])
    })
  })

  it('emits the selected view', async () => {
    const onChange = vi.fn()
    view.root.render(<ViewTabs view="dashboard" onChange={onChange} />)
    const comparison = await vi.waitFor(() => buttonByText(view.container, 'B2B vs B2C'))

    comparison.click()
    expect(onChange).toHaveBeenCalledWith('comparison')
  })
})
