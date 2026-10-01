import { Check, Lock, Minus } from 'lucide-react'
import type { NotificationDefault } from '@trek/shared'
import { useTranslation } from '../../i18n'
import { Tooltip } from '../../components/shared/Tooltip'
import { EVENT_LABEL_KEYS, channelLabel } from '../../components/Settings/notificationLabels'
import { useNotificationDefaults } from './useNotificationDefaults'

const NEXT: Record<NotificationDefault, NotificationDefault> = { on: 'off', off: 'blocked', blocked: 'on' }
const ICON = { on: Check, off: Minus, blocked: Lock } as const
const TONE: Record<NotificationDefault, string> = {
  on: 'bg-accent text-accent-text border-transparent',
  off: 'bg-surface-card text-content-muted border-edge',
  blocked: 'bg-danger-soft text-danger border-transparent',
}
const LABEL_KEYS: Record<NotificationDefault, string> = {
  on: 'admin.notificationDefaults.on',
  off: 'admin.notificationDefaults.off',
  blocked: 'admin.notificationDefaults.blocked',
}

/**
 * What every user's notification cells start as (#1536). One cell per event and
 * channel, cycling On → Off → Blocked: Off is a default each user may still turn
 * on, Blocked is off for everyone and shows as locked in their settings.
 */
export default function AdminNotificationDefaultsPanel() {
  const { t } = useTranslation()
  const { matrix, saving, cycle } = useNotificationDefaults()
  if (!matrix) return null

  const channels = matrix.channels.filter(ch => matrix.event_types.some(evt => matrix.implemented_combos[evt]?.includes(ch.id)))
  const columns = `minmax(0, 1fr) ${channels.map(() => '76px').join(' ')}`

  return (
    <section className="rounded-xl border border-edge bg-surface-card" aria-labelledby="notif-defaults-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-edge-faint px-6 py-4">
        <div className="min-w-0 flex-1 basis-72">
          <h2 id="notif-defaults-title" className="font-semibold text-content">{t('admin.notificationDefaults.title')}</h2>
          <p className="mt-1 text-xs text-content-faint">{t('admin.notificationDefaults.hint')}</p>
        </div>
        {/* The legend is the key to the cells below, so it reads in the same three chips. */}
        <div className="flex flex-wrap items-center gap-1.5" aria-hidden="true">
          {(['on', 'off', 'blocked'] as const).map(state => {
            const Icon = ICON[state]
            return (
              <span key={state} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${TONE[state]}`}>
                <Icon size={11} strokeWidth={2.6} />
                {t(LABEL_KEYS[state])}
              </span>
            )
          })}
        </div>
      </div>
      <div className="overflow-x-auto px-6 pb-5 pt-3">
        <div className="min-w-max">
          <div className="grid items-end gap-1 border-b border-edge pb-1.5" style={{ gridTemplateColumns: columns }}>
            <span />
            {channels.map(ch => (
              <span key={ch.id} className="text-center text-caption font-semibold uppercase tracking-[0.04em] text-content-faint">{channelLabel(ch, t)}</span>
            ))}
          </div>
          {matrix.event_types.map(eventType => {
            const implemented = matrix.implemented_combos[eventType] ?? []
            return (
              <div key={eventType} className="grid items-center gap-1 border-b border-edge-faint py-2 last:border-b-0" style={{ gridTemplateColumns: columns }}>
                <span className="min-w-0 truncate text-body text-content">{t(EVENT_LABEL_KEYS[eventType]) || eventType}</span>
                {channels.map(ch => {
                  if (!implemented.includes(ch.id)) return <span key={ch.id} className="text-center text-content-faint">—</span>
                  const state = matrix.defaults[eventType]?.[ch.id] ?? 'on'
                  const Icon = ICON[state]
                  const label = `${t(EVENT_LABEL_KEYS[eventType]) || eventType}, ${channelLabel(ch, t)}: ${t(LABEL_KEYS[state])}`
                  return (
                    <div key={ch.id} className="flex justify-center">
                      <Tooltip label={t('admin.notificationDefaults.cycle', { next: t(LABEL_KEYS[NEXT[state]]) })}>
                        <button type="button" aria-label={label} data-state={state} disabled={saving}
                          onClick={() => void cycle(eventType, ch.id, NEXT[state])}
                          className={`inline-flex h-7 w-12 items-center justify-center rounded-full border transition-colors disabled:opacity-60 ${TONE[state]}`}>
                          <Icon size={13} strokeWidth={2.6} />
                        </button>
                      </Tooltip>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
