# GACS Career v0.6 LIVE

PWA + Vercel serverless gateway.

## Live integrations
- AviationWeather.gov METAR/TAF: ready, no key.
- SimBrief latest OFP: ready via Pilot ID/Alias.
- Flightradar24: server adapter ready; requires `FR24_API_TOKEN`.
- Future schedules: provider adapter ready; requires `GACS_SCHEDULE_API_URL` (+ optional token). GACS intentionally returns no contracts when absent.
- Navigraph: UI/status prepared; requires developer OAuth credentials before implementation can be activated.
- SayIntentions/MSFS: requires PC bridge for local files/SimConnect.

Secrets belong in Vercel Environment Variables, never in index.html.
