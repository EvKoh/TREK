import { AlertTriangle, Check } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { NumericInput } from '../shared/NumericInput'
import { useGoogleQuota } from './useGoogleQuota'

/**
 * The daily ceiling on Google calls (#1582), as one row of the Google options:
 * the number on the right with today's count under it, a save button only while
 * there is something to save, and a warning once the day is used up.
 */
export default function GoogleDailyLimitRow() {
  const { t } = useTranslation()
  const { status, draft, setDraft, dirty, saving, save } = useGoogleQuota()

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3">
      <div className="min-w-0 flex-1 basis-60">
        <label htmlFor="admin-google-daily-limit" className="text-sm font-medium text-content-secondary">{t('admin.googleQuota.title')}</label>
        <p className="text-xs text-content-faint mt-0.5">{t('admin.googleQuota.subtitle')}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5">
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
        {status && (
          status.exhausted ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning">
              <AlertTriangle size={12} />
              {t('admin.googleQuota.reached', { used: status.used_today })}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-surface-tertiary px-2.5 py-0.5 text-xs font-medium tabular-nums text-content-muted">
              {status.daily_limit == null
                ? t('admin.googleQuota.usedToday', { used: status.used_today })
                : t('admin.googleQuota.usedOfLimit', { used: status.used_today, limit: status.daily_limit })}
            </span>
          )
        )}
      </div>
    </div>
  )
}
