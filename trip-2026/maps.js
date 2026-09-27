/* Offline geographic maps. All geography, road lines and overlays are local files. */
window.TripMap=(()=>{
 let active=null,generation=0,dataPromise;
 const colors=['#b54724','#236b8e','#7661a1','#38794d','#bd651b','#286c72'];
 function destroy(){generation++;if(active){active.remove();active=null}}
 function load(){if(!dataPromise)dataPromise=Promise.all(['base','roads','routes'].map(n=>TripFiles.json(`assets/geography/${n}.json`))).catch(e=>{dataPromise=null;throw e});return dataPromise}
 async function mount(container,opts){
  destroy();const token=generation,zh=opts.lang==='zh-Hans',txt=(en,cn)=>zh?cn:en,status=document.getElementById('map-status');
  if(!window.L){status.textContent=txt('Map library unavailable. Reconnect and reload.','地图组件不可用，请联网后重新载入。');return}
  try{
   const [base,roads,data]=await load();if(token!==generation||!container.isConnected)return;
   const map=active=L.map(container,{preferCanvas:true,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false,minZoom:opts.config.min_zoom,maxZoom:opts.config.max_zoom,zoomControl:false,attributionControl:true,maxBounds:opts.config.bounds,maxBoundsViscosity:.8});
   L.control.zoom({zoomInTitle:txt('Zoom in','放大'),zoomOutTitle:txt('Zoom out','缩小')}).addTo(map);
   map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');map.attributionControl.addAttribution(opts.config.attribution);
   map.createPane('geography');map.getPane('geography').style.zIndex=200;
   map.createPane('roads');map.getPane('roads').style.zIndex=250;
   map.createPane('routes');map.getPane('routes').style.zIndex=400;
   const geo=(data,style)=>L.geoJSON(data,{pane:'geography',interactive:false,style}).addTo(map);
   geo(base.land,{fillColor:'#f2efe4',fillOpacity:1,color:'#abb8a9',weight:1});
   geo(base.states,{fill:false,color:'#aea997',weight:1,dashArray:'5 6'});
   geo(base.lakes,{fillColor:'#b6d8e4',fillOpacity:1,color:'#8fbccf',weight:.8});
   const roadStyle=f=>({color:f.properties.kind==='S1100'?'#baaa87':f.properties.kind==='S1200'?'#c5bda9':'#d4d0c4',weight:f.properties.kind==='S1100'?2.5:f.properties.kind==='S1200'?1.6:1,opacity:.95});
   const highway=L.geoJSON(roads,{pane:'roads',interactive:false,filter:f=>['S1100','S1200'].includes(f.properties.kind),style:roadStyle}).addTo(map);
   const streets=L.geoJSON(roads,{pane:'roads',interactive:false,filter:f=>!['S1100','S1200'].includes(f.properties.kind),style:roadStyle});
   const routeLayers=L.featureGroup().addTo(map),fitPoints=[];
   const selectedRoutes=opts.selected==='overview'?data.routes:data.routes.filter(r=>r.date===opts.selected);const hasAccessGap=selectedRoutes.some(r=>r.legs.some(l=>l.connectors.some(([a,b])=>111*Math.hypot((a[0]-b[0])*.82,a[1]-b[1])>.8)));
   const latlng=c=>[c[1],c[0]];
   selectedRoutes.forEach(r=>{
    const ix=opts.days.findIndex(d=>d.date===r.date),day=opts.days[ix],color=colors[ix%colors.length];
    r.legs.forEach(leg=>{
     if(leg.coordinates.length>1){
      const coords=leg.coordinates.map(latlng);fitPoints.push(...coords);
      L.polyline(coords,{pane:'routes',color:'#fff',weight:7,opacity:.85,interactive:false}).addTo(routeLayers);
      const line=L.polyline(coords,{pane:'routes',color,weight:4,opacity:.95}).addTo(routeLayers);
      const tip=document.createElement('span');tip.textContent=r.date+' · '+(day?.title[opts.lang]||'');line.bindTooltip(tip,{sticky:true});
      if(opts.selected==='overview')line.on('click',()=>opts.onDay(r.date));
     }
     leg.connectors.forEach(c=>L.polyline(c.map(latlng),{pane:'routes',color:'#667678',weight:2,dashArray:'3 5',interactive:false}).addTo(routeLayers));
    });
   });
   const ids=opts.selected==='overview'?opts.overviewPlaceIds:(opts.routes.find(r=>r.date===opts.selected)?.ordered_place_ids||[]);
   const unique=[...new Set(ids)];
   unique.forEach((id,i)=>{
    const p=opts.places.find(p=>p.id===id);if(!p?.coordinates)return;
    const ll=[p.coordinates.latitude,p.coordinates.longitude];fitPoints.push(ll);
    const name=zh?`${p.name['zh-Hans']} (${p.name.en})`:p.name.en;
    const marker=L.marker(ll,{icon:L.divIcon({className:'geo-pin',html:`<span>${i+1}</span>`,iconSize:[30,30],iconAnchor:[15,15]}),title:name,alt:name,keyboard:true}).addTo(map);
    const label=document.createElement('span');label.textContent=name;marker.bindTooltip(label,{direction:'top',offset:[0,-12]});marker.on('click',()=>opts.onPlace(id));
   });
   const labels=L.layerGroup().addTo(map),roadLabels=L.layerGroup().addTo(map);
   function updateLabels(){
    const zoom=map.getZoom();if(zoom>=12){if(!map.hasLayer(streets))streets.addTo(map)}else if(map.hasLayer(streets))map.removeLayer(streets);
    labels.clearLayers();roadLabels.clearLayers();const bounds=map.getBounds();
    const cityCells=new Set();[...base.cities.features].sort((a,b)=>a.properties.rank-b.properties.rank).forEach(f=>{const ll=latlng(f.geometry.coordinates);if(!bounds.contains(ll)||(zoom<9&&f.properties.rank>5))return;const pixel=map.latLngToContainerPoint(ll),cell=Math.floor(pixel.x/125)+','+Math.floor(pixel.y/40);if(cityCells.has(cell))return;cityCells.add(cell);const el=document.createElement('span');el.textContent=zh&&opts.config.city_names[f.properties.name]?opts.config.city_names[f.properties.name]+' ('+f.properties.name+')':f.properties.name;L.marker(ll,{interactive:false,icon:L.divIcon({className:'geo-city',html:el,iconSize:[140,20],iconAnchor:[70,10]})}).addTo(labels)});
    if(zoom<10)return;
    const seen=new Set(),occupied=new Set();let n=0;const maxLabels=map.getSize().x<500?10:22;
    for(const f of roads.features){if(n>=maxLabels)break;const name=f.properties.name;if(!name||seen.has(name))continue;if(zoom<11&&f.properties.kind!=='S1100')continue;if(zoom<14&&!['S1100','S1200'].includes(f.properties.kind))continue;
     const cs=f.geometry.coordinates,ll=latlng(cs[Math.floor(cs.length/2)]);if(!bounds.contains(ll))continue;const px=map.latLngToContainerPoint(ll),cell=Math.floor(px.x/110)+','+Math.floor(px.y/45);if(occupied.has(cell))continue;occupied.add(cell);seen.add(name);n++;
     const el=document.createElement('span');el.textContent=name;L.marker(ll,{interactive:false,icon:L.divIcon({className:'geo-road-label',html:el,iconSize:[120,18],iconAnchor:[60,9]})}).addTo(roadLabels);
    }
   }
   const fit=()=>{if(fitPoints.length)map.fitBounds(L.latLngBounds(fitPoints),{padding:[35,35],maxZoom:14,animate:false});else map.setView(opts.config.center,opts.config.zoom)};
   document.getElementById('fit-route').onclick=fit;map.on('zoomend moveend',updateLabels);L.control.scale({imperial:false}).addTo(map);fit();updateLabels();
   status.textContent=txt('Offline planning map · drag to pan, pinch or use + / − to zoom.','离线行程参考地图 · 拖动平移，双指或使用 + / − 缩放。')+(hasAccessGap?' '+(opts.config.access_gap_note[opts.lang]||opts.config.access_gap_note.en):'');
  }catch(e){if(token===generation)status.textContent=txt('Map files are not saved yet. Connect and save the full offline pack, then reopen this map.','地图文件尚未保存。请联网保存完整离线包，再打开地图。');console.error(e)}
 }
 return {mount,destroy};
})();
