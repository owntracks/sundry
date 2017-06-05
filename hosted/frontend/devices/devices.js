angular.module( 'sample.devices', [
  'ui.router',
  'angular-storage',
  'angular-jwt'
])
.config(function($stateProvider) {
  $stateProvider.state('devices', {
    url: '/devices',
    controller: 'DevicesCtrl',
    templateUrl: 'devices/devices.html',
    data: {
      requiresLogin: true
    },
	bodyId: 'devices'
	
  });
})
.controller( 'DevicesCtrl', function DevicesController( $scope, API) {
  $scope.devicesAdd = function() {
	console.log("adding new device");
  }


  API.get(API.endpoints.devices, {params: {last: true}}).then(function(response) {
		$scope.devices = response.data;
    }, function(error) {
		console.log(error);
    });

});
