// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type DateRangeFilter } from '@/lib/param-types'
import { deferred, jsonResponse, mountRoot } from '@/test-helpers'
import { ComparisonPage } from './comparison-page'

const TOP = '/api/metrics/categories/top?operation_type=income&limit=5&business_type='
const BOUNDS = { min_date: '2025-11-01', max_date: '2026-10-28' }
const entry = (category: 'sales' | 'others', total_amount: number) => ({
  category,
  operation_type: 'income' as const,
  total_amount,
})
const B2B_ROWS = [entry('sales', 557903.97), entry('others', 57636.75)]
const B2C_ROWS = [entry('sales', 574193.41), entry('others', 68412.74)]

let view: ReturnType<typeof mountRoot>

beforeEach(() => {
  view = mountRoot()
})

afterEach(() => {
  view.cleanup()
  vi.unstubAllGlobals()
})

/** Fake fetch by URL; `route` overrides the default rows of each group. */
function stubTop(route: (url: string) => Promise<Response> | undefined = () => undefined) {
  const fetchMock = vi.fn((url: string) => {
    const custom = route(url)
    if (custom) return custom
    if (url.startsWith(`${TOP}B2B`)) return Promise.resolve(jsonResponse(B2B_ROWS))
    return Promise.resolve(jsonResponse(B2C_ROWS))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const render = (filter: DateRangeFilter) => view.root.render(<ComparisonPage filter={filter} bounds={BOUNDS} />)
const text = () => view.container.textContent ?? ''
const firstCells = () => [...view.container.querySelectorAll('tbody tr td:first-child')].map((td) => td.textContent)
const tick = () => new Promise((done) => setTimeout(done, 0))

describe('ComparisonPage', () => {
  it('requests income top categories for each group', async () => {
    const fetchMock = stubTop()
    render({})
    await vi.waitFor(() => expect(fetchMock.mock.calls.map(([url]) => url).sort()).toEqual([`${TOP}B2B`, `${TOP}B2C`]))
  })

  it('adds informed dates to both requests', async () => {
    const fetchMock = stubTop()
    render({ start_date: '2026-01-01' })
    await vi.waitFor(() =>
      expect(fetchMock.mock.calls.map(([url]) => url).sort()).toEqual([
        `${TOP}B2B&start_date=2026-01-01`,
        `${TOP}B2C&start_date=2026-01-01`,
      ]),
    )
  })

  it('shows empty states without requests when the filter cannot be requested', async () => {
    for (const filter of [{ start_date: '2026-02-01', end_date: '2026-01-01' }, { start_date: '1900-02-02' }]) {
      const fetchMock = stubTop()
      render(filter)
      await vi.waitFor(() => {
        expect(text()).toContain('No income in the selected range for B2B.')
        expect(text()).toContain('No income in the selected range for B2C.')
        expect(text()).toContain('No income to compare in the selected range.')
      })
      expect(fetchMock).not.toHaveBeenCalled()
      expect(view.container.querySelector('[role="alert"]')).toBeNull()
      view.cleanup()
      view = mountRoot()
    }
  })

  it('keeps the last result when the filter becomes invalid', async () => {
    const fetchMock = stubTop()
    render({ end_date: '2026-01-01' })
    await vi.waitFor(() => expect(firstCells()).toEqual(['Sales', 'Others', 'Sales', 'Others']))
    const callsBefore = fetchMock.mock.calls.length

    render({ start_date: '2026-02-01', end_date: '2026-01-01' })
    await tick()
    expect(firstCells()).toEqual(['Sales', 'Others', 'Sales', 'Others'])
    expect(fetchMock).toHaveBeenCalledTimes(callsBefore)
  })

  it('renders both groups side by side in order', async () => {
    stubTop()
    render({})
    await vi.waitFor(() => {
      const titles = [...view.container.querySelectorAll('h2')].map((h2) => h2.textContent)
      expect(titles.slice(0, 2)).toEqual(['B2B - Top income categories', 'B2C - Top income categories'])
    })
  })

  it('shows one empty group while the other renders', async () => {
    stubTop((url) => (url.startsWith(`${TOP}B2B`) ? Promise.resolve(jsonResponse([])) : undefined))
    render({})
    await vi.waitFor(() => {
      expect(text()).toContain('No income in the selected range for B2B.')
      expect(firstCells()).toEqual(['Sales', 'Others'])
    })
  })

  it('isolates a failed group', async () => {
    stubTop((url) => {
      if (url.startsWith(`${TOP}B2B`)) return Promise.resolve(jsonResponse([]))
      return Promise.resolve(jsonResponse(null, 500))
    })
    render({})
    await vi.waitFor(() => {
      expect(text()).toContain('No income in the selected range for B2B.')
      expect(text()).toContain('Could not load B2C income data.')
      expect(text()).toContain('Could not load the comparison.')
    })
  })

  it('shows the chart loading while one group loads and the other failed', async () => {
    const pendingB2c = deferred<Response>()
    stubTop((url) =>
      url.startsWith(`${TOP}B2B`) ? Promise.resolve(jsonResponse(null, 500)) : pendingB2c.promise,
    )
    render({})
    await vi.waitFor(() => {
      expect(text()).toContain('Could not load B2B income data.')
      expect(text()).not.toContain('Could not load the comparison.')
      expect(view.container.querySelector('section[aria-label="Income comparison"]')?.getAttribute('aria-busy')).toBe(
        'true',
      )
      expect(view.container.querySelector('section[aria-label="Income by business type"]')?.getAttribute('aria-busy')).toBe(
        'true',
      )
    })
  })

  it('renders only the latest response', async () => {
    // Gates instead of shared responses: each fetch needs its own Response (a body is read once).
    const first = deferred<void>()
    const second = deferred<void>()
    stubTop((url) => {
      if (url.endsWith('start_date=2026-01-01')) return first.promise.then(() => jsonResponse([entry('sales', 99)]))
      if (url.endsWith('start_date=2026-01-02')) return second.promise.then(() => jsonResponse([entry('others', 10)]))
      return undefined
    })
    render({ start_date: '2026-01-01' })
    await tick()
    render({ start_date: '2026-01-02' })
    await tick()

    second.resolve()
    await vi.waitFor(() => expect(firstCells()).toEqual(['Others', 'Others']))
    first.resolve()
    await tick()
    expect(firstCells()).toEqual(['Others', 'Others'])
  })
})
