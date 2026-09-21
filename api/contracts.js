const FLEET=new Set(['A388','A359','A35K','A339','A343','B772','B77W','B78X','A20N','A21N','B738','B739','CRJ9','C25C']);
const IATA={RJAA:'NRT',RJTT:'HND',OMDB:'DXB',OTHH:'DOH',OMAA:'AUH',WSSS:'SIN',WMKK:'KUL',VTBS:'BKK',VHHH:'HKG',LFPG:'CDG',EGLL:'LHR',LSZH:'ZRH',LEBL:'BCN',LFRS:'NTE',LFMN:'NCE',YSSY:'SYD'};
const AIRLINES={EK:'Emirates',UAE:'Emirates',QR:'Qatar Airways',QTR:'Qatar Airways',EY:'Etihad Airways',ETD:'Etihad Airways',SQ:'Singapore Airlines',SIA:'Singapore Airlines',MH:'Malaysia Airlines',MAS:'Malaysia Airlines',TG:'Thai Airways',THA:'Thai Airways',JL:'Japan Airlines',JAL:'Japan Airlines',NH:'ANA',ANA:'ANA',QF:'Qantas',QFA:'Qantas',GA:'Garuda Indonesia',GIA:'Garuda Indonesia',PR:'Philippine Airlines',PAL:'Philippine Airlines',AI:'Air India',AIC:'Air India'};
const CLIENT=new Set(['EK','UAE','QR','QTR','EY','ETD']);
const REJECT_STATUS=new Set(['cancelled','landed']);
const ms=v=>{const n=Number(v||0);return n>0?n*1000:NaN};
const utc=v=>v?Date.parse(String(v).replace(' ','T')+(String(v).includes('Z')?'':'Z')):NaN;
const schedTime=f=>ms(f.dep_time_ts)||utc(f.dep_time_utc)||ms(f.dep_estimated_ts)||utc(f.dep_estimated_utc);
const clean=s=>String(s||'').trim().toUpperCase();
const airlineName=f=>AIRLINES[clean(f.airline_iata)]||AIRLINES[clean(f.airline_icao)]||f.airline_iata||f.airline_icao||'Compagnie non renseignée';
function base(f){return {flight:f.flight_iata||f.flight_icao||f.flight_number||'—',flightIcao:f.flight_icao||'',airlineCode:f.airline_iata||f.airline_icao||'',airline:airlineName(f),operatorFlight:f.cs_flight_iata||'',operatorCode:f.cs_airline_iata||'',originIata:f.dep_iata||'',originIcao:f.dep_icao||'',destinationIata:f.arr_iata||'',destinationIcao:f.arr_icao||'',stdLocal:f.dep_time||'',stdUtc:f.dep_time_utc||'',staLocal:f.arr_time||'',staUtc:f.arr_time_utc||'',stdTs:schedTime(f),depTerminal:f.dep_terminal||'',depGate:f.dep_gate||'',arrTerminal:f.arr_terminal||'',arrGate:f.arr_gate||'',durationMin:Number(f.duration)||null,status:String(f.status||'scheduled').toLowerCase(),aircraftIcao:clean(f.aircraft_icao),aircraftModel:f.model||'',registration:f.reg_number||'',dataStatus:'LIVE',source:'AirLabs Schedules'}}
function merge(f,d={}){const b=base(f);return {...b,flightIcao:d.flight_icao||b.flightIcao,aircraftIcao:clean(d.aircraft_icao||b.aircraftIcao),aircraftModel:d.model||b.aircraftModel,registration:d.reg_number||b.registration,depTerminal:b.depTerminal||d.dep_terminal||'',depGate:b.depGate||d.dep_gate||'',arrTerminal:b.arrTerminal||d.arr_terminal||'',arrGate:b.arrGate||d.arr_gate||'',source:d.aircraft_icao?'AirLabs Schedules + Flight Info':b.source}}
async function airlabs(path,params,key){const u=new URL('https://airlabs.co/api/v9/'+path);for(const[k,v]of Object.entries(params))if(v!==''&&v!=null)u.searchParams.set(k,String(v));u.searchParams.set('api_key',key);const r=await fetch(u,{headers:{Accept:'application/json'}});let d={};try{d=await r.json()}catch{}if(!r.ok||d.error){const msg=d.error?.message||d.error?.code||`HTTP ${r.status}`;const e=new Error(`AirLabs ${path}: ${msg}`);e.status=r.status;throw e}return d.response}
function dedupe(rows){const seen=new Set();return rows.filter(f=>{const op=f.cs_flight_iata||f.flight_iata||f.flight_icao||f.flight_number;const k=`${op}|${f.dep_time_utc||f.dep_time||''}|${f.arr_iata||f.arr_icao||''}`;if(seen.has(k))return false;seen.add(k);return true})}
function preScore(f){let s=0;const c=clean(f.airline_iata||f.airline_icao);if(CLIENT.has(c))s+=100;const dur=Number(f.duration)||0;if(dur>=300)s+=30;else if(dur>=150)s+=15;if(f.aircraft_icao&&FLEET.has(clean(f.aircraft_icao)))s+=200;return s}
function contractScore(f,now){let s=50;const c=clean(f.airlineCode);if(CLIENT.has(c))s+=35;if(f.durationMin>=300)s+=12;if(f.depGate)s+=3;if(f.registration)s+=2;const hrs=(f.stdTs-now)/36e5;if(hrs>=3&&hrs<=6)s+=8;return Math.round(s)}
function pay(f){const h=Math.max(1,(f.durationMin||180)/60);const wide=new Set(['A388','A359','A35K','A339','A343','B772','B77W','B78X']).has(f.aircraftIcao);return Math.round((320+h*(wide?145:95)+(CLIENT.has(clean(f.airlineCode))?180:0))/10)*10}
function priority(score){return score>=95?'P1 · PRIORITAIRE':score>=78?'P2 · RECOMMANDÉ':'P3 · STANDARD'}
export default async function handler(req,res){
 const origin=clean(req.query.origin);if(!/^[A-Z0-9]{4}$/.test(origin))return res.status(400).json({error:'Origin ICAO invalide'});
 const key=req.headers['x-gacs-airlabs-key']||process.env.AIRLABS_API_KEY||'';if(!key)return res.status(200).json({setupRequired:true,contracts:[],message:'Clé AirLabs requise.'});
 const now=Date.now(),cutoff=now+150*60000,horizon=now+10*3600000,iata=IATA[origin]||'';
 try{
  const raw=await airlabs('schedules',{[iata?'dep_iata':'dep_icao']:iata||origin,limit:100},key);const all=Array.isArray(raw)?raw:[];
  const diag={received:all.length,deduplicated:0,validTime:0,beforeCutoff:0,afterHorizon:0,cancelledOrLanded:0,candidates:0,directAircraft:0,flightInfoAttempted:0,flightInfoSuccess:0,flightInfoErrors:0,missingAircraft:0,incompatibleAircraft:0,accepted:0,flightInfoErrorSample:''};
  const unique=dedupe(all);diag.deduplicated=unique.length;let candidates=[];
  for(const f of unique){const t=schedTime(f);if(!Number.isFinite(t))continue;diag.validTime++;if(t<cutoff){diag.beforeCutoff++;continue}if(t>horizon){diag.afterHorizon++;continue}if(REJECT_STATUS.has(String(f.status||'').toLowerCase())){diag.cancelledOrLanded++;continue}candidates.push(f)}
  diag.candidates=candidates.length;diag.directAircraft=candidates.filter(f=>clean(f.aircraft_icao)).length;
  candidates.sort((a,b)=>preScore(b)-preScore(a)||schedTime(a)-schedTime(b));
  // Avoid exhausting personal/free API quotas: enrich at most 16 untyped physical flights per refresh.
  const enrichTargets=candidates.filter(f=>!clean(f.aircraft_icao)).slice(0,16);const details=new Map();
  for(const f of enrichTargets){const id=f.cs_flight_iata||f.flight_iata||f.flight_icao; if(!id)continue;diag.flightInfoAttempted++;try{const d=await airlabs('flight',id===f.flight_icao?{flight_icao:id}:{flight_iata:id},key);if(d){details.set(f,d);if(d.aircraft_icao)diag.flightInfoSuccess++}}catch(e){diag.flightInfoErrors++;if(!diag.flightInfoErrorSample)diag.flightInfoErrorSample=e.message}}
  const rows=candidates.map(f=>merge(f,details.get(f)||{}));const contracts=[],rejected=[];
  for(const f of rows){if(!f.aircraftIcao){diag.missingAircraft++;rejected.push({...f,rejectReason:'TYPE NON PUBLIÉ / NON RÉCUPÉRÉ'});continue}if(!FLEET.has(f.aircraftIcao)){diag.incompatibleAircraft++;rejected.push({...f,rejectReason:`${f.aircraftIcao} · HORS FLOTTE`});continue}const score=contractScore(f,now);contracts.push({...f,score,priority:priority(score),salaryGacs:pay(f),salaryStatus:'SCÉNARIO GACS',sceneryStatus:'À VÉRIFIER'})}
  contracts.sort((a,b)=>b.score-a.score||a.stdTs-b.stdTs);diag.accepted=contracts.length;
  const message=contracts.length?`${contracts.length} contrat(s) GACS admissible(s).`:`Aucun contrat exact trouvé. ${diag.missingAircraft} vol(s) sans type exploitable, ${diag.incompatibleAircraft} hors flotte.${diag.flightInfoErrors?' Flight Info a échoué '+diag.flightInfoErrors+' fois : '+diag.flightInfoErrorSample:''}`;
  return res.status(200).json({origin,originIata:iata,provider:'AirLabs v9',generatedAt:new Date(now).toISOString(),cutoff:new Date(cutoff).toISOString(),horizon:new Date(horizon).toISOString(),contracts:contracts.slice(0,20),diagnostics:diag,rejected:rejected.slice(0,20),message});
 }catch(e){return res.status(502).json({error:e.message,diagnostics:{provider:'AirLabs v9',failed:true}})}
}
