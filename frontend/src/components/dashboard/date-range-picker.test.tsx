// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buttonByText, inputByLabel, mountRoot, setInputValue } from '@/test-helpers'
import { DateRangePicker } from './date-range-picker'

const BOUNDS = { min_date: '2025-11-01', max_date: '2026-10-28' }
const INVALID_RANGE = 'Start date must be on or before end date.'

let view: ReturnType<typeof mountRoot>

beforeEach(() => {
  view = mountRoot()
})

afterEach(() => {
  view.cleanup()
})

const startInput = () => inputByLabel(view.container, 'Start date')
const endInput = () => inputByLabel(view.container, 'End date')

describe('DateRangePicker', () => {
  it('renders two empty optional date inputs', async () => {
    view.root.render(<DateRangePicker value={{}} onChange={vi.fn()} bounds={null} />)
    await vi.waitFor(() => {
      for (const input of [startInput(), endInput()]) {
        expect(input.type).toBe('date')
        expect(input.value).toBe('')
        expect(input.required).toBe(false)
      }
    })
  })

  it('emits the new start date keeping the end date', async () => {
    const onChange = vi.fn()
    view.root.render(<DateRangePicker value={{ end_date: '2026-01-31' }} onChange={onChange} bounds={null} />)
    const start = await vi.waitFor(startInput)

    setInputValue(start, '2026-01-01')
    expect(onChange).toHaveBeenCalledWith({ start_date: '2026-01-01', end_date: '2026-01-31' })
  })

  it('omits the key of an emptied input', async () => {
    const onChange = vi.fn()
    view.root.render(
      <DateRangePicker value={{ start_date: '2026-01-01', end_date: '2026-01-31' }} onChange={onChange} bounds={null} />,
    )
    const start = await vi.waitFor(startInput)

    setInputValue(start, '')
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(['end_date'])
  })

  it('shows the available range and sets min/max', async () => {
    view.root.render(<DateRangePicker value={{}} onChange={vi.fn()} bounds={BOUNDS} />)
    await vi.waitFor(() => {
      expect(view.container.textContent).toContain('Available data: 2025-11-01 to 2026-10-28')
      for (const input of [startInput(), endInput()]) {
        expect(input.getAttribute('min')).toBe('2025-11-01')
        expect(input.getAttribute('max')).toBe('2026-10-28')
      }
    })
  })

  it('shows a skeleton while bounds load without blocking inputs', async () => {
    view.root.render(<DateRangePicker value={{}} onChange={vi.fn()} bounds={null} boundsLoading />)
    await vi.waitFor(() => {
      expect(view.container.querySelector('[data-slot="skeleton"]')).not.toBeNull()
      expect(view.container.textContent).not.toContain('Available data')
      expect(startInput().disabled).toBe(false)
      expect(startInput().hasAttribute('min')).toBe(false)
    })
  })

  it('hides the reference line when bounds failed', async () => {
    view.root.render(<DateRangePicker value={{}} onChange={vi.fn()} bounds={null} />)
    await vi.waitFor(() => {
      expect(startInput()).toBeTruthy()
      expect(view.container.textContent).not.toContain('Available data')
      expect(view.container.querySelector('[data-slot="skeleton"]')).toBeNull()
      expect(view.container.querySelector('[role="alert"]')).toBeNull()
      expect(endInput().hasAttribute('min')).toBe(false)
      expect(endInput().hasAttribute('max')).toBe(false)
    })
  })

  it('shows Clear dates only with a date and clears both', async () => {
    const onChange = vi.fn()
    view.root.render(<DateRangePicker value={{}} onChange={onChange} bounds={null} />)
    await vi.waitFor(startInput)
    expect(view.container.textContent).not.toContain('Clear dates')

    view.root.render(<DateRangePicker value={{ end_date: '2026-01-31' }} onChange={onChange} bounds={null} />)
    const clear = await vi.waitFor(() => buttonByText(view.container, 'Clear dates'))
    clear.click()
    expect(onChange).toHaveBeenCalledWith({})
  })

  it('moves focus to the start date after clearing', async () => {
    const onChange = vi.fn()
    view.root.render(<DateRangePicker value={{ start_date: '2026-01-01' }} onChange={onChange} bounds={null} />)
    const clear = await vi.waitFor(() => buttonByText(view.container, 'Clear dates'))

    clear.click()
    expect(onChange).toHaveBeenCalledWith({})
    expect(document.activeElement).toBe(startInput())
  })

  it('flags an inverted range', async () => {
    view.root.render(
      <DateRangePicker value={{ start_date: '2026-02-01', end_date: '2026-01-01' }} onChange={vi.fn()} bounds={null} />,
    )
    await vi.waitFor(() => {
      expect(view.container.querySelector('[role="alert"]')?.textContent).toBe(INVALID_RANGE)
      expect(startInput().getAttribute('aria-invalid')).toBe('true')
      expect(endInput().getAttribute('aria-invalid')).toBe('true')
    })
  })

  it('flags a date outside the available range', async () => {
    view.root.render(<DateRangePicker value={{ start_date: '1900-02-02' }} onChange={vi.fn()} bounds={BOUNDS} />)
    await vi.waitFor(() => {
      expect(view.container.querySelector('[role="alert"]')?.textContent).toBe(
        'Dates must be between 2025-11-01 and 2026-10-28.',
      )
      expect(startInput().getAttribute('aria-invalid')).toBe('true')
      expect(endInput().hasAttribute('aria-invalid')).toBe(false)
    })
  })

  it('shows one notice at a time, out of range first', async () => {
    view.root.render(
      <DateRangePicker value={{ start_date: '2027-01-01', end_date: '2026-01-01' }} onChange={vi.fn()} bounds={BOUNDS} />,
    )
    await vi.waitFor(() => {
      const alerts = [...view.container.querySelectorAll('[role="alert"]')].map((alert) => alert.textContent)
      expect(alerts).toEqual(['Dates must be between 2025-11-01 and 2026-10-28.'])
    })
    // aria-invalid follows the notice shown: only the out-of-range input (spec DEC-37).
    expect(inputByLabel(view.container, 'Start date').getAttribute('aria-invalid')).toBe('true')
    expect(inputByLabel(view.container, 'End date').hasAttribute('aria-invalid')).toBe(false)
  })

  it('shows no message while a year is being typed', async () => {
    view.root.render(<DateRangePicker value={{ start_date: '0019-02-02' }} onChange={vi.fn()} bounds={BOUNDS} />)
    await vi.waitFor(startInput)
    expect(view.container.querySelector('[role="alert"]')).toBeNull()
    expect(startInput().hasAttribute('aria-invalid')).toBe(false)
  })

  it('accepts a single-day range', async () => {
    view.root.render(
      <DateRangePicker value={{ start_date: '2026-01-15', end_date: '2026-01-15' }} onChange={vi.fn()} bounds={null} />,
    )
    await vi.waitFor(startInput)
    expect(view.container.querySelector('[role="alert"]')).toBeNull()
    expect(startInput().hasAttribute('aria-invalid')).toBe(false)
  })

  it('is a labelled group, not a section', async () => {
    view.root.render(<DateRangePicker value={{}} onChange={vi.fn()} bounds={null} />)
    await vi.waitFor(() => {
      expect(view.container.querySelector('[role="group"][aria-label="Date range"]')).not.toBeNull()
    })
    expect(view.container.querySelector('section')).toBeNull()
  })
})
