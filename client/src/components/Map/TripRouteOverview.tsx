import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Route, X } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { Tooltip } from '../shared/Tooltip'
import { profileIcon } from '../Planner/DayPlanSidebarRouteConnector'
import { formatDistance } from '../../utils/units'
import { MAP_CONTROL_SHADOW } from './mapControlShadow'
import type { TripRouteOverview as Overview } from './useTripRouteOverview'
import type { DistanceUnit } from '../../types'

/**
 * Toggle for the whole-trip route overview (#1736). Same frosted shell as the other
 * map controls, so it lines up with the compass and the layer switcher.
 */
export function TripRouteOverviewPill({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  const { t } = useTranslation()
  const label = active ? t('map.overview.hide') : t('map.overview.show')
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', padding: 4, borderRadius: 999, pointerEvents: 'auto',
      background: 'var(--sidebar-bg)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      boxShadow: MAP_CONTROL_SHADOW,
    }}>
      {/* TREK's own tooltip, not the browser's — the native one ignores the
          colour scheme, waits a second and a half, and cannot be read on a touch
          device at all. `left`, because these controls hug the right edge of the
          map and a tooltip to the right would hang off it. */}
      <Tooltip label={label} placement="left">
        <button
          type="button"
          onClick={onToggle}
          aria-label={label}
          aria-pressed={active}
          data-testid="trip-overview-pill"
          className={active ? 'text-accent' : 'text-content-muted'}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: 999, border: 'none', cursor: 'pointer',
            background: 'transparent', padding: 0,
            transition: 'background 0.14s, color 0.14s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <Route size={17} strokeWidth={2} />
        </button>
      </Tooltip>
    </div>
  )
}

/**
 * The trip's stages and its total distance, read off the overview the map is drawing.
 *
 * One component for both shells: the phone and the desktop place it differently but the
 * rows are the same rows, and a second copy of them is a second thing to keep in step.
 */
export function TripRouteOverviewPanel({ overview, unit, selectedDayId, onSelectDay, maxWidth = 320, collapsible = false }: {
  overview: Overview
  unit: DistanceUnit
  selectedDayId?: number | null
  onSelectDay?: (dayId: number) => void
  /** How wide the card may grow before day names start to ellipsize. */
  maxWidth?: number
  /** The phone's form: a chip with the total, and the days in a full-screen sheet on a tap.
   *  A card listing the days grows upwards from its toggle and, past a few days, covers the
   *  middle of the map and the day bar above it. */
  collapsible?: boolean
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  if (!overview.days.length) return null
  // Only once the round is over: while it runs every leg still waiting is unrouted too,
  // and the ellipsis on the total already says the number is growing.
  const unrouted = overview.loading ? 0 : (overview.unroutedLegs ?? 0)

  const total = (
    <>
      {formatDistance(overview.totalDistance / 1000, unit)}
      {/* Still routing: the number is a partial sum, and saying so beats a total
          that silently grows while you read it. */}
      {overview.loading && <span className="text-content-muted" style={{ fontWeight: 400 }}>{' '}…</span>}
    </>
  )
  const header = (
    <>
      <span className="text-content-muted" style={{ fontSize: 'calc(11px * var(--fs-scale-caption, 1))', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {t('map.overview.total')}
      </span>
      {/* Same tier as the label beside it: the two read as one line rather than as a
          heading with a number stuck under it. */}
      <span className="text-content" style={{ fontSize: 'calc(11px * var(--fs-scale-caption, 1))', fontWeight: 600 }}>
        {total}
      </span>
    </>
  )
  // A leg the router refused stays a straight line and adds nothing to the sum, so
  // the total is short by however much road those legs are. Said in words rather than
  // left to the reader to notice, because the number is what a fuel estimate starts from.
  const unroutedNote = unrouted > 0 && (
    <div
      data-testid="trip-overview-unrouted"
      className="text-warning"
      style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '0 14px 8px', fontSize: 'calc(11px * var(--fs-scale-caption, 1))' }}
    >
      <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden />
      <span>{t('map.overview.unrouted', { count: unrouted })}</span>
    </div>
  )
  const rows = (pick?: (dayId: number) => void, rowPadding = '7px 14px') => overview.days.map(day => {
    const label = day.title || t('dayplan.dayN', { n: day.dayNumber })
    const dayUnrouted = overview.loading ? 0 : (day.unroutedLegs ?? 0)
    const row = (
      <>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: day.color.line, flexShrink: 0 }} aria-hidden />
        <span className="text-content" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }} className="text-content-muted">
          {day.modes.map(mode => {
            const Icon = profileIcon(mode)
            return <Icon key={mode} size={12} strokeWidth={2} aria-hidden />
          })}
        </span>
        {/* The day's own share of the shortfall, so the reader knows which figure
            to distrust rather than only that one of them is off. */}
        {dayUnrouted > 0 && (
          <AlertTriangle
            size={12}
            className="text-warning"
            style={{ flexShrink: 0 }}
            role="img"
            aria-label={t('map.overview.dayUnrouted', { count: dayUnrouted })}
          />
        )}
        <span className="text-content-muted" style={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
          {formatDistance(day.distance / 1000, unit)}
        </span>
      </>
    )
    const style = {
      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
      padding: rowPadding, textAlign: 'left' as const,
      fontSize: 'calc(12px * var(--fs-scale-body, 1))',
      background: day.dayId === selectedDayId ? 'var(--bg-hover)' : 'transparent',
      border: 'none',
    }
    return pick ? (
      <button key={day.dayId} type="button" onClick={() => pick(day.dayId)} style={{ ...style, cursor: 'pointer' }}>
        {row}
      </button>
    ) : (
      <div key={day.dayId} style={style}>{row}</div>
    )
  })

  if (collapsible) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('map.overview.showDays')}
          aria-haspopup="dialog"
          data-testid="trip-overview-expand"
          className="text-content"
          style={{
            pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: 'var(--sidebar-bg)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: MAP_CONTROL_SHADOW,
            fontSize: 'calc(12px * var(--fs-scale-body, 1))', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
          }}
        >
          <Route size={13} strokeWidth={2} aria-hidden className="text-content-muted" />
          {total}
          {unrouted > 0 && <AlertTriangle size={12} className="text-warning" aria-hidden />}
        </button>
        {/* The whole list gets the whole screen rather than a strip of the map; closing it
            gives the map back. Picking a day closes it too, so the map shows that day. */}
        {open && createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('map.overview.total')}
            data-testid="trip-overview-panel"
            className="m-root"
            style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 16px 10px',
              borderBottom: '1px solid var(--border-primary)',
            }}>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>{header}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('common.close')}
                data-testid="trip-overview-close"
                className="text-content"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--bg-hover)' }}
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>
            {unroutedNote && <div style={{ paddingTop: 8 }}>{unroutedNote}</div>}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
              {rows(onSelectDay ? (dayId) => { onSelectDay(dayId); setOpen(false) } : undefined, '12px 16px')}
            </div>
          </div>,
          document.body,
        )}
      </>
    )
  }

  return (
    <div
      data-testid="trip-overview-panel"
      style={{
        pointerEvents: 'auto', borderRadius: 14, overflow: 'hidden',
        background: 'var(--sidebar-bg)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: 'var(--sidebar-shadow, 0 4px 16px rgba(0,0,0,0.14))',
        // Sized to its rows rather than to the space available: a trip of short day
        // names left a band of empty card over the map, which on a phone is most of
        // what there is to look at.
        width: 'fit-content', maxWidth,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, padding: '10px 14px 8px' }}>
        {header}
      </div>
      {unroutedNote}
      <div style={{ maxHeight: 220, overflowY: 'auto', borderTop: '1px solid var(--border-primary)' }}>
        {rows(onSelectDay)}
      </div>
    </div>
  )
}
