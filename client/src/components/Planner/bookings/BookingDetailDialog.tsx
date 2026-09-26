import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Copy, ExternalLink, FolderOpen, Footprints, Hotel, Link2, MapPin, Pencil, Route as RouteIcon, Trash2, Wallet, X } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import type { BudgetItem, Reservation, TripFile } from '../../../types'
import type { ViewContribution } from '../../../api/client'
import type { ActivePlugin } from '../../../store/pluginStore'
import { useTranslation } from '../../../i18n'
import { useTripStore } from '../../../store/tripStore'
import { useSettingsStore } from '../../../store/settingsStore'
import { lockBodyScroll } from '../../../utils/bodyScrollLock'
import { useToast } from '../../shared/Toast'
import { BlurredCode } from '../../shared/BookingCode'
import { markdownLinkComponents } from '../../shared/markdownLink'
import NameDialog from '../../shared/NameDialog'
import PluginFrame from '../../Plugins/PluginFrame'
import { PluginCardFooter } from '../../Plugins/PluginContributions'
import { formatMoney, formatTime } from '../../../utils/formatters'
import { parseMeta, displayTitle, typeInfo } from './bookingsModel'
import { formatDay, type BookingFacts } from './bookingFacts'
import { AirTrailPill, BOX, Eyebrow, Field, FileRows, ReviewPill, TravelerChips, TypeTile, fs, toneColor, toneOf, toneTint } from './bookingParts'

export interface BookingDetailDialogProps {
  r: Reservation
  facts: BookingFacts
  files: TripFile[]
  linkedCosts: BudgetItem[]
  tripId: number
  canEdit: boolean
  /** True while a question opened from here (the delete confirmation) sits on top. */
  covered?: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleStatus: () => void
  onShowOnMap?: () => void
  onMap?: boolean
  onEditExpense?: (item: BudgetItem) => void
  onNavigateToFiles: () => void
  contributions: ViewContribution[]
  detailPlugins: ActivePlugin[]
}

/**
 * The phone's detail sheet on the desktop, as a dialog over the tab: the head
 * band tinted by the status like the card it opens from, everything the booking
 * holds below it, and the actions in a bar that stays in reach. Editing opens
 * the booking's own dialog.
 */
export default function BookingDetailDialog(p: BookingDetailDialogProps) {
  const { r, facts } = p
  const { t, locale } = useTranslation()
  const toast = useToast()
  const updateReservation = useTripStore(s => s.updateReservation)
  const tripCurrency = useTripStore(s => s.trip?.currency)
  const timeFormat = useSettingsStore(s => s.settings.time_format) || '24h'
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const meta = parseMeta(r)
  const tone = toneOf(r)
  const info = typeInfo(r.type)
  const transitLegs: TransitLeg[] = Array.isArray(meta.transit?.legs) ? meta.transit.legs : []
  const titleId = `booking-detail-${r.id}`

  // Escape closes, unless the rename field or the delete question is the one being answered.
  const { onClose } = p
  const blocked = renaming || !!p.covered
  useEffect(() => {
    if (blocked) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [blocked, onClose])

  // The page stays put behind the dialog, and the card it came from gets the focus back.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const release = lockBodyScroll()
    panelRef.current?.focus()
    return () => { release(); opener?.focus() }
  }, [])

  const subParts = [meta.airline, meta.flight_number, meta.train_number, facts.endpoints.length >= 2 ? facts.endpoints.map(e => e.code || e.name).join(' → ') : null].filter(Boolean)
  const sub = subParts.length ? subParts.join('  ') : facts.day?.label ?? null

  const stats: { value: string; label: string }[] = []
  if (facts.isHotel) {
    if (facts.startDate) stats.push({ value: formatDay(facts.startDate, locale, false), label: t('reservations.meta.checkIn') + (meta.check_in_time ? ` ${meta.check_in_time}` : '') })
    if (facts.endDate) stats.push({ value: formatDay(facts.endDate, locale, false), label: t('reservations.meta.checkOut') + (meta.check_out_time ? ` ${meta.check_out_time}` : '') })
    const nights = nightsBetween(facts.startDate, facts.endDate)
    if (nights) stats.push({ value: String(nights), label: t('reservations.nights', { count: nights }) })
  } else {
    const from = facts.endpoints[0]
    const to = facts.endpoints[facts.endpoints.length - 1]
    if (facts.startTime) stats.push({ value: facts.time?.split(' → ')[0] || facts.startTime, label: from?.name || t('reservations.start') })
    if (facts.endTime) stats.push({ value: facts.time?.split(' → ')[1] || facts.endTime, label: to?.name || t('reservations.end') })
    if (meta.platform) stats.push({ value: meta.platform, label: t('reservations.meta.platform') })
    if (meta.seat) stats.push({ value: meta.seat, label: t('reservations.meta.seat') })
  }
  // Cells already shown as a stat stay out of the field grid below.
  const shownAsStat = new Set([t('reservations.meta.platform'), t('reservations.meta.seat'), t('reservations.meta.checkIn'), t('reservations.meta.checkOut')])
  const cells = facts.cells.filter(c => !shownAsStat.has(c.label))
  const hasDetails = !!(facts.place || facts.accommodation || facts.linked || facts.url || facts.day)

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(r.confirmation_number || '')
      toast.success(t('common.copied'))
    } catch {
      toast.error(t('reservations.copyFailed'))
    }
  }
  const rename = async () => {
    const title = name.trim()
    setRenaming(false)
    if (!title || title === r.title) return
    try {
      await updateReservation(p.tripId, r.id, { title })
    } catch {
      toast.error(t('reservations.toast.updateError'))
    }
  }

  const statusLabel = tone === 'confirmed' ? t('reservations.confirmed') : t('reservations.pending')
  const nextStatus = tone === 'confirmed' ? t('reservations.pending') : t('reservations.confirmed')
  const statusPill = (
    <>
      <span className="h-2 w-2 flex-none rounded-full" style={{ background: toneColor(tone) }} />
      {statusLabel}
    </>
  )
  const pillCls = 'inline-flex flex-none items-center gap-1.5 rounded-full bg-surface-card px-2.5 py-1 font-semibold text-content shadow-sm'

  return createPortal(
    <div
      role="presentation"
      className="trek-modal-backdrop trek-backdrop-enter fixed inset-0 z-[10000] flex items-center justify-center bg-[rgba(15,23,42,0.5)] px-4"
      style={{ paddingTop: 40, paddingBottom: 'calc(40px + var(--bottom-nav-h, 0px))' }}
      onMouseDown={e => { if (e.target === e.currentTarget && !blocked) onClose() }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="trek-modal-enter flex max-h-full w-full max-w-[600px] flex-col overflow-hidden rounded-[22px] bg-surface-card shadow-2xl outline-none"
      >
        <header className="flex-none px-6 pb-4 pt-5" style={{ background: toneTint(tone) }}>
          <div className="flex items-start gap-3.5">
            <TypeTile type={r.type} size={46} raised />
            <div className="min-w-0 flex-1 pt-0.5">
              {p.canEdit ? (
                <button id={titleId} type="button" onClick={() => { setName(r.title); setRenaming(true) }} title={t('reservations.rename')}
                  className="block w-full truncate text-left font-bold tracking-[-0.01em] text-content hover:underline hover:decoration-edge" style={fs(20, 'subtitle')}>
                  {displayTitle(r)}
                </button>
              ) : (
                <h2 id={titleId} className="m-0 truncate font-bold tracking-[-0.01em] text-content" style={fs(20, 'subtitle')}>{displayTitle(r)}</h2>
              )}
              {sub && <div className="mt-0.5 truncate font-geist text-content-muted" style={fs(12.5)}>{sub}</div>}
            </div>
            <button type="button" onClick={onClose} aria-label={t('common.close')}
              className="grid h-9 w-9 flex-none place-items-center rounded-full bg-surface-card text-content-muted shadow-sm hover:text-content">
              <X size={16} strokeWidth={2.2} />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2" style={fs(12, 'body')}>
            {tone !== 'transit' && (p.canEdit ? (
              <button type="button" onClick={p.onToggleStatus} title={t('reservations.status.switchTo', { status: nextStatus })}
                aria-label={t('reservations.status.switchTo', { status: nextStatus })} className={`${pillCls} hover:opacity-80`}>
                {statusPill}
              </button>
            ) : <span className={pillCls}>{statusPill}</span>)}
            <span className={pillCls}><info.Icon size={13} strokeWidth={2.2} style={{ color: info.color }} />{t(info.labelKey)}</span>
            {!!r.needs_review && <ReviewPill />}
            <AirTrailPill r={r} />
            {r.confirmation_number && (
              <span className={`${pillCls} ml-auto gap-1 py-0.5 pr-1`}>
                <BlurredCode className="font-geist tabular-nums">#{r.confirmation_number}</BlurredCode>
                <button type="button" onClick={copyCode} aria-label={t('reservations.copyCode')} title={t('reservations.copyCode')}
                  className="grid h-6 w-6 place-items-center rounded-full text-content-faint hover:bg-surface-hover hover:text-content">
                  <Copy size={12} strokeWidth={2} />
                </button>
              </span>
            )}
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-6 pt-5">
          {stats.length > 0 && (
            <div className="flex gap-2">
              {stats.map((s, i) => (
                <div key={i} className="min-w-0 flex-1 rounded-[12px] bg-surface-tertiary px-3 py-2.5 text-center">
                  <div className="truncate font-bold tabular-nums tracking-[-0.01em] text-content" style={fs(18, 'subtitle')}>{s.value}</div>
                  <div className="mt-0.5 truncate font-geist text-content-faint" style={fs(10.5)}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {transitLegs.length > 0 && <TransitLegs legs={transitLegs} />}

          {facts.endpoints.length > 2 && (
            <div className={`${BOX} flex flex-col gap-2 px-3.5 py-3`}>
              {facts.endpoints.map((ep, i) => (
                <div key={ep.id ?? i} className="flex items-center gap-2.5" style={fs(13, 'body')}>
                  <span className="w-12 flex-none text-right font-semibold tabular-nums text-content">{ep.local_time ? formatTime(ep.local_time, locale, timeFormat) : ''}</span>
                  <span className="h-2.5 w-2.5 flex-none rounded-full border-2" style={{ borderColor: 'var(--text-faint)' }} />
                  <span className="min-w-0 flex-1 truncate font-medium text-content">{ep.code ? <b className="mr-1.5">{ep.code}</b> : null}{ep.name}</span>
                </div>
              ))}
            </div>
          )}

          {facts.legCodes.length > 0 && (
            <Section label={t('reservations.confirmationCode')}>
              <div className={`${BOX} flex flex-col gap-1.5 px-3.5 py-2.5`}>
                {facts.legCodes.map((l, i) => (
                  <div key={i} className="flex items-center gap-2" style={fs(13, 'body')}>
                    <span className="min-w-0 flex-1 truncate font-medium text-content-secondary">{l.route || t('reservations.confirmationCode')}</span>
                    <BlurredCode className="font-geist tabular-nums text-content-muted">#{l.code}</BlurredCode>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {cells.length > 0 && (
            <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-2">
              {cells.map((c, i) => <Field key={i} label={c.label}>{c.value}</Field>)}
            </div>
          )}

          {hasDetails && (
            <div className={`${BOX} flex flex-col px-3.5`}>
              {facts.day && <DetailRow icon={<RouteIcon size={14} />}>{[facts.day.label, facts.day.date].filter(Boolean).join('  ')}</DetailRow>}
              {facts.place && <DetailRow icon={<MapPin size={14} />}>{facts.place}</DetailRow>}
              {facts.accommodation && <DetailRow icon={<Hotel size={14} />}>{facts.accommodation}</DetailRow>}
              {facts.linked && <DetailRow icon={<Link2 size={14} />}>{facts.linked}</DetailRow>}
              {facts.url && (
                <DetailRow icon={<ExternalLink size={14} />}>
                  {facts.url.href ? <a href={facts.url.href} target="_blank" rel="noopener noreferrer" className="text-content hover:underline">{facts.url.href}</a> : facts.url.text}
                </DetailRow>
              )}
            </div>
          )}

          {(r.travelers || []).length > 0 && (
            <Section label={t('reservations.travelers.label')}>
              <TravelerChips travelers={r.travelers || []} />
            </Section>
          )}

          {r.notes && (
            <Section label={t('reservations.notes')}>
              <div className={`${BOX} collab-note-md px-3.5 py-3 text-content-secondary`} style={{ ...fs(13, 'body'), wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                <Markdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownLinkComponents}>{r.notes}</Markdown>
              </div>
            </Section>
          )}

          {p.linkedCosts.length > 0 && (
            <Section label={t('reservations.costsLabel')}>
              <div className="flex flex-col gap-1.5">
                {p.linkedCosts.map(item => (
                  <button key={item.id} type="button" disabled={!p.onEditExpense} onClick={() => p.onEditExpense?.(item)}
                    className={`${BOX} flex items-center gap-2.5 px-3.5 py-2.5 text-left enabled:hover:bg-surface-hover`} style={fs(13, 'body')}>
                    <Wallet size={14} strokeWidth={2} className="flex-none text-content-faint" />
                    <span className="min-w-0 flex-1 truncate font-medium text-content">{item.name}</span>
                    <span className="flex-none font-semibold tabular-nums text-content">{formatMoney(item.total_price, (item.currency || tripCurrency || 'EUR'), locale)}</span>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {p.files.length > 0 && (
            <Section
              label={t('files.title')}
              action={(
                <button type="button" onClick={p.onNavigateToFiles} className="inline-flex items-center gap-1 font-geist font-semibold text-content-muted hover:text-content" style={fs(11)}>
                  <FolderOpen size={11} strokeWidth={2} />{t('reservations.showInFiles')}
                </button>
              )}
            >
              <FileRows files={p.files} />
            </Section>
          )}

          {(p.contributions.length > 0 || p.detailPlugins.length > 0) && (
            <div className="flex flex-col gap-2">
              <PluginCardFooter items={p.contributions} tripId={p.tripId} />
              {p.detailPlugins.map(pl => (
                <div key={pl.id} className={`${BOX} overflow-hidden`}>
                  <PluginFrame pluginId={pl.id} tripId={String(p.tripId)} reservationId={String(r.id)} title={pl.name} surface="detail-slot" />
                </div>
              ))}
            </div>
          )}
        </div>

        {(p.onShowOnMap || p.canEdit) && (
          <footer className="flex flex-none items-center gap-2 border-t border-edge-faint px-6 py-3.5">
            {p.onShowOnMap && (
              <button type="button" onClick={p.onShowOnMap} aria-pressed={!!p.onMap}
                className={`inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 font-medium ${p.onMap ? 'bg-accent text-accent-text' : 'bg-surface-tertiary text-content hover:bg-surface-hover'}`} style={fs(13, 'body')}>
                <RouteIcon size={14} strokeWidth={2} />{t('mobileTrip.onMap')}
              </button>
            )}
            <span className="flex-1" />
            {p.canEdit && (
              <button type="button" onClick={p.onDelete} aria-label={t('common.delete')} title={t('common.delete')}
                className="grid h-9 w-9 place-items-center rounded-[10px] bg-surface-tertiary text-danger hover:bg-surface-hover">
                <Trash2 size={15} strokeWidth={2} />
              </button>
            )}
            {p.canEdit && tone !== 'transit' && (
              <button type="button" onClick={p.onEdit} className="inline-flex items-center gap-1.5 rounded-[10px] bg-accent px-4 py-2 font-medium text-accent-text hover:opacity-90" style={fs(13, 'body')}>
                <Pencil size={14} strokeWidth={2} />{t('common.edit')}
              </button>
            )}
          </footer>
        )}
      </div>

      <NameDialog
        open={renaming}
        title={t('reservations.rename')}
        placeholder={t('reservations.titlePlaceholder')}
        confirmLabel={t('common.save')}
        value={name}
        onChange={setName}
        onConfirm={rename}
        onClose={() => setRenaming(false)}
      />
    </div>,
    document.body,
  )
}

function Section({ label, action, children }: { label: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <Eyebrow>{label}</Eyebrow>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      {children}
    </section>
  )
}

interface TransitLeg {
  mode?: string
  line?: string | null
  line_color?: string | null
  line_text_color?: string | null
  duration?: number
  stops?: number
  from?: { name?: string; time?: string | null }
  to?: { name?: string; time?: string | null }
}

/** A transit journey leg by leg, the way the phone lists it. */
function TransitLegs({ legs }: { legs: TransitLeg[] }) {
  const { t } = useTranslation()
  return (
    <div className={`${BOX} flex flex-col gap-2 px-3.5 py-3`}>
      {legs.map((leg, i) => {
        const walk = leg.mode === 'WALK'
        const mins = leg.duration ? Math.round(leg.duration / 60) : null
        return (
          <div key={i} className="flex items-start gap-2">
            {walk ? <Footprints size={13} strokeWidth={2} className="mt-0.5 flex-none text-content-faint" /> : (
              <span className="flex-none rounded-[5px] px-1.5 py-px font-bold" style={{
                ...fs(10.5),
                background: leg.line_color || 'var(--bg-tertiary)',
                color: leg.line_color ? (leg.line_text_color || '#fff') : 'var(--text-primary)', // theme-lint-disable: a transit line's own colours
              }}>{leg.line || leg.mode}</span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1 font-medium text-content" style={fs(12.5, 'body')}>
                {walk ? <span className="text-content-muted">{t('transit.walkTo', { name: leg.to?.name || '' })}</span> : (
                  <><span className="truncate">{leg.from?.name}</span><ArrowRight size={11} strokeWidth={2} className="flex-none text-content-faint" /><span className="truncate">{leg.to?.name}</span></>
                )}
              </div>
              <div className="font-geist text-content-faint" style={fs(10.5)}>
                {[!walk && leg.from?.time ? `${leg.from.time}${leg.to?.time ? ` → ${leg.to.time}` : ''}` : null, mins ? t('transit.min', { count: mins }) : null, !walk && leg.stops ? t('transit.stops', { count: leg.stops }) : null].filter(Boolean).join(', ')}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DetailRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 border-t border-edge-faint py-2.5 first:border-t-0 text-content-secondary" style={fs(13, 'body')}>
      <span className="flex-none text-content-faint">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </div>
  )
}

function nightsBetween(a: string | null, b: string | null): number {
  if (!a || !b) return 0
  const n = Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5)
  return n > 0 ? n : 0
}
