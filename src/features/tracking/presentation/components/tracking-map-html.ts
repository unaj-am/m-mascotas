// Documento compartido por iframe web y WebView Android. Solo recibe geometría numérica.
export const trackingMapHtml = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@6.17.0/dist/maplibre-gl.css">
<style>html,body,#map{margin:0;width:100%;height:100%;font:14px system-ui}#message{position:absolute;inset:0;display:grid;place-content:center;padding:24px;text-align:center;background:#faf8fc;color:#50367e;z-index:3}#center{position:absolute;top:12px;left:12px;z-index:2;padding:10px 14px;border:0;border-radius:10px;background:white;color:#50367e;box-shadow:0 1px 5px #999;cursor:pointer}</style></head>
<body><div id="map"></div><div id="message">Cargando mapa…</div><button id="center" type="button">Centrar paseador</button>
<script type="module">
function notify(type){const value=JSON.stringify({type});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(value);else window.parent.postMessage({type},'*');}
let pending=null,map=null,marker=null,ready=false,following=true;
const message=document.getElementById('message');
const fail=()=>{message.style.display='grid';message.textContent='No pudimos cargar el mapa. Revisá tu conexión.';notify('GPS_MAP_ERROR');};
const timer=setTimeout(fail,20000);
try{
const gl=await import('https://unpkg.com/maplibre-gl@6.17.0/dist/maplibre-gl.mjs');
function update(data){pending=data;if(!ready||!data.target)return;
const features=data.segments.filter(s=>s.length>=2).map(coordinates=>({type:'Feature',properties:{},geometry:{type:'LineString',coordinates}}));
map.getSource('route').setData({type:'FeatureCollection',features});
if(!marker){const el=document.createElement('div');el.style.cssText='width:18px;height:18px;border:3px solid white;border-radius:50%;background:#7051a5;box-shadow:0 0 6px #555';marker=new gl.Marker({element:el}).setLngLat(data.target).addTo(map);map.jumpTo({center:data.target,zoom:16});}
else{marker.setLngLat(data.target);if(following)map.easeTo({center:data.target,duration:600});}}
window.addEventListener('message',e=>{if(e.source!==window.parent&&e.source!==window)return;let data=e.data;try{if(typeof data==='string')data=JSON.parse(data);}catch{return;}if(data&&data.type==='GPS_MAP_UPDATE'&&Array.isArray(data.target)&&data.target.length===2&&data.target.every(Number.isFinite)&&Array.isArray(data.segments)){if(!map){pending=data;map=new gl.Map({container:'map',style:'https://tiles.openfreemap.org/styles/liberty',center:data.target,zoom:16,attributionControl:true});map.addControl(new gl.NavigationControl(),'top-right');map.on('dragstart',()=>following=false);map.on('load',()=>{ready=true;clearTimeout(timer);message.style.display='none';map.addSource('route',{type:'geojson',data:{type:'FeatureCollection',features:[]}});map.addLayer({id:'route-line',type:'line',source:'route',paint:{'line-color':'#7051a5','line-width':5,'line-opacity':0.85}});update(pending);});map.on('error',()=>{if(!ready)fail();});}else update(data);}});
document.getElementById('center').onclick=()=>{following=true;if(map&&pending&&pending.target)map.easeTo({center:pending.target,zoom:16});};
notify('GPS_MAP_READY');
}catch{clearTimeout(timer);fail();}
</script></body></html>`;
