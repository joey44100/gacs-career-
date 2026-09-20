# GACS Career v0.7 LIVE

PWA de carrière MSFS / OCC.

## Ce qui fonctionne sans clé payante
- PWA HTTPS / mobile
- carrière locale persistante
- METAR/TAF
- récupération du dernier OFP SimBrief par Pilot ID
- test local SayIntentions `http://localhost:43117/flightJSON` depuis le PC

## Contract Board LIVE
La v0.7 supporte **AirLabs Schedules** directement. Crée une clé AirLabs (leur documentation indique un accès Free), colle-la dans `LIVE Integrations`, puis clique `Enregistrer + tester`. La clé reste dans le stockage local du navigateur et est transmise uniquement à la fonction Vercel via HTTPS pour la requête AirLabs. Elle n'est pas commitée dans GitHub.

Le board applique ensuite : origine actuelle, départ >= 2h30, statut non annulé, et type ICAO appartenant exactement à la flotte GACS.

FR24 est optionnel pour validation/tracking et nécessite son propre abonnement API. Navigraph nécessite des credentials développeur accordés par Navigraph. MSFS nécessite le bridge Windows SimConnect.
