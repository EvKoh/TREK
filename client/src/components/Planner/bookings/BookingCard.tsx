import type { ReactNode } from 'react'
import { Hotel, Link2, MapPin, ExternalLink, Pencil, Trash2, Wallet } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import type { Reservation, TripFile } from '../../../types'
import type { ViewContribution } from '../../../api/client'
import type { ActivePlugin } from '../../../store/pluginStore'
import { useTranslation } from '../../../i18n'
import { markdownLinkComponents } from '../../shared/markdownLink'
import { BlurredCode } from '../../shared/BookingCode'
import PluginFrame from '../../Plugins/PluginFrame'
import { PluginCardFooter } from '../../Plugins/PluginContributions'
import { TransitLegChips, fmtTransitDuration } from '../transitDisplay'
import { formatMoney } from '../../../utils/formatters'
import { parseMeta, typeInfo, displayTitle, type CostTotal } from './bookingsModel'
import type { BookingFacts } from './bookingFacts'
import {
  AirTrailPill, BOX, Eyebrow, Field, FileRows, ReviewPill, RoundAction, StatusDot, TravelerChips, TypeChip,
  fs, toneOf, toneTint,
} from './bookingParts'

export interface BookingCardProps {
  r: Reservation
  facts: BookingFacts
  files: TripFile[]
  costs: CostTotal[]
  tripId: number
  canEdit: boolean
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleStatus: () => void
  contributions: ViewContribution[]
  detailPlugins: ActivePlugin[]
  /** False while the detail pane shows this booking, so its plugin frames are not mounted twice. */
  showFrames: boolean
}

/**
 * One booking or transport as the phone draws it: a head band tinted by its
 * status with the status switch, the type and the title, then framed fields.
 * The desktop keeps every value the old card had, so nothing is behind a tap.
 */
export default function BookingCard(p: BookingCardProps) {
  const { r, facts } = p
  const { t, locale } = useTranslation()
  const info = typeInfo(r.type)
  const tone = toneOf(r)
  const transit = r.type === 'transit'

  return (
    <article
      tabIndex={0}
      onClick={p.onSelect}
      onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); p.onSelect() } }}
      aria-label={displayTitle(r)}
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-surface-secondary transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--text-primary)] ${p.selected ? 'border-[color:var(--text-primary)]' : 'border-edge-faint'}`}
    >
      <div className="flex items-center gap-2 border-b border-edge-faint px-3 py-2.5" style={{ background: toneTint(tone) }}>
        <StatusDot r={r} canToggle={p.canEdit} onToggle={p.onToggleStatus} />
        <TypeChip type={r.type} />
        <span className="min-w-0 flex-1 truncate font-bold text-content" style={fs(13.5, 'body')}>{displayTitle(r)}</span>
        {!!r.needs_review && <ReviewPill />}
        <AirTrailPill r={r} />
        {p.canEdit && !transit && <RoundAction label={t('common.edit')} onClick={p.onEdit}><Pencil size={12} strokeWidth={2} /></RoundAction>}
        {p.canEdit && <RoundAction label={t('common.delete')} onClick={p.onDelete} danger><Trash2 size={12} strokeWidth={2} /></RoundAction>}
      </div>

      <div className="flex flex-1 flex-col gap-2 px-3 pb-3 pt-2.5">
        {(facts.day || facts.time) && (
          <div className="flex gap-2">
            {facts.day && (
              <Field label={t('reservations.date')} className="flex-[1.4]">
                {facts.day.label}
                {facts.day.date && <span className="ml-1.5 font-medium text-content-faint">{facts.day.date}</span>}
              </Field>
            )}
            {facts.time && <Field label={t('reservations.time')} className="flex-1" tabular>{facts.time}</Field>}
          </div>
        )}

        {transit ? <TransitBody r={r} /> : (
          <>
            {r.confirmation_number && (
              <Field label={t('reservations.confirmationCode')} tabular>
                <BlurredCode className="font-geist">{r.confirmation_number}</BlurredCode>
              </Field>
            )}
            {facts.endpoints.length >= 2 && (
              <div className={`${BOX} flex flex-wrap items-center justify-center gap-2 px-[10px] py-2 font-semibold text-content`} style={fs(12.5, 'body')}>
                {facts.endpoints.map((ep, i) => (
                  <span key={ep.id ?? i} className="inline-flex min-w-0 items-center gap-2">
                    {i > 0 && <info.Icon size={13} strokeWidth={2.2} className="flex-none" style={{ color: info.color }} />}
                    <span className="truncate">{ep.name}</span>
                  </span>
                ))}
              </div>
            )}
            {facts.legCodes.length > 0 && (
              <div className={`${BOX} flex flex-col gap-1 px-[10px] py-2`}>
                {facts.legCodes.map((l, i) => (
                  <div key={i} className="flex items-center gap-2" style={fs(12, 'body')}>
                    <span className="min-w-0 flex-1 truncate font-medium text-content-secondary">{l.route || t('reservations.confirmationCode')}</span>
                    <BlurredCode className="font-geist tabular-nums text-content-muted">{l.code}</BlurredCode>
                  </div>
                ))}
              </div>
            )}
            {facts.cells.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {facts.cells.map((c, i) => <Field key={i} label={c.label}>{c.value}</Field>)}
              </div>
            )}
          </>
        )}

        {(facts.place || facts.accommodation || facts.linked || facts.url) && (
          <div className="flex flex-col gap-1">
            {facts.place && <IconRow icon={<MapPin size={12} strokeWidth={2} />}>{facts.place}</IconRow>}
            {facts.accommodation && <IconRow icon={<Hotel size={12} strokeWidth={2} />}>{facts.accommodation}</IconRow>}
            {facts.linked && <IconRow icon={<Link2 size={12} strokeWidth={2} />}>{facts.linked}</IconRow>}
            {facts.url && (
              <IconRow icon={<ExternalLink size={12} strokeWidth={2} />}>
                {facts.url.href
                  ? <a href={facts.url.href} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-content hover:underline">{facts.url.href}</a>
                  : facts.url.text}
              </IconRow>
            )}
          </div>
        )}

        {r.notes && !transit && (
          <div className={`${BOX} collab-note-md line-clamp-4 px-[10px] py-2 text-content-muted`} style={fs(12, 'body')}>
            <Markdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownLinkComponents}>{r.notes}</Markdown>
          </div>
        )}

        {(r.travelers || []).length > 0 && (
          <div>
            <Eyebrow className="mb-[3px]">{t('reservations.travelers.label')}</Eyebrow>
            <TravelerChips travelers={r.travelers || []} />
          </div>
        )}

        {p.files.length > 0 && (
          <div>
            <Eyebrow className="mb-[3px]">{t('files.title')}</Eyebrow>
            <FileRows files={p.files} />
          </div>
        )}

        {p.costs.length > 0 && (
          <div className="mt-auto flex flex-wrap justify-end gap-1.5 pt-0.5">
            {p.costs.map(c => (
              <span key={c.currency} className="inline-flex items-center gap-1 rounded-full bg-surface-tertiary px-2.5 py-[3px] font-geist font-semibold tabular-nums text-content-secondary" style={fs(11.5)}>
                <Wallet size={11} strokeWidth={2} className="text-content-faint" />
                {formatMoney(c.amount, c.currency, locale)}
              </span>
            ))}
          </div>
        )}
      </div>

      <PluginCardFooter items={p.contributions} tripId={p.tripId} />
      {p.showFrames && p.detailPlugins.length > 0 && (
        <div role="presentation" onClick={e => e.stopPropagation()} className="flex flex-col gap-2 px-3 pb-3">
          {p.detailPlugins.map(pl => (
            <div key={pl.id} className={`${BOX} overflow-hidden`}>
              <PluginFrame pluginId={pl.id} tripId={String(p.tripId)} reservationId={String(r.id)} title={pl.name} surface="detail-slot" />
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

function IconRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className={`${BOX} flex min-w-0 items-center gap-1.5 px-[10px] py-[7px] font-semibold text-content`} style={fs(12, 'body')}>
      <span className="flex-none text-content-muted">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </div>
  )
}

/** A transit journey's legs in their line colours, its duration and the first line of its notes. */
function TransitBody({ r }: { r: Reservation }) {
  const { t } = useTranslation()
  const meta = parseMeta(r)
  const transit = meta.transit && Array.isArray(meta.transit.legs) ? meta.transit : null
  return (
    <>
      {transit && (
        <div className={`${BOX} flex flex-col gap-1.5 px-[10px] py-2`}>
          <TransitLegChips legs={transit.legs} size="md" t={t} />
          {transit.duration ? <span className="font-geist text-content-faint" style={fs(11)}>{fmtTransitDuration(transit.duration, t)}</span> : null}
        </div>
      )}
      {r.notes && (
        <div className="truncate px-0.5 font-geist text-content-faint" style={fs(11.5)}>
          <Markdown remarkPlugins={[remarkGfm]} allowedElements={['strong', 'em', 'del', 'code', 'a']} unwrapDisallowed>{r.notes.split('\n')[0]}</Markdown>
        </div>
      )}
    </>
  )
}
