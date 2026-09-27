import type { Page } from '@playwright/test'
import { test, clearNotices, expect, seed } from './shot'

/**
 * The Plan tab and the dialogs of the trip page, as the wiki pages for the day
 * plan, places, bookings, transports and costs show them. Every picture drives
 * the real UI by its roles and names, so a renamed control fails here instead
 * of quietly photographing the wrong thing.
 */

test.beforeEach(async ({ page }) => {
  await page.goto(`/trips/${seed.tripId}`)
  await clearNotices(page)
  await page.waitForTimeout(800)
})

const dialog = (page: Page) => page.getByRole('dialog').last()
const firstDayCard = (page: Page) => page.locator('.dp-day-header').first().locator('xpath=..')

async function openTab(page: Page, label: string) {
  // A tab can carry a longer name for screen readers than its label ("Book" for the bookings).
  await page.getByRole('button', { name: new RegExp(`^${label}`) }).first().click()
  await page.waitForTimeout(800)
}

async function selectFirstDay(page: Page) {
  await page.locator('.dp-day-header').first().click()
  await page.waitForTimeout(900)
}

test('plan: a day card', async ({ page, shot }) => {
  await shot.element('PlanDayCard', firstDayCard(page))
})

test('plan: the day "+" menu', async ({ page, shot }) => {
  await selectFirstDay(page)
  await firstDayCard(page).locator('button[aria-label="Add to day"]').click()
  await expect(page.getByRole('button', { name: 'Add Note' })).toBeVisible()
  await shot.page_('PlanDayAddMenu')
})

test('plan: the route bar', async ({ page, shot }) => {
  await selectFirstDay(page)
  const bar = page.locator('[data-dp="route-tools"]').first()
  await expect(bar).toBeVisible()
  await shot.element('PlanRouteBar', bar)
})

test('plan: the places column', async ({ page, shot }) => {
  const column = page.getByPlaceholder('Search').first().locator('xpath=ancestor::div[contains(@class,"flex-col")][2]')
  await shot.element('PlacesColumn', column)
})

test('plan: the place inspector', async ({ page, shot }) => {
  await page.getByRole('option').first().click()
  await page.waitForTimeout(1200)
  await shot.page_('PlaceInspector')
})

test('plan: the edit place dialog', async ({ page, shot }) => {
  await page.getByRole('option').first().click()
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: 'Edit', exact: true }).first().click()
  await expect(dialog(page)).toBeVisible()
  await page.waitForTimeout(2500)
  await shot.element('PlaceForm', dialog(page))
})

test('plan: the day details', async ({ page, shot }) => {
  await selectFirstDay(page)
  await shot.page_('DayDetails')
})

test('plan: the stay editor', async ({ page, shot }) => {
  await selectFirstDay(page)
  const edit = page.getByRole('button', { name: /^(Edit accommodation|Add accommodation)$/ }).first()
  await edit.click()
  await expect(dialog(page)).toBeVisible()
  await shot.element('StayEditor', dialog(page))
})

test('plan: the map hover card', async ({ page, shot }) => {
  const marker = page.locator('.maplibregl-marker, .mapboxgl-marker, .leaflet-marker-icon').first()
  await marker.hover()
  await expect(page.getByTestId('tooltip')).toBeVisible()
  await shot.page_('MapHoverCard')
})

test('plan: the export dialog', async ({ page, shot }) => {
  await page.getByRole('button', { name: 'Export' }).first().click()
  await expect(dialog(page)).toBeVisible()
  await shot.element('ExportDialog', dialog(page))
})

// The demo trip books only its flight, so the booking views are shown on the Transports tab.
test('bookings: list view', async ({ page, shot }) => {
  await openTab(page, 'Transports')
  await page.getByRole('button', { name: 'List', exact: true }).first().click()
  await page.waitForTimeout(600)
  await shot.page_('BookingsList')
})

test('transports: timeline view', async ({ page, shot }) => {
  await openTab(page, 'Transports')
  await page.getByRole('button', { name: 'Timeline', exact: true }).first().click()
  await page.waitForTimeout(800)
  await shot.page_('BookingsTimeline')
})

test('bookings: the detail popup and the editor', async ({ page, shot }) => {
  await openTab(page, 'Transports')
  await page.getByRole('button', { name: 'Cards', exact: true }).first().click().catch(() => {})
  await page.locator('article').first().click()
  await expect(dialog(page)).toBeVisible()
  await shot.element('BookingDetail', dialog(page))
  await dialog(page).getByRole('button', { name: 'Edit', exact: true }).click()
  await page.waitForTimeout(800)
  await shot.element('BookingEditor', dialog(page))
})

test('transports: the add transport dialog', async ({ page, shot }) => {
  await openTab(page, 'Transports')
  await page.getByRole('button', { name: /^(Add transport|Transport)$/ }).first().click()
  await expect(dialog(page)).toBeVisible()
  await shot.element('TransportEditor', dialog(page))
})

test('costs: the add expense dialog', async ({ page, shot }) => {
  await openTab(page, 'Costs')
  await page.getByRole('button', { name: 'Add expense' }).first().click()
  await expect(dialog(page)).toBeVisible()
  await shot.element('ExpenseDialog', dialog(page))
})

test('costs: the table view', async ({ page, shot }) => {
  await openTab(page, 'Costs')
  await page.getByRole('button', { name: 'Table', exact: true }).click()
  await expect(page.getByRole('table')).toBeVisible()
  await shot.page_('CostsTable')
  // Back to the list for every other picture of the tab.
  await page.getByRole('button', { name: 'List', exact: true }).click()
})
