var map;
var markers = {};
var refresh = 60000;
var bus = [];

// __author__    = 'Jan-Piet Mens <jpmens()gmail.com>'
// __copyright__ = 'Copyright 2015 Jan-Piet Mens'
// __license__   = """Eclipse Public License - v 1.0 (http://www.eclipse.org/legal/epl-v10.html)"""

// https://developers.google.com/maps/documentation/javascript/datalayer

function reload() {
	getdata();
	setmarkers();
        setTimeout(reload, refresh);
}

function getdata() {

        var json = (function () {
            var json = null; 
            $.ajax({ 
		'type' : 'GET',
                'async': false, 
		'cache' : false,
                'global': true, 
		'url'   : 'lastloc.php',
                'dataType': "json", 
                'success': function (data) {
                     json = data; 
		     console.log("DATA = " + JSON.stringify(json));
			for (var n = 0; n < json.length; n++) {
				bus[n] = json[n];
				var id = bus[n].id;
				// console.log("ID=", id);
			}
			return (json.length);
                 },
		'error': function(err) {
			alert("Can't load data: " + JSON.stringify(err));
		 },
            });
        })();
}

/**
 * The TrackControl adds a control to the map that clears GeoJSON tracks.
 * This constructor takes the track DIV as an argument.
 */
function TrackControl(controlDiv, map) {

  // Set CSS for the control border
  var controlUI = document.createElement('div');
  controlUI.style.backgroundColor = '#fff';
  controlUI.style.border = '2px solid #fff';
  controlUI.style.borderRadius = '3px';
  controlUI.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
  controlUI.style.cursor = 'pointer';
  controlUI.style.marginBottom = '22px';
  controlUI.style.textAlign = 'center';
  controlUI.title = 'Click to clear all tracks on the map';
  controlDiv.appendChild(controlUI);

  // Set CSS for the control interior
  var controlText = document.createElement('div');
  controlText.style.color = 'rgb(25,25,25)';
  controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
  controlText.style.fontSize = '16px';
  controlText.style.lineHeight = '38px';
  controlText.style.paddingLeft = '5px';
  controlText.style.paddingRight = '5px';
  controlText.innerHTML = 'Clear tracks';
  controlUI.appendChild(controlText);

  // Setup the click event listeners
  google.maps.event.addDomListener(controlUI, 'click', function() {

	// Remove all features for the data layer, i.e. clear the track
	map.data.forEach(function(feature) {
		map.data.remove(feature);
	});
  });

}

function initialize() {
	var lat;
	var lon;

	if (getdata() < 1) {
		return;
	}
	
	lat = bus[0].lat;
	lon = bus[0].lon;
	tst = bus[0].tst;
	topic = bus[0].topic;

	var center = new google.maps.LatLng(lat,lon);
	
	mapOptions = {
		center: center,
		zoom: 4, // 9
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		scrollwheel: false,
		disableDefaultUI: false,
		panControl: false,
		scaleControl: false,
		streetViewControl: true,
		overviewMapControl: true,
	};

	map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

	// Create the DIV to hold the control and call the TrackControl()
	// constructor passing in this DIV.

	var trackControlDiv = document.createElement('div');
	var trackControl = new TrackControl(trackControlDiv, map);

	trackControlDiv.index = 1;
	map.controls[google.maps.ControlPosition.BOTTOM_LEFT].push(trackControlDiv);


	setmarkers();
        setTimeout(reload, refresh);
}

function setmarkers() {

	var do_pan = (bus.length) == 1 ? true : false;

	// console.log("bus.length=" + bus.length);
	for (var n = 0; n < bus.length; n++) {
		var id = bus[n].id;
		// console.log("bus.id=" + id);

		if (markers.hasOwnProperty(id)) {
			console.log("UPDATE " + id + " marker");
			var LatLng = new google.maps.LatLng(bus[n].lat, bus[n].lon);
			markers[id].setPosition(LatLng);
			markers[id].setTitle(bus[n].description + " " + bus[n].tst);
			if (do_pan) {
				map.panTo(markers[id].getPosition());
			}
		} else {
			console.log("NEW " + id + " marker");
			var LatLng = new google.maps.LatLng(bus[n].lat, bus[n].lon); 
			/*
	                var m = new google.maps.Marker({
	                    position: LatLng,
	                    map: map,
	                    title: bus[n].description + " " + bus[n].tst
	                });
			*/

			// var letter = String.fromCharCode("A".charCodeAt(0) + n);
			var m = new google.maps.Marker({
				position: LatLng,
				map: map,
	                        title: bus[n].description + " " + bus[n].tst,
				// icon: "http://maps.google.com/mapfiles/marker" + letter + ".png"
				icon: "marker.php?tid=" + id,
			});

			markers[id] = m;
	                info(map, m, bus[n]);
			if (do_pan) {
				map.panTo(m.getPosition());
			}
		}
	}
}

function info(map, marker, data) {
	var infowindow = new google.maps.InfoWindow();

	google.maps.event.addListener(marker, "click", function(e) {
		infowindow.setContent(data.description);
		infowindow.open(map, marker);

		// alert(data.topic);

		// Load GeoJSON onto map
		map.data.loadGeoJson('geo-json.php?topic=' + data.topic);

		// Set the stroke width, and fill color for each polygon
		var featureStyle = {
			fillColor: 'green',
			strokeColor: 'red',
			strokeWeight: 4,
			title: "nothing yet",
		}
		map.data.setStyle(featureStyle);
	});
}

google.maps.event.addDomListener(window, 'load', initialize);
