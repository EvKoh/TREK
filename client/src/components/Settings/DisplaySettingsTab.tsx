import React, { useState, useEffect, useRef } from 'react'
import { Languages, Map, ChevronDown, Check, Rocket } from 'lucide-react'
import { SUPPORTED_LANGUAGES, useTranslation } from '../../i18n'
import { useSettingsStore, DEFAULT_SETTINGS } from '../../store/settingsStore'
import { useToast } from '../shared/Toast'
import CustomSelect from '../shared/CustomSelect'
import { preferredNavAppOptions } from '../Planner/placeNavigation'
import { SYMBOLS, currenciesWith } from '../Budget/BudgetPanel.constants'
import Section from './Section'
import { TRIP_TAB_IDS, TRIP_TAB_LABEL_KEYS } from '../../constants/tripTabs'
import { DEFAULT_START_PAGE, DEFAULT_START_TRIP_TAB } from '../../utils/startDestination'
import type { DistanceUnit } from '../../types'
import { DEFAULT_WEEK_START } from '@trek/shared'
import { weekStartOptions } from '../../utils/calendarWeek'

export default function DisplaySettingsTab(): React.ReactElement {
  const { settings, updateSetting } = useSettingsStore()
  const { t, locale } = useTranslation()
  const toast = useToast()
  const [tempUnit, setTempUnit] = useState<string>(settings.temperature_unit || DEFAULT_SETTINGS.temperature_unit)
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(settings.distance_unit || DEFAULT_SETTINGS.distance_unit)
  const [langOpen, setLangOpen] = useState(false)
  const langDropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!langOpen) return
    const handler = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [langOpen])

  useEffect(() => {
    setTempUnit(settings.temperature_unit || DEFAULT_SETTINGS.temperature_unit)
  }, [settings.temperature_unit])

  useEffect(() => {
    setDistanceUnit(settings.distance_unit || DEFAULT_SETTINGS.distance_unit)
  }, [settings.distance_unit])

  const saveOnOff = async (key: OnOffKey, value: boolean) => {
    try { await updateSetting(key, value) }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : t('common.error')) }
  }

  const startPage = settings.start_page === 'active_trip' ? 'active_trip' : DEFAULT_START_PAGE
  const startTripTab = settings.start_trip_tab || DEFAULT_START_TRIP_TAB

  return (
    <>
      <Section title={t('settings.general.startup')} icon={Rocket}>
      {/* Where opening TREK lands */}
      <div>
        <label className="block text-sm font-medium mb-2 text-content-secondary">{t('settings.startPage')}</label>
        <div className="flex gap-3">
          {([
            { value: 'dashboard', label: t('settings.startPageDashboard') },
            { value: 'active_trip', label: t('settings.startPageActiveTrip') },
          ] as const).map(opt => (
            <button type="button"
              key={opt.value}
              onClick={async () => {
                try { await updateSetting('start_page', opt.value) }
                catch (e: unknown) { toast.error(e instanceof Error ? e.message : t('common.error')) }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 500,
                border: startPage === opt.value ? '2px solid var(--text-primary)' : '2px solid var(--border-primary)',
                background: startPage === opt.value ? 'var(--bg-hover)' : 'var(--bg-card)',
                color: 'var(--text-primary)',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs mt-1 text-content-faint">{t('settings.startPageHint')}</p>
      </div>

      {/* Which planner tab the trip opens on — only meaningful for 'active_trip' */}
      {startPage === 'active_trip' && (
        <div>
          <label className="block text-sm font-medium mb-2 text-content-secondary">{t('settings.startTripTab')}</label>
          <CustomSelect
            value={startTripTab}
            onChange={async v => {
              try { await updateSetting('start_trip_tab', String(v)) }
              catch (e: unknown) { toast.error(e instanceof Error ? e.message : t('common.error')) }
            }}
            options={TRIP_TAB_IDS.map(id => ({ value: id, label: t(TRIP_TAB_LABEL_KEYS[id]) }))}
          />
          <p className="text-xs text-content-faint mt-2">{t('settings.startTripTabHint')}</p>
        </div>
      )}
      </Section>

      <Section title={t('settings.general.languageRegion')} icon={Languages}>
      {/* Display currency */}
      <div>
        <label className="block text-sm font-medium mb-2 text-content-secondary">{t('settings.currency')}</label>
        {/* Unset ('') means "no personal preference": Costs then shows each trip in its
            own currency, instead of forcing every trip through one display currency. */}
        <CustomSelect
          value={settings.default_currency || ''}
          onChange={async v => {
            try { await updateSetting('default_currency', String(v)) }
            catch (e: unknown) { toast.error(e instanceof Error ? e.message : t('common.error')) }
          }}
          options={[
            { value: '', label: t('settings.currencyTrip') },
            ...currenciesWith(settings.default_currency || '').map(c => ({ value: c, label: `${c} — ${SYMBOLS[c] || c}` })),
          ]}
          searchable
        />
        <p className="text-xs text-content-faint mt-2">{t('settings.currencyHint')}</p>
      </div>

      {/* Language */}
      <div>
        <label className="block text-sm font-medium mb-2 text-content-secondary">{t('settings.language')}</label>
        {/* Desktop: Button grid */}
        <div className="hidden sm:flex flex-wrap gap-3">
          {SUPPORTED_LANGUAGES.map(opt => (
            <button type="button"
              key={opt.value}
              onClick={async () => {
                try { await updateSetting('language', opt.value) }
                catch (e: unknown) { toast.error(e instanceof Error ? e.message : t('common.error')) }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 500,
                border: settings.language === opt.value ? '2px solid var(--text-primary)' : '2px solid var(--border-primary)',
                background: settings.language === opt.value ? 'var(--bg-hover)' : 'var(--bg-card)',
                color: 'var(--text-primary)',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {/* Mobile: Custom dropdown */}
        <div ref={langDropdownRef} className="sm:hidden" style={{ position: 'relative' }}>
          {(() => {
            const current = SUPPORTED_LANGUAGES.find(o => o.value === settings.language) || SUPPORTED_LANGUAGES[0]
            return (
              <button
                type="button"
                onClick={() => setLangOpen(v => !v)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 10,
                  border: '2px solid var(--border-primary)',
                  background: 'var(--bg-card)', color: 'var(--text-primary)',
                  fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current?.label}</span>
                <ChevronDown size={14} className="text-content-faint" style={{ flexShrink: 0, transform: langOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>
            )
          })()}
          {langOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
              background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: 4, maxHeight: 280, overflowY: 'auto',
            }}>
              {SUPPORTED_LANGUAGES.map(opt => {
                const active = settings.language === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={async () => {
                      setLangOpen(false)
                      try { await updateSetting('language', opt.value) }
                      catch (err: unknown) { toast.error(err instanceof Error ? err.message : t('common.error')) }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '9px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: active ? 'var(--bg-hover)' : 'transparent',
                      fontFamily: 'inherit', fontSize: 'calc(14px * var(--fs-scale-body, 1))', color: 'var(--text-primary)',
                      textAlign: 'left', fontWeight: active ? 600 : 500,
                    }}
                  >
                    <span style={{ flex: 1 }}>{opt.label}</span>
                    {active && <Check size={14} strokeWidth={2.5} color="var(--accent)" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Place names (#1799): searches can answer in another language than the app. */}
      <div>
        <label className="block text-sm font-medium mb-2 text-content-secondary">{t('settings.placeLanguage')}</label>
        <CustomSelect
          value={settings.place_language || ''}
          onChange={async v => {
            try { await updateSetting('place_language', String(v)) }
            catch (e: unknown) { toast.error(e instanceof Error ? e.message : t('common.error')) }
          }}
          options={[
            { value: '', label: t('settings.placeLanguageApp') },
            ...SUPPORTED_LANGUAGES.map(opt => ({ value: opt.value, label: opt.label })),
          ]}
          searchable
        />
        <p className="text-xs text-content-faint mt-2">{t('settings.placeLanguageHint')}</p>
      </div>

      {/* Temperature */}
      <div>
        <label className="block text-sm font-medium mb-2 text-content-secondary">{t('settings.temperature')}</label>
        <div className="flex gap-3">
          {[
            { value: 'celsius', label: '°C Celsius' },
            { value: 'fahrenheit', label: '°F Fahrenheit' },
          ].map(opt => (
            <button type="button"
              key={opt.value}
              onClick={async () => {
                setTempUnit(opt.value)
                try { await updateSetting('temperature_unit', opt.value) }
                catch (e: unknown) { toast.error(e instanceof Error ? e.message : t('common.error')) }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 500,
                border: tempUnit === opt.value ? '2px solid var(--text-primary)' : '2px solid var(--border-primary)',
                background: tempUnit === opt.value ? 'var(--bg-hover)' : 'var(--bg-card)',
                color: 'var(--text-primary)',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Distance */}
      <div>
        <label className="block text-sm font-medium mb-2 text-content-secondary">{t('settings.distance')}</label>
        <div className="flex gap-3">
          {([
            { value: 'metric', label: 'km Metric' },
            { value: 'imperial', label: 'mi Imperial' },
          ] as const).map(opt => (
            <button type="button"
              key={opt.value}
              onClick={async () => {
                setDistanceUnit(opt.value)
                try { await updateSetting('distance_unit', opt.value) }
                catch (e: unknown) { toast.error(e instanceof Error ? e.message : t('common.error')) }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 500,
                border: distanceUnit === opt.value ? '2px solid var(--text-primary)' : '2px solid var(--border-primary)',
                background: distanceUnit === opt.value ? 'var(--bg-hover)' : 'var(--bg-card)',
                color: 'var(--text-primary)',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time Format */}
      <div>
        <label className="block text-sm font-medium mb-2 text-content-secondary">{t('settings.timeFormat')}</label>
        <div className="flex gap-3">
          {[
            { value: '24h', short: '24h', example: '14:30' },
            { value: '12h', short: '12h', example: '2:30 PM' },
          ].map(opt => (
            <button type="button"
              key={opt.value}
              onClick={async () => {
                try { await updateSetting('time_format', opt.value) }
                catch (e: unknown) { toast.error(e instanceof Error ? e.message : t('common.error')) }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 500,
                border: settings.time_format === opt.value ? '2px solid var(--text-primary)' : '2px solid var(--border-primary)',
                background: settings.time_format === opt.value ? 'var(--bg-hover)' : 'var(--bg-card)',
                color: 'var(--text-primary)',
                transition: 'all 0.15s',
              }}
            >
              {opt.short}
              <span className="hidden sm:inline">{` (${opt.example})`}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Week start: the first column of every date picker (#2029) */}
      <div>
        <label className="block text-sm font-medium mb-2 text-content-secondary">{t('settings.weekStart')}</label>
        <CustomSelect
          value={settings.week_start || DEFAULT_WEEK_START}
          onChange={async v => {
            try { await updateSetting('week_start', String(v)) }
            catch (e: unknown) { toast.error(e instanceof Error ? e.message : t('common.error')) }
          }}
          options={weekStartOptions(locale)}
        />
        <p className="text-xs text-content-faint mt-2">{t('settings.weekStartHint')}</p>
      </div>
      </Section>

      <Section title={t('settings.general.travelMap')} icon={Map}>
      {/* Preferred map app (#2423): opt-in, the picker stays the default */}
      <div>
        <label className="block text-sm font-medium mb-2 text-content-secondary">{t('settings.preferredNavApp')}</label>
        <CustomSelect
          value={settings.preferred_nav_app || ''}
          onChange={async v => {
            try { await updateSetting('preferred_nav_app', String(v)) }
            catch (e: unknown) { toast.error(e instanceof Error ? e.message : t('common.error')) }
          }}
          options={preferredNavAppOptions(t)}
        />
        <p className="text-xs text-content-faint mt-2">{t('settings.preferredNavAppHint')}</p>
      </div>

      {/* Date first in day headings (#1953) */}
      <OnOffSetting label={t('settings.dayDateFirst')} hint={t('settings.dayDateFirstHint')} on={settings.day_date_first === true} onChange={value => saveOnOff('day_date_first', value)} />

      {/* Booking route labels */}
      <OnOffSetting label={t('settings.bookingLabels')} hint={t('settings.bookingLabelsHint')} on={settings.map_booking_labels === true} onChange={value => saveOnOff('map_booking_labels', value)} />

      {/* Always show booking routes */}
      <OnOffSetting label={t('settings.alwaysShowRoutes')} hint={t('settings.alwaysShowRoutesHint')} on={settings.map_always_show_routes === true} onChange={value => saveOnOff('map_always_show_routes', value)} />

      {/* Unplanned places as small markers (#2024) */}
      <OnOffSetting label={t('settings.compactUnplanned')} hint={t('settings.compactUnplannedHint')} on={settings.map_compact_unplanned === true} onChange={value => saveOnOff('map_compact_unplanned', value)} />

      {/* Explore places on the map (POI category pill) */}
      <OnOffSetting label={t('settings.mapPoiPill')} hint={t('settings.mapPoiPillHint')} on={settings.map_poi_pill_enabled !== false} onChange={value => saveOnOff('map_poi_pill_enabled', value)} />

      {/* Blur Booking Codes */}
      <OnOffSetting label={t('settings.blurBookingCodes')} on={!!settings.blur_booking_codes} onChange={value => saveOnOff('blur_booking_codes', value)} />

      {/* Optimize route from accommodation */}
      <OnOffSetting label={t('settings.optimizeFromAccommodation')} hint={t('settings.optimizeFromAccommodationHint')} on={settings.optimize_from_accommodation !== false} onChange={value => saveOnOff('optimize_from_accommodation', value)} />
      </Section>
    </>
  )
}

type OnOffKey = 'day_date_first' | 'map_compact_unplanned' | 'map_booking_labels' | 'map_always_show_routes' | 'map_poi_pill_enabled' | 'blur_booking_codes' | 'optimize_from_accommodation'

/** One preference as a pair of On / Off buttons, the way this tab asks every yes-or-no question. */
function OnOffSetting({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (value: boolean) => void }) {
  const { t } = useTranslation()
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-content-secondary">{label}</label>
      <div className="flex gap-3">
        {[
          { value: true, label: t('settings.on') || 'On' },
          { value: false, label: t('settings.off') || 'Off' },
        ].map(opt => (
          <button type="button"
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 'calc(14px * var(--fs-scale-body, 1))', fontWeight: 500,
              border: on === opt.value ? '2px solid var(--text-primary)' : '2px solid var(--border-primary)',
              background: on === opt.value ? 'var(--bg-hover)' : 'var(--bg-card)',
              color: 'var(--text-primary)',
              transition: 'all 0.15s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {hint && <p className="text-xs mt-1 text-content-faint">{hint}</p>}
    </div>
  )
}
