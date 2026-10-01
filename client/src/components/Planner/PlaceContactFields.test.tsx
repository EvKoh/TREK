// FE-PLANNER-CONTACT-001 to FE-PLANNER-CONTACT-002
import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { render, screen } from '../../../tests/helpers/render'
import { PlaceContactFields } from './PlaceContactFields'

function Harness({ onChange }: { onChange: (field: string, value: string) => void }) {
  const [state, setState] = useState({ phone: '', email: '', opening_hours: '' })
  return (
    <PlaceContactFields phone={state.phone} email={state.email} openingHours={state.opening_hours}
      onChange={(field, value) => { onChange(field, value); setState(s => ({ ...s, [field]: value })) }} />
  )
}

describe('PlaceContactFields (#2472)', () => {
  it('FE-PLANNER-CONTACT-001: phone and e-mail are plain fields', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.type(screen.getByLabelText('Phone'), '+1 555')
    await user.type(screen.getByLabelText('E-mail'), 'a@b.co')
    expect(onChange).toHaveBeenLastCalledWith('email', 'a@b.co')
    expect(screen.getByLabelText('Phone')).toHaveValue('+1 555')
  })

  it('FE-PLANNER-CONTACT-002: the hours unfold from one row, close a day, copy Monday, and fold away again', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    expect(screen.queryByRole('switch', { name: 'Monday: Closed' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add opening hours' }))

    await user.click(screen.getByRole('switch', { name: 'Monday: Closed' }))
    let stored = JSON.parse(onChange.mock.lastCall![1])
    expect(stored[0]).toEqual({ closed: true })

    await user.click(screen.getByRole('button', { name: "Use Monday's hours for every day" }))
    stored = JSON.parse(onChange.mock.lastCall![1])
    expect(stored.every((d: { closed: boolean }) => d.closed)).toBe(true)
    expect(screen.getAllByText('Closed').length).toBeGreaterThanOrEqual(7)

    await user.click(screen.getByRole('button', { name: 'Remove opening hours' }))
    expect(onChange).toHaveBeenLastCalledWith('opening_hours', '')
    expect(screen.getByRole('button', { name: 'Add opening hours' })).toBeInTheDocument()
  })
})
