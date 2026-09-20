# GACS PC Bridge (planned connector)
The iPhone PWA cannot directly access Windows SimConnect or `%localappdata%\\SayIntentionsAI`.
The bridge must run on the MSFS PC and relay only the required telemetry to GACS over an authenticated channel.
Targets: SimConnect aircraft/flight state, landing rate, block/off/on times, and SayIntentions `flight.json` / SimAPI.
No API secret should be embedded in the browser app.
