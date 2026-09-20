export default async function handler(req,res){
 const icao=String(req.query.icao||'').toUpperCase(); if(!/^[A-Z0-9]{4}$/.test(icao)) return res.status(400).json({error:'ICAO invalide'});
 try{const [m,t]=await Promise.all([fetch(`https://aviationweather.gov/api/data/metar?ids=${icao}&format=json`),fetch(`https://aviationweather.gov/api/data/taf?ids=${icao}&format=json`)]);const mj=await m.json(),tj=await t.json();res.setHeader('Cache-Control','s-maxage=120, stale-while-revalidate=300');res.json({icao,metar:mj?.[0]?.rawOb||null,taf:tj?.[0]?.rawTAF||null,source:'AviationWeather.gov'});}catch(e){res.status(502).json({error:'Météo aviation indisponible'});}
}
