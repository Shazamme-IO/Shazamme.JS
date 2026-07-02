# Google Places / Google Maps API usage

Inventory of every Shazamme widget and component that depends on the Google
Places / Google Maps JavaScript API, the key it uses, and what it does.

The Google Maps JS API is loaded via the SDK helper `shazamme.gapi(key).maps([...])`
([shazamme.js](shazamme.js)), which injects the Maps loader and resolves once the
requested libraries (`places`, `maps`) are ready.

## Widgets

| Widget | File | Places API used | What it does | Key source |
|---|---|---|---|---|
| **Job Search / Job Results** | `duda-widget/job-search.js` | `google.maps.places.PlacesService`, `AutocompleteService` | Location field autocomplete → resolves place to lat/lng for proximity search | `data.config.googleApiKey` |
| **Job Alerts** | `duda-widget/job-alert.js` | `google.maps.places.PlacesService`, `AutocompleteService` | Location autocomplete on `#locationSelect` when creating/editing an alert | `data.config.apikey` |
| **Candidate Profile** | `duda-widget/candidate-profile.js` | `google.maps.places.Autocomplete` (address mode) | Address autocomplete on `[data-autocomplete=address]`; auto-fills street/city/state/postcode/country | passed into `enableGApi()` |
| **Screening Question (geo)** | [plugin/screening-question/plugin.js](plugin/screening-question/plugin.js) | `google.maps.places.PlacesService`, `AutocompleteService` | Autocomplete on geo-type screening questions | `site.configuration.gApiPlacesKey` |
| **Search embed** | [embed/shazamme-search/shazamme-search.js](embed/shazamme-search/shazamme-search.js) | Google Geocoding REST (`maps/api/geocode/json`) | `[data-gapi]` location fields → geocode to lat/lng for proximity filter | `c.googleApiKey` |

> Note: the `job-search.js`, `job-alert.js`, and `candidate-profile.js` widgets
> are the live Duda custom widgets. Working mirrors also live in the
> shazamme-backend repo under `_artifacts/existing-code/duda-widget/`.

## SDK core

- [shazamme.js](shazamme.js)
  - `gapi(key)` — sets up the Google Maps JS API loader and key injection; `.maps(['places'|'maps'])` resolves the requested libraries via `google.maps.importLibrary(...)`.
  - `geoCode()` — reverse geocoding through `https://maps.googleapis.com/maps/api/geocode/json?latlng=...&key=...` (lat/lng → human-readable address).

## Config & plumbing (shazamme-backend / client-portal)

- `prisma/schema.prisma` — per-site storage: `googleAPIKey`, `googleMapsAPIID`; feature flag `enableGoogleMapSearch`.
- `src/lib/settings-groups.ts` — `enableGoogleMapSearch` toggle under Website Settings → Site Integrations.
- `app/generated/prisma/enums.ts` — `NapDirectory.GOOGLE_MAPS` (unrelated NAP directory tracking, not widget Places).

## Summary

Widgets that use **Google Places**: **Job Results/Search**, **Job Alerts**,
**Candidate Profile**, and **geo Screening Questions**. The **search embed** uses
the Google **Geocoding** REST API (not the Places library). The SDK provides the
shared `gapi()` loader and reverse-geocoding helper.
