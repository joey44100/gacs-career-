const FLEET = new Set(['A388','A359','A35K','A339','A343','B772','B77W','B78X','A20N','A21N','B738','B739','CRJ9','C25C']);
const IATA = {RJAA:'NRT',RJTT:'HND',OMDB:'DXB',OTHH:'DOH',OMAA:'AUH',WSSS:'SIN',WMKK:'KUL',VTBS:'BKK',VHHH:'HKG',LFPG:'CDG',EGLL:'LHR',LSZH:'ZRH',LEBL:'BCN',LFRS:'NTE',LFMN:'NCE',YSSY:'SYD'};
const REJECT_STATUS = new Set(['cancelled','landed']);
const toMs = v => { const n=Number(v||0); return n>0 ? n*1000 : NaN; };
const parseUtc = v => v ? Date.parse(String(v).replace(' ','T')+(String(v).includes('Z')?'':'Z')) : NaN;
function scheduleTime(f){ return toMs(f.dep_time_ts) || parseUtc(f.dep_time_utc) || toMs(f.dep_estimated_ts) || parseUtc(f.dep_estimated_utc); }
function norm(f, detail={}){
 const ac=String(detail.aircraft_icao||f.aircraft_icao||'').trim().toUpperCase();
 return {flight:f.flight_iata||f.flight_icao||f.flight_number||'—',airline:f.airline_iata||f.airline_icao||'',originIata:f.dep_iata||'',originIcao:f.dep_icao||'',destinationIata:f.arr_iata||'',destinationIcao:f.arr_icao||'',stdLocal:f.dep_time||'',stdUtc:f.dep_time_utc||'',stdTs:scheduleTime(f),aircraftIcao:ac,aircraftModel:detail.model||f.model||'',registration:detail.reg_number||f.reg_number||'',depTerminal:f.dep_terminal||detail.dep_terminal||'',depGate:f.dep_gate||detail.dep_gate||'',arrTerminal:f.arr_terminal||detail.arr_terminal||'',arrGate:f.arr_gate||detail.arr_gate||'',durationMin:Number(f.duration||detail.duration)||null,status:String(f.status||detail.status||'scheduled').toLowerCase(),dataStatus:'LIVE',source:'AirLabs Schedules + Flight'};
}
async function airlabs(path,params,key){const u=new URL('https://airlabs.co/api/v9/'+path);for(const [k,v] of Object.entries(params))if(v!==''&&v!=null)u.searchParams.set(k,String(v));u.searchParams.set('api_key',key);const r=await fetch(u);const d=await r.json();if(!r.ok||d.error)throw new Error(d.error?.message||d.error?.code||`AirLabs HTTP ${r.status}`);return d.response;}
async function enrich(rows,key){
 // Schedules documents do not guarantee aircraft_icao. Enrich only useful future rows via Flight API.
 const out=[]; const batch=8;
 for(let i=0;i<rows.length;i+=batch){const part=rows.slice(i,i+batch);const got=await Promise.all(part.map(async f=>{if(f.aircraft_icao)return norm(f);const id=f.flight_iata||f.flight_icao;if(!id)return norm(f);try{const d=await airlabs('flight',f.flight_iata?{flight_iata:id}:{flight_icao:id},key);return norm(f,d||{});}catch{return norm(f);}}));out.push(...got);}
 return out;
}
export default async function handler(req,res){
 const origin=String(req.query.origin||'').toUpperCase(); if(!/^[A-Z0-9]{4}$/.test(origin))return res.status(400).json({error:'Origin ICAO invalide'});
 const key=req.headers['x-gacs-airlabs-key']||process.env.AIRLABS_API_KEY||''; const now=Date.now(); const cutoff=now+150*60000; const horizon=now+10*3600000;
 if(!key)return res.status(200).json({setupRequired:true,contracts:[],diagnostics:{received:0},message:'Clé AirLabs requise.'});
 try{
  const iata=IATA[origin]||''; const raw=await airlabs('schedules',{[iata?'dep_iata':'dep_icao']:iata||origin,limit:50},key); const all=Array.isArray(raw)?raw:[];
  const diag={received:all.length,validTime:0,beforeCutoff:0,afterHorizon:0,cancelledOrLanded:0,candidatesForEnrichment:0,enrichedWithAircraft:0,missingAircraft:0,incompatibleAircraft:0,accepted:0,windowHours:10,cutoff:new Date(cutoff).toISOString(),provider:'AirLabs v9'};
  const candidates=[];
  for(const f of all){const t=scheduleTime(f);if(!Number.isFinite(t)){continue}diag.validTime++;if(t<cutoff){diag.beforeCutoff++;continue}if(t>horizon){diag.afterHorizon++;continue}if(REJECT_STATUS.has(String(f.status||'').toLowerCase())){diag.cancelledOrLanded++;continue}candidates.push(f)}
  diag.candidatesForEnrichment=candidates.length;
  const rows=await enrich(candidates,key);
  const rejected=[]; const contracts=[];
  for(const f of rows){if(f.aircraftIcao)diag.enrichedWithAircraft++;else{diag.missingAircraft++;rejected.push({...f,rejectReason:'TYPE AVION INDISPONIBLE'});continue}if(!FLEET.has(f.aircraftIcao)){diag.incompatibleAircraft++;rejected.push({...f,rejectReason:`${f.aircraftIcao} HORS FLOTTE`});continue}contracts.push(f)}
  contracts.sort((a,b)=>a.stdTs-b.stdTs); diag.accepted=contracts.length;
  return res.status(200).json({origin,originIata:iata,provider:'AirLabs v9',generatedAt:new Date(now).toISOString(),contracts:contracts.slice(0,30),diagnostics:diag,rejected:rejected.slice(0,12),message:contracts.length?'':`AirLabs répond : ${diag.received} départ(s) reçus, ${diag.candidatesForEnrichment} dans la fenêtre +2h30/+10h, ${diag.missingAircraft} sans type avion, ${diag.incompatibleAircraft} hors flotte.`});
 }catch(e){return res.status(502).json({error:e.message,diagnostics:{provider:'AirLabs v9',failed:true}})}
}
