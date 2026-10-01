import { useId, useState } from 'react'
import { Copy, Mail, Phone, X } from 'lucide-react'
import type { PlaceOpeningHours } from '@trek/shared'
import CustomTimePicker from '../shared/CustomTimePicker'
import { Tooltip } from '../shared/Tooltip'
import { DialogSection, fs } from '../shared/DialogShell'
import { AddRowButton, EditorField, GRID_2, INPUT } from '../shared/dialogParts'
import { readWeek, weekdayNames, writeWeek } from './placeHours'
import { useTranslation } from '../../i18n'

interface Props {
  /** Anchor for the "add by hand" jump from an empty search. */
  id?: string
  phone: string
  email: string
  /** The stored hours text (JSON), empty when the place has none of its own. */
  openingHours: string
  onChange: (field: 'phone' | 'email' | 'opening_hours', value: string) => void
}

/**
 * Phone, e-mail and opening hours, by hand (#2472). The search fills phone and
 * website when it knows them; everything it does not know, or a place nobody
 * has listed at all, the traveller can add here. The hours stay folded away
 * behind one row until somebody wants them, so a place without any does not
 * carry a seven-row grid.
 */
export function PlaceContactFields({ id: anchorId, phone, email, openingHours, onChange }: Props) {
  const { t, locale } = useTranslation()
  const id = useId()
  const week = readWeek(openingHours)
  const [editing, setEditing] = useState(() => openingHours !== '')
  const names = weekdayNames(locale, 'short')
  const longNames = weekdayNames(locale, 'long')

  const setWeek = (next: PlaceOpeningHours) => onChange('opening_hours', writeWeek(next))
  const setDay = (i: number, patch: Partial<PlaceOpeningHours[number]>) =>
    setWeek(week.map((day, d) => (d === i ? { ...day, ...patch } : day)))
  const copyFirstToAll = () => setWeek(week.map(() => ({ ...week[0] })))
  const clearHours = () => { onChange('opening_hours', ''); setEditing(false) }

  return (
    <div id={anchorId} className="flex flex-col gap-4">
      <div className={GRID_2}>
        <EditorField label={t('places.formPhone')} htmlFor={`${id}-phone`}>
          <div className="relative">
            <Phone size={13} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-faint" />
            <input id={`${id}-phone`} type="tel" value={phone} onChange={e => onChange('phone', e.target.value)}
              maxLength={50} placeholder="+49 …" className={`${INPUT} pl-8`} />
          </div>
        </EditorField>
        <EditorField label={t('places.formEmail')} htmlFor={`${id}-email`}>
          <div className="relative">
            <Mail size={13} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-faint" />
            <input id={`${id}-email`} type="email" value={email} onChange={e => onChange('email', e.target.value)}
              maxLength={254} placeholder="info@…" className={`${INPUT} pl-8`} />
          </div>
        </EditorField>
      </div>

      <DialogSection
        label={t('inspector.openingHours')}
        action={editing ? (
          <div className="flex items-center gap-1">
            <Tooltip label={t('places.hoursCopyFirst', { day: longNames[0] })}>
              <button type="button" onClick={copyFirstToAll} aria-label={t('places.hoursCopyFirst', { day: longNames[0] })}
                className="grid h-7 w-7 place-items-center rounded-full text-content-faint hover:bg-surface-hover hover:text-content">
                <Copy size={13} strokeWidth={2} />
              </button>
            </Tooltip>
            <Tooltip label={t('places.hoursRemove')}>
              <button type="button" onClick={clearHours} aria-label={t('places.hoursRemove')}
                className="grid h-7 w-7 place-items-center rounded-full text-content-faint hover:bg-surface-hover hover:text-danger">
                <X size={14} strokeWidth={2.2} />
              </button>
            </Tooltip>
          </div>
        ) : undefined}
      >
        {editing ? (
          <div className="flex flex-col divide-y divide-edge-faint overflow-hidden rounded-[12px] border border-edge-faint bg-surface-card">
            {week.map((day, i) => (
              <div key={i} className="grid min-h-[46px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-1.5">
                <span className="font-semibold text-content-secondary" style={fs(12.5, 'body')} title={longNames[i]}>{names[i]}</span>
                {day.closed ? (
                  <span className="text-content-faint" style={fs(12.5, 'body')}>{t('places.hoursClosed')}</span>
                ) : (
                  <div className="flex min-w-0 items-center gap-1.5">
                    <div className="min-w-0 flex-1">
                      <CustomTimePicker value={day.open ?? ''} onChange={v => setDay(i, { open: v || undefined })}
                        aria-label={`${longNames[i]} ${t('places.hoursOpens')}`} />
                    </div>
                    <span className="flex-none text-content-faint">–</span>
                    <div className="min-w-0 flex-1">
                      <CustomTimePicker value={day.close ?? ''} onChange={v => setDay(i, { close: v || undefined })}
                        aria-label={`${longNames[i]} ${t('places.hoursCloses')}`} />
                    </div>
                  </div>
                )}
                <button type="button" role="switch" aria-checked={day.closed} aria-label={`${longNames[i]}: ${t('places.hoursClosed')}`}
                  onClick={() => setDay(i, day.closed ? { closed: false } : { closed: true, open: undefined, close: undefined })}
                  className={`rounded-full border px-2.5 py-[3px] font-semibold transition-colors ${day.closed ? 'border-[color:var(--text-primary)] bg-surface-tertiary text-content' : 'border-edge text-content-faint hover:text-content'}`}
                  style={fs(11)}>
                  {t('places.hoursClosed')}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <AddRowButton onClick={() => setEditing(true)}>{t('places.hoursAdd')}</AddRowButton>
        )}
      </DialogSection>
    </div>
  )
}
