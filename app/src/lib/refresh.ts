// Background poll cadence for all data fetched from `/topics/<slug>/...`.
// Tuned to roughly match the researcher loop's iteration cadence so that new
// records and graph edges become visible without the user reloading the page.
// UI state (selection, filters, tabs, scroll) is never touched by refresh —
// only the underlying data each hook holds.
export const REFRESH_INTERVAL_MS = 2 * 60 * 1000;
