angular.module( 'sample.history', [
  'ui.router',
  'angular-storage',
  'angular-jwt'
])
.config(function($stateProvider) {
  $stateProvider.state('history', {
    url: '/history',
    controller: 'HistoryCtrl',
    templateUrl: 'history/history.html',
    data: {
      requiresLogin: true,
	  hidesFooter: false
    },
	bodyId: 'history'
  });
})
.controller( 'HistoryCtrl', function HistoryController( $http, $scope, $window, store, API, AuthenticationService) {
	L.mapbox.accessToken = 'pk.eyJ1IjoiYmluYXJ5YnVja3MiLCJhIjoiY2lncWtjeTM5MDA0OXZna2x1aXI2dGd5NCJ9.2P2lIrXY1xk1OMjKeI84xg';
	var map = L.mapbox.map('map', 'binarybucks.o428i4c6').setView([40, -74.50], 9);
	var mapMarkerGroup; 
	var selectedMarker; 
	$scope.preferencesHideSidebar = store.get("preferences.history.hideSidebar") ;
	$scope.preferencesQueryUnlimit  = store.get("preferences.history.queryUnlimit") ;
	
	zoomToCurrentLocation = function(position) {
			map.setView([position.coords.latitude, position.coords.longitude], 9);
	}

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(zoomToCurrentLocation);
    } else {
		
    }




	API.get(API.endpoints.devices).then(function(response) {

		$scope.devices = response.data;
    }, function(error) {
		console.log(error);
    });
	


	$scope.queryScope=1; // 1 => year, 2 =>  month, 3 => day 
	$scope.queryLimit = !$scope.preferencesQueryUnlimit;


	var max = new Date(); 
	var min; 
	
	picker = new Pikaday({   
	
		maxDate: max, 
		field: document.getElementById('dayPickerFiled'),
		trigger: document.getElementById('dayPicker'), 
		i18n: {
			previousMonth : 'Previous Month',
			nextMonth     : 'Next Month',
			months        : ['January','February','March','April','May','June','July','August','September','October','November','December'],
			weekdays      : ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
			weekdaysShort : ['S','M','T','W','T','F','S']
		},

		onSelect: function(date){
		   $scope.$apply(function(){
				y = date.getFullYear();
				m = date.getMonth()+1; 
				d = date.getDate();
				
				$scope.queryLimit = false;
				$scope.yearLabel =  y
				$scope.monthLabel = getMonthLabel(m);
				$scope.dayLabel = d
				$scope.queryScope=3;
			});

			queryHistory(assembleFromToParameters()); 
		}
	});
	

	

	
	var y = max.getFullYear();
	var m = max.getMonth()+1; 
	var d; 

	var months = [
		{i: 1, l: "January", v: true}, 
		{i: 2, l: "February", v: true}, 
		{i: 3, l: "March", v: true}, 
		{i: 4, l: "April", v: true}, 
		{i: 5, l: "May", v: true}, 
		{i: 6, l: "June", v: true}, 
		{i: 7, l: "July", v: true}, 
		{i: 8, l: "August", v: true}, 	
		{i: 9, l: "September", v: true}, 
		{i: 10, l: "October", v: true}, 
		{i: 11, l: "November", v: true}, 
		{i: 12, l: "December", v: true}, 		
		]
	var firstValidMonth;
		
	var picker; 
	var padStr = function(num) {
		return num <= 9 ? "0"+num : ""+num;
	}

	var assembleDate = function(yyyy, mm, dd) {
		return (yyyy || 2010)+"-"+padStr(mm || 1 )+"-"+padStr(dd || 1);
	}
	

	var assembleToDate = function() {
		return (yTo || 2010)+"-"+padStr(mTo || 1 )+"-"+padStr(dTo || 1);
	}
	
	// http://stackoverflow.com/questions/222309/calculate-last-day-of-month-in-javascript
	function getDaysInMonth(yyyy, mm) {
		return mm===2 ? yyyy & 3 || !(yyyy%25) && yyyy & 15 ? 28 : 29 : 30 + (mm+(mm>>3)&1);	
	}

	var assembleFromToParameters = function() {
		console.log("selected date filter changed to: " + assembleDate(y,m,d));
	
		console.log("queryScope is : " + $scope.queryScope);
		console.log("queryLimit is : " + $scope.queryLimit);

		var from;
		var to; 
		
		var inCurrentYear = (y == max.getFullYear()); 
		var inCurrentYearAndMonth = inCurrentYear && (m == max.getMonth()+1); 

		console.log("inCurrentYear: " + inCurrentYear)

		// Limit fetch to last day
		if($scope.queryLimit) {
			if($scope.queryScope == 1) {
				var day = assembleDate(y, inCurrentYear ? (max.getMonth()+1) : 12, inCurrentYear ? max.getDate() :  31);
				
				from = day + "T00:00:01";
				to = day + "T23:59:59";		
			
			} else if ($scope.queryScope == 2) {
				var day = assembleDate(y, inCurrentYearAndMonth ? (max.getMonth()+1) : m, inCurrentYearAndMonth ? max.getDate() : getDaysInMonth(y, m));
				from = day +"T00:00:01";
				to = day + "T23:59:59";		
			} else if($scope.queryScope == 3) {
				from = assembleDate(y,m, d)+"T00:00:01";	
				to = assembleDate(y,m, d)+"T23:59:59";				
			}
		} else {
			if($scope.queryScope == 1) {
				from = assembleDate(y,1, 1)+"T00:00:01";	
				to = assembleDate(y, 12, 31)+"T23:59:59";
			} else if ($scope.queryScope == 2) {
				from = assembleDate(y,m, 1)+"T00:00:01";		
				to = assembleDate(y, m, getDaysInMonth(y, m))+"T23:59:59";				
			} else if($scope.queryScope == 3) {
				from = assembleDate(y,m, d)+"T00:00:01";	
				to = assembleDate(y,m, d)+"T23:59:59";				
			}
		}
		
		console.log("query from: " + from);
		console.log("query to: " + to);

		return {from: from, to: to};
	}
	
	queryHistory = function(fromTo) {
		return API.get(API.endpoints.deviceHistory, {pathParams: {deviceId: $scope.device.id}, params: fromTo}).then(function(response) {
			console.log(response);
			$scope.records = (response.data && response.data.count > 0) ? response.data.locations : undefined

			
			var markerArray = [];

			// Clear shown markers if present
			if(mapMarkerGroup)	
				map.removeLayer(mapMarkerGroup)
			
			// Clear selected marker if present
			if(selectedMarker) {
					map.removeLayer(selectedMarker)
					selectedMarker = undefined;
			}
			
			if($scope.records ) {
				for (index = 0, len = res.count; index < len; ++index) {
					markerArray.push(L.circleMarker([$scope.records[index].lat, $scope.records[index].lon], { fill: true, opacity: 1, fillColor: '#FF9C00', fillOpacity: 1 , stroke: true, color: '#FFF', weight: 1, recordsIndex: index}).setRadius(4));
				}
				
				
				mapMarkerGroup = L.featureGroup(markerArray).addTo(map);
				map.fitBounds(mapMarkerGroup.getBounds());
				mapMarkerGroup.on('click', function(e) {
					
					console.log("Clicked on marker with object");
					console.log(e)
					console.log($scope.records[e.layer.options.recordsIndex])
				});

			}
			

		}, function(error) {
			console.log(error);
		});
	}

	var filterValidYears = function() {
		var years = [];
		
		for(var i = min.getFullYear(); i<= max.getFullYear();++i){
			years.push(i);
		}
		return years;
	}
	
	var filterValidMonths = function (){
		// Current year
		var maxYear = max.getFullYear();
		var minYear = min.getFullYear();
		console.log("filter months");
	
		console.log(" >> maxYear " + maxYear);
		console.log(" >> minYear " + minYear);
		console.log(" >> minGetMonth " + min.getMonth());		
		console.log(" >> maxGetmonth " + max.getMonth());

		console.log(" >> minYear " + maxYear);

		console.log(" >> y " + y);
		
		if((y == maxYear && y == minYear) || y == undefined) { // activate between start and current. If no year is selected, month filter shows months of current year
			firstValidMonth = min.getMonth(); 

			for(var i = 0; i< min.getMonth();++i) {
				months[i].v = false
			}
			for(var i = min.getMonth(); i<= max.getMonth();i++){
				months[i].v = true
			}				
			
			for(var i = max.getMonth()+1; i<= 11;++i) {
				months[i].v = false
			}
				
				
		} else if(y == maxYear) { // activate from start of year to current
			firstValidMonth = 0;

			for(var i = 0; i<= max.getMonth();++i)
				months[i].v = true
					
			for(var i = max.getMonth(); i<= 11;++i)
				months[i].v = false

		} else if(y == minYear) { // Activate from Start to end of year
			firstValidMonth = min.getMonth(); 

			for(var i = 0; i< min.getMonth();++i)
				months[i].v = false
					
			for(var i = min.getMonth(); i<= 11;++i)
				months[i].v = true
				
		} else {	// Activate all
			for(var i = 0; i<= 11;++i)
					months[i].v = true
		}
		return months; 
	}
	
	var getMonthLabel = function(month) {
		return months[month-1].l
	}

	

    $scope.yearSelected = function (item) {
		if(item == 0) {
			y = undefined; 
			m = undefined;
			d = undefined; 

			$scope.yearLabel = y;
			$scope.monthLabel = m; 
			$scope.dayLabel = d; 
			$scope.queryScope=1;

		} else {
			y = item;
			m = undefined;
			d = undefined; 

			$scope.yearLabel = y;  
			$scope.monthLabel = m 
			$scope.dayLabel = d; 
			$scope.queryScope=1;

		}
		$scope.queryLimit = true || store.get("queryLimitNever");
		filterValidMonths();
		
		picker.gotoYear(y);
		picker.gotoMonth(firstValidMonth);
		queryHistory(assembleFromToParameters()); 
		
	}
	
	$scope.monthSelected = function (item) {
		if(item == 0)  { 
			m = undefined; 
			d = undefined; 
			
			$scope.monthLabel = m;  
			$scope.dayLabel = d; 
			$scope.queryScope=2;

		} else {
			
			
			m = item; 
			d = undefined; 

			$scope.monthLabel = getMonthLabel(m);
			$scope.dayLabel = d; 
			$scope.queryScope=2;
					
		}

		console.log("year is " + y)
		if(y == undefined) {
			console.log("setting default year to now after month select");
			y = max.getFullYear(); 
			$scope.yearLabel = y;

		}
		
		$scope.queryLimit = !$scope.preferencesQueryUnlimit
		picker.gotoYear(y);
		picker.gotoMonth(m-1);	
		$scope.records = queryHistory(assembleFromToParameters()); 

	}
	
	$scope.queryUnlimit = function(){
	
		console.log("Querying all")
		$scope.queryLimit = false;
		queryHistory(assembleFromToParameters()); 
	}
		
	$scope.deviceSelected = function(device){
		console.log("device selected");
		console.log(device);
		$scope.device = device; 
		min = new Date(device.createdAt); 
		console.log("new min " + min);
		picker.setMinDate(min);
		
		y = max.getFullYear(); 
		m = max.getMonth()+1;
		d = max.getDate(); 

		queryHistory(assembleFromToParameters());
		
		$scope.yearLabel = undefined;
		$scope.monthLabel = undefined; 
		$scope.dayLabel = undefined; 
		$scope.years = filterValidYears();
		$scope.months = filterValidMonths();
		$scope.queryLimit = !$scope.preferencesQueryUnlimit
		$scope.devicesLabel = device.devicename;
		picker.gotoToday();

	}
	
	$scope.showDayPicker = function(){
		console.log("show picker")
		console.log(picker)
		picker.show()
	}
	
	$scope.recordSelected = function(index, center) {
		
		if(selectedMarker)
			map.removeLayer(selectedMarker)
		
		selectedMarker = L.circleMarker([$scope.records[index].lat, $scope.records[index].lon], { fill: true, opacity: 1, fillColor: '#175EB5', fillOpacity: 1 , stroke: true, color: '#FFF', weight: 1, recordsIndex: index}).setRadius(4);
		selectedMarker.addTo(map);
		
		if(center)
			map.panTo(selectedMarker.getLatLng());

	}
	
	$scope.toggleQueryUnlimit = function () {
		$scope.preferencesQueryUnlimit = !$scope.preferencesQueryUnlimit; 
		store.set("preferences.history.queryUnlimit", $scope.preferencesQueryUnlimit);
		$scope.queryLimit = !$scope.preferencesQueryUnlimit;
	}
	$scope.toggleSidebar = function () {
		$scope.preferencesHideSidebar = !$scope.preferencesHideSidebar; 
		store.set("preferences.history.hideSidebar", $scope.preferencesHideSidebar);
	}
	
	$scope.fitAllRecords = function () {
		if(mapMarkerGroup)
			map.fitBounds(mapMarkerGroup.getBounds());
	}

	var exportXXX = function(format) {

		var params = assembleFromToParameters(); 
		$window.open(API.fillUrl(API.endpoints.deviceHistoryExport, {deviceId: $scope.device.id}) + "?token="+ AuthenticationService.getAccessToken() + "&format="+format + "&from="+params.from+"&to="+params.to);

		
	
	}

	$scope.exportGPX = function () {
		exportXXX('gpx')
	}
	$scope.exportCSV = function () {
		exportXXX('csv')
	}
	
	$scope.exportGeoJSON = function () {
		exportXXX('geojson')
	}

});
