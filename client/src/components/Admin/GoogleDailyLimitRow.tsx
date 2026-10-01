import { AlertTriangle, Check } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { NumericInput } from '../shared/NumericInput'
import { useGoogleQuota } from './useGoogleQuota'

/**
 * The daily ceiling on Google calls (#1582), as one row of the Google options:
 * today's count as a badge beside the name, the number on the right, a save
 * button only while there is something to save.
 */
export default function GoogleDailyLimitRow() {
  const { t } = useTranslation()
  const { status, draft, setDraft, dirty, saving, save } = useGoogleQuota()

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3">
      <div className="min-w-0 flex-1 basis-60">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="admin-google-daily-limit" className="text-sm font-medium text-content-secondary">{t('admin.googleQuota.title')}</label>
          {/* Today's count beside the name it belongs to: green while there is room, amber once the day is used up. */}
          {status && (
            status.exhausted ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-[2px] text-caption font-semibold tabular-nums text-warning">
                <AlertTriangle size={11} strokeWidth={2.4} />
                {t('admin.googleQuota.reached', { used: status.used_today })}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-edge-faint bg-surface-secondary px-2 py-[2px] text-caption font-semibold tabular-nums text-content-secondary">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-success" />
                {status.daily_limit == null
                  ? t('admin.googleQuota.usedToday', { used: status.used_today })
                  : t('admin.googleQuota.usedOfLimit', { used: status.used_today, limit: status.daily_limit })}
              </span>
            )
          )}
        </div>
        <p className="text-xs text-content-faint mt-0.5">{t('admin.googleQuota.subtitle')}</p>
      </div>
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-2">
          <NumericInput
            id="admin-google-daily-limit"
            mode="integer"
            value={draft}
            onValueChange={setDraft}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void save() } }}
            placeholder={t('admin.googleQuota.placeholder')}
            disabled={status === null || saving}
            className="w-32 px-3 py-1.5 border border-edge rounded-lg text-sm text-right tabular-nums bg-surface-input text-content focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-60"
          />
          {dirty && (
            <button type="button" onClick={() => void save()} disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-text hover:opacity-90 disabled:opacity-60">
              <Check size={14} />
              {t('common.save')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
