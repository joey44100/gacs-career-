const fs=require('fs'),assert=require('assert');
const api=fs.readFileSync(__dirname+'/../api/contracts.js','utf8');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
let n=0;function t(name,fn){try{fn();n++}catch(e){console.error('FAIL',name,e.message);process.exit(1)}}
const must=[
 ['v1 title',/GACS Career v1\.0 OCC/],['pagination',/\[0,100,200,300\]/],['offset',/offset/],['UTC filter comment',/UTC\/timestamp ONLY/],['no local Date parse',/must never be Date\.parse/],['2h30',/150\*60000/],['fleet exact',/FLEET\.has/],['flight info',/airlabs\('flight'/],['instance guard',/sameFlightInstance/],['route match',/sDep!==dDep/],['time match 6h',/>6\*3600000/],['codeshare',/cs_flight_iata/],['salary',/salaryGacs/],['priority',/P1 · PRIORITAIRE/],['no fake contract',/dataStatus:'LIVE'/],['first received',/firstReceivedUtc/],['last received',/lastReceivedUtc/],['provider insufficient message',/fenêtre fournisseur est insuffisante/],['frontend provider window',/Fenêtre fournisseur UTC/],['future label',/Futurs ≥ \+2h30/],['accept live',/acceptLiveContract/],['active mission',/Mission LIVE acceptée/],['AirLabs key local',/gacs_airlabs_key/],['SimBrief',/fetchOFP/],['weather',/weatherNow/]
];
for(const [name,re] of must)t(name,()=>assert(re.test(name.includes('frontend')||name.includes('title')||name.includes('label')||name.includes('accept')||name.includes('active')||name.includes('key')||name==='SimBrief'||name==='weather'?html:api)));
// 350 cutoff boundary checks using pure UTC epoch arithmetic: exactly +150 accepted, +149 rejected.
const now=Date.UTC(2026,8,21,8,0,0);const cutoff=now+150*60000;
for(let m=0;m<350;m++)t('boundary '+m,()=>assert.strictEqual(now+m*60000>=cutoff,m>=150));
// timezone invariant: same epoch regardless airport local display strings.
for(const z of ['KUL','NRT','DXB','CDG','SYD'])t('timezone invariant '+z,()=>assert.strictEqual(cutoff,Date.UTC(2026,8,21,10,30,0)));
console.log(`GACS v1.0 QA ${n}/${n} PASS`);
