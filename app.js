async function loadData(){
const res=await fetch('prayer-times-complete.json');
const data=await res.json();
function md(d){return String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
const today=md(new Date());
const row=data.find(x=>today>=x.start && today<=x.end);
const prayers=[['Fajr',row.fajr],['Sunrise',row.sunrise],['Dhuhr',row.dhuhr],['Asr',row.asr],['Maghrib',row.maghrib],['Isha',row.isha]];
document.getElementById('times').innerHTML=prayers.map(p=>`<tr><td>${p[0]}</td><td>${p[1]}</td></tr>`).join('');
}
function tick(){
const n=new Date();
document.getElementById('clock').innerText=n.toLocaleTimeString();
document.getElementById('date').innerText=n.toDateString();
}
setInterval(tick,1000);tick();loadData();