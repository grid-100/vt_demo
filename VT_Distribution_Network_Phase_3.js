//@require Leaflet.VectorGrid
(function(){
	
    "use strict";
	
	/*
		Dapat memanfaatkan Leaflet var dnl = L.Class.extend({});
		disini menggunakan simple RETURN object L.VectorGrid sebagai bentuk abstraksi agar 
		lebih mudah diprogram via selector add/remove overlay layer
	*/
	
	var dnp3 = function(map, options) {
		
		var scope = this;
		this._map = map;
		this.options = options || {
			url: '' //default url
		};
		
		this.vgrid_rollover_id = -1;
		this.vgrid_selected_id = -1;
		this.timeout_id = -1;
		this.vectorgrid_zoomTresshold = 12;
		this.vectorgrid_zoomInteractiveTresshold = 13;
		
		this.showPopup = function(props, latlng){
			var popup			= "";
			if(Object.keys(props).length != 0){
				popup	 	 	+= '<div style="height:320px;width:300px;overflow-y:auto;overflow-x:auto;">';
				popup	 	 	+= '	<table class="table table-striped" style="width:100%;">';
				popup 			+= '		<tbody>';
				for(var i in props){
					popup 		+= '			<tr><th>'+i+'<th><td>&nbsp;&nbsp;:&nbsp;&nbsp;</td><td><em>'+ props[i] + '</em></td></tr>';
				}
				popup 			+= '		</tbody>';
				popup 			+= '	</table>';
				popup 			+= '</div>';
			}else{
				popup	 	 	+= '<p><b>N/A</b><br/><em>Data tidak tersedia</em></p>'
			}
			L.popup()
					.setContent(popup)
					.setLatLng(latlng)
					.openOn(scope._map);
		};
		
		this.vectorTileOptions = {
			interactive: true, 
			//zIndex: 3,
			//pane: 'OverlayPane',
			rendererFactory: L.canvas.tile,
			//rendererFactory: L.svg.tile,
			attribution: '',
			vectorTileLayerStyles: {
				'jaringan_distribusi_pln_line': function(properties, zoom) {
					//variable weight
					var multiplier = 1 << (zoom - scope.vectorgrid_zoomTresshold);
					var weight = 0.12;
					if (zoom < scope.vectorgrid_zoomTresshold ) return { 
						color: '#a5ffdd',
						weight: weight,
					};
					return {
						color: '#a5ffdd',
						weight: ( (zoom > 16 ) ? 0.04 :  0.12 ) * multiplier,
						opacity: 1
					}
				},
				'idn_dki_dcktrp_peta_lahan_v1': function(properties, zoom) {
					//variable weight
					var multiplier = 1 << (zoom - scope.vectorgrid_zoomTresshold);
					if(zoom < 14 ) return {weight:0, fill:false};
					return {
						color: '#165C66',
						weight: (zoom > 16 ) ? 0.02 * multiplier : 0.2,
						opacity: (zoom > 16 ) ? 0.8 : 0.5,
						fillOpacity: 0
					}
				}
			},
			//indexMaxZoom: 5,       // max zoom in the initial tile index
			dataMaxZoom:16,
			
			//Update styles
			getFeatureId: function(feature) {
				//return feature.properties["gid"];		//jika data datang dari pgsql
				return feature.properties["objectid"]; 	//sampe awal test
			}
		};
		
		//var vectorGridOverlay = L.vectorGrid.protobuf(url, vectorTileOptions);
		//vectorGridOverlay.addTo(map)

		/*	https://gis.stackexchange.com/questions/256888/styling-geoserver-pbf-vector-tiles-in-leaflet
			LIHAT DAFTAR LAYER >> e._eventParents[28]._dataLayerNames.jaringan_distribusi_pln_line
			LIHAT PROPERTIES >> e.properties
		*/
		this.vectorGridOverlay = L.vectorGrid.protobuf(scope.options.url, scope.vectorTileOptions)
			.on('click',function(e) {
				console.log(e);
				if(map.getZoom() < scope.vectorgrid_zoomInteractiveTresshold) return;
				var latlng = e.latlng;
				if (e.layer.feature) {
					var prop = e.layer.feature.properties;
					//var latlng = [e.latlng.lat,e.latlng.lng];
				} else {
					var prop = e.layer.properties;
					//var latlng = [Number(parcel.y),Number(parcel.x)];
				}
				if (scope.vgrid_selected_id != -1) {
					scope.vectorGridOverlay.resetFeatureStyle(scope.vgrid_selected_id);
				}
				//scope.vgrid_selected_id = prop["gid"];
				scope.vgrid_selected_id = prop["objectid"];
				if(scope.timeout_id > -1 ) clearTimeout(scope.timeout_id);
				scope.timeout_id = setTimeout(function() 
					{
						scope.vectorGridOverlay.setFeatureStyle(scope.vgrid_selected_id, {
							color: "red",
							weight: 6,
						});
						scope.showPopup(prop, latlng);
					}, 100);
				L.DomEvent.stop(e);
			})
			.on('mouseover',function(e) {
			
				if(map.getZoom() < scope.vectorgrid_zoomInteractiveTresshold) return;
				//console.log(e.layer);
				if (e.layer.feature) {
					var prop = e.layer.feature.properties;
					//var latlng = [e.latlng.lat,e.latlng.lng];
				} else {
					var prop = e.layer.properties;
					//var latlng = [Number(parcel.y),Number(parcel.x)];
				}
				if (scope.vgrid_rollover_id != -1) {
					scope.vectorGridOverlay.resetFeatureStyle(scope.vgrid_rollover_id);
				}
				//menjaga agar yang terpilih tetap terseleksi
				if (scope.vgrid_selected_id != -1) {
					scope.vectorGridOverlay.setFeatureStyle(scope.vgrid_selected_id, {
						color: "red",
						weight: 6,
					});
				}
				//scope.vgrid_rollover_id = prop["gid"];
				scope.vgrid_rollover_id = prop["objectid"];
				if(scope.timeout_id > -1 ) clearTimeout(scope.timeout_id);
				scope.timeout_id = setTimeout(function() 
					{
						if(scope.vgrid_rollover_id == scope.vgrid_selected_id) return;
						scope.vectorGridOverlay.setFeatureStyle(scope.vgrid_rollover_id, {
							color: "yellow",
							weight: 6,
						});
					}, 100);
				
				L.DomEvent.stop(e);
			});
		
		
		//map register event diletakkan disini walaupun berPOTENSI Orphan saat GC (Garbage Collection)
		map.on('click', function(){
			//console.log(dnl && dnl instanceof L.VectorGrid);
			//resetStyles();
			scope.vectorGridOverlay.resetFeatureStyle(scope.vgrid_selected_id);
			scope.vectorGridOverlay.resetFeatureStyle(scope.vgrid_rollover_id);
			//id perlu juga direset
			scope.vgrid_rollover_id = scope.vgrid_selected_id = -1;
		})
		
		/*
			RETURN object L.VectorGrid sebagai bentuk abstraksi agar 
			lebih mudah diprogram via selector add/remove overlay layer
		*/
		return this.vectorGridOverlay;
		
	};
		
    window.Distribution_Network_Phase_3 = dnp3;
}).call();