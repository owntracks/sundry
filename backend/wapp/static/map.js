/*
 * JP Mens
 */

//  url = 'http://127.0.0.1:5000/gpx/jpm/5s/2014-01-08/2014-01-09';

var map = null;

$(function() {
  $('a#showmap').bind('click', function() {	// showmap(url) {

  	var url = $('#mapurl').val();


	if (map == null) {

		map = L.map('map');

		L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
			maxZoom: 18,
			attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>'
		}).addTo(map);

		var popup = L.popup();

		function onMapClick(e) {
			popup
				.setLatLng(e.latlng)
				.setContent("Position " + e.latlng.toString())
				.openOn(map);
		}
		map.on('click', onMapClick);
	}



	/* GPX begin */
	new L.GPX(url, {
		async: true,
		marker_options: {
		      startIconUrl: 'static/pin-icon-start.png',
		      endIconUrl: 'static/pin-icon-end.png',
		      shadowUrl: 'static/pin-shadow.png'
		}
		}).on('loaded', function(e) {
		  map.fitBounds(e.target.getBounds());
		}).addTo(map);

	/* GPX end */

  });
});
