// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type AlertEntry } from '@/lib/api-types'
import { inputByLabel, mountRoot } from '@/test-helpers'
import { AlertsTable } from './alerts-table'

const ALERT: AlertEntry = {
  period: '2026-03',
  outcome_total: 88075.59,
  baseline_average: 55334.29,
  increase_ratio: 0.5917,
}
const HEADERS = ['Period', 'Outcome', 'Avg. of previous periods', 'Increase']
const EMPTY = 'No anomalies detected for the current threshold (30.0%).'

let view: ReturnType<typeof mountRoot>

beforeEach(() => {
  view = mountRoot()
})

afterEach(() => {
  view.cleanup()
})

function renderTable(props: Partial<Parameters<typeof AlertsTable>[0]> = {}) {
  view.root.render(
    <AlertsTable alerts={[ALERT]} appliedThreshold={0.3} thresholdText="0.3" onThresholdChange={vi.fn()} {...props} />,
  )
}

const text = () => view.container.textContent ?? ''
const headers = () => [...view.container.querySelectorAll('thead th')].map((th) => th.textContent)
const rows = () =>
  [...view.container.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent))

describe('AlertsTable', () => {
  it('renders title, help line, input and four headers', async () => {
    renderTable()
    await vi.waitFor(() => {
      expect(view.container.querySelector('h2')?.textContent).toBe('Anomaly Alerts')
      expect(text()).toContain('Average outcome of all earlier periods in the selected range.')
      expect(inputByLabel(view.container, 'Alert threshold')).toBeTruthy()
      expect(headers()).toEqual(HEADERS)
    })
  })

  it('formats each alert row', async () => {
    renderTable()
    await vi.waitFor(() => expect(rows()).toEqual([['2026-03', '$88,076', '$55,334', '59.2%']]))
  })

  it('keeps the API row order', async () => {
    renderTable({ alerts: [ALERT, { ...ALERT, period: '2025-12' }] })
    await vi.waitFor(() => expect(rows().map((row) => row[0])).toEqual(['2026-03', '2025-12']))
  })

  it('keeps the table visible with an empty result', async () => {
    renderTable({ alerts: [] })
    await vi.waitFor(() => {
      expect(headers()).toEqual(HEADERS)
      const status = view.container.querySelector('tbody [role="status"]')
      expect(status?.textContent).toContain(EMPTY)
      expect(status?.textContent).toContain('Try a lower threshold or a wider date range.')
    })
  })

  it('uses the applied threshold in the empty message', async () => {
    renderTable({ alerts: [], thresholdText: '5' })
    await vi.waitFor(() => {
      expect(text()).toContain(EMPTY)
      expect(view.container.querySelector('[role="alert"]')?.textContent).toBe('Enter a value between 0.01 and 1.0.')
    })
  })

  it('shows three skeleton rows while loading', async () => {
    renderTable({ alerts: null, loading: true })
    await vi.waitFor(() => {
      expect(view.container.querySelectorAll('tbody tr [data-slot="skeleton"]')).toHaveLength(3)
      expect(inputByLabel(view.container, 'Alert threshold').disabled).toBe(false)
    })
  })

  it('shows the card error and hides the table', async () => {
    renderTable({ alerts: null, error: true })
    await vi.waitFor(() => {
      expect(view.container.querySelector('[role="alert"]')?.textContent).toBe('Could not load anomaly alerts.')
      expect(view.container.querySelector('table')).toBeNull()
      expect(inputByLabel(view.container, 'Alert threshold')).toBeTruthy()
    })
  })

  it('prefers loading over error', async () => {
    renderTable({ alerts: null, loading: true, error: true })
    await vi.waitFor(() => {
      expect(view.container.querySelectorAll('tbody [data-slot="skeleton"]')).toHaveLength(3)
      expect(text()).not.toContain('Could not load anomaly alerts.')
    })
  })

  it('places the threshold error below the header, outside the control', async () => {
    renderTable({ thresholdText: '0' })
    await vi.waitFor(() => {
      const alert = view.container.querySelector('[role="alert"]')
      const table = view.container.querySelector('table')
      expect(alert?.textContent).toBe('Enter a value between 0.01 and 1.0.')
      expect(alert?.closest('[data-slot="card-header"]')).toBeNull()
      expect(table && alert?.compareDocumentPosition(table)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    })
  })

  it('keeps the last rows while the input is invalid', async () => {
    renderTable({ thresholdText: '0' })
    await vi.waitFor(() => {
      expect(rows()).toEqual([['2026-03', '$88,076', '$55,334', '59.2%']])
      expect(view.container.querySelector('[role="alert"]')?.textContent).toBe('Enter a value between 0.01 and 1.0.')
    })
  })
})
