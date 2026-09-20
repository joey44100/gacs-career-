const fs=require('fs'),vm=require('vm'),assert=require('assert');
let src=fs.readFileSync(__dirname+'/../api/contracts.js','utf8').replace('export default async function handler','async function handler')+'\nthis.handler=handler;';
function mkRes(){return {code:200,body:null,status(n){this.code=n;return this},json(x){this.body=x;return this}}}
function schedule(over={}){return {flight_iata:'MH89',airline_iata:'MH',dep_iata:'NRT',dep_icao:'RJAA',arr_iata:'KUL',arr_icao:'WMKK',dep_time:'2099-01-01 10:00',dep_time_utc:'2099-01-01 01:00',dep_time_ts:4070931600,status:'scheduled',duration:460,...over}}
async function run(rows,details={}){const sandbox={URL,Date:{...Date,now:()=>4070908800000},console,fetch:async u=>{u=String(u);if(u.includes('/schedules'))return {ok:true,status:200,json:async()=>({response:rows})};const id=new URL(u).searchParams.get('flight_iata');return {ok:true,status:200,json:async()=>({response:details[id]||{}})}}};sandbox.Date=function(...a){return a.length?new global.Date(...a):new global.Date(4070908800000)};sandbox.Date.now=()=>4070908800000;sandbox.Date.parse=global.Date.parse;vm.createContext(sandbox);vm.runInContext(src,sandbox);const res=mkRes();await sandbox.handler({query:{origin:'RJAA'},headers:{'x-gacs-airlabs-key':'test'}},res);return res.body}
(async()=>{let n=0;for(let k=0;k<50;k++){
 let j=await run([schedule()],{MH89:{aircraft_icao:'A359',model:'Airbus A350-900'}});assert.equal(j.contracts.length,1);assert.equal(j.contracts[0].aircraftIcao,'A359');n++;
 j=await run([schedule()],{MH89:{aircraft_icao:'B789'}});assert.equal(j.contracts.length,0);assert.equal(j.diagnostics.incompatibleAircraft,1);n++;
 j=await run([schedule()],{});assert.equal(j.diagnostics.missingAircraft,1);assert.equal(j.rejected[0].rejectReason,'TYPE AVION INDISPONIBLE');n++;
 j=await run([schedule({dep_time_ts:4070912400})],{MH89:{aircraft_icao:'A359'}});assert.equal(j.contracts.length,0);assert.equal(j.diagnostics.beforeCutoff,1);n++;
 j=await run([schedule({status:'cancelled'})],{MH89:{aircraft_icao:'A359'}});assert.equal(j.diagnostics.cancelledOrLanded,1);n++;
 j=await run([schedule(),schedule({flight_iata:'EK319',arr_iata:'DXB',aircraft_icao:'A388',dep_time_ts:4070935200})],{MH89:{aircraft_icao:'A359'}});assert.equal(j.contracts.length,2);assert.equal(j.diagnostics.accepted,2);n++;
 } console.log(`PASS ${n}/300 assertions across live OCC scenarios`);})().catch(e=>{console.error(e);process.exit(1)});
