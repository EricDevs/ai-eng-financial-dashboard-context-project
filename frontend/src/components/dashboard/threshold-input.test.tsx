// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { inputByLabel, mountRoot, setInputValue } from '@/test-helpers'
import { ThresholdInput } from './threshold-input'

let view: ReturnType<typeof mountRoot>

beforeEach(() => {
  view = mountRoot()
})

afterEach(() => {
  view.cleanup()
})

const input = () => inputByLabel(view.container, 'Alert threshold')

describe('ThresholdInput', () => {
  it('renders a labelled number input with limits', async () => {
    view.root.render(<ThresholdInput value="0.3" onChange={vi.fn()} />)
    await vi.waitFor(() => {
      expect(input().type).toBe('number')
      expect(input().getAttribute('min')).toBe('0.01')
      expect(input().getAttribute('max')).toBe('1')
      expect(input().getAttribute('step')).toBe('0.01')
      expect(input().value).toBe('0.3')
      expect(view.container.textContent).toContain('Ratio between 0.01 and 1.0 (default 0.3).')
    })
  })

  it('emits the raw text on change', async () => {
    const onChange = vi.fn()
    view.root.render(<ThresholdInput value="0.3" onChange={onChange} />)
    await vi.waitFor(input)

    setInputValue(input(), '0.5')
    expect(onChange).toHaveBeenCalledWith('0.5')
  })

  it('marks invalid text without rendering the notice', async () => {
    for (const text of ['', '0', '5']) {
      view.root.render(<ThresholdInput value={text} onChange={vi.fn()} />)
      await vi.waitFor(() => expect(input().getAttribute('aria-invalid')).toBe('true'))
      expect(view.container.querySelector('[role="alert"]')).toBeNull()
    }
  })

  it('does not mark the limits as invalid', async () => {
    for (const text of ['0.01', '1.0']) {
      view.root.render(<ThresholdInput value={text} onChange={vi.fn()} />)
      await vi.waitFor(() => expect(input().value).toBe(text))
      expect(input().hasAttribute('aria-invalid')).toBe(false)
    }
  })
})
