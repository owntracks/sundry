angular.module( 'sample.shares', [
  'ui.router',
  'angular-storage',
  'angular-jwt'
])
.config(function($stateProvider) {
  $stateProvider.state('shares', {
    url: '/shares',
    controller: 'SharesCtrl',
    templateUrl: 'shares/shares.html',
    data: {
      requiresLogin: true
    },
	bodyId: 'shares'
  });
})
.controller( 'SharesCtrl', function DevicesController( $scope, API, ngDialog) {
	var controller = this; 
	API.GET(API.endpoints.shares).then(function(response) {
		$scope.shares = response.data
    }, function(error) {
		console.log(error);
    });
	
	
	$scope.deleteTracking = function(id) {
		
	}
	
	$scope.acceptTracking = function(id) {
		
	}

		
	$scope.deleteShare = function(share) {
		API.DELETE(API.endpoints.share, {pathParams: {shareId: share.id}}).then(function(response) {		
			var index = $scope.share.indexOf(share);
			$scope.shareS.splice(index, 1);     
		}, function(error) {
			console.log(error);
		});

	}
	
	$scope.addTracker = function() {
		$scope.formData = {};

        var dialog = ngDialog.open({ template: 'shares/add.html', showClose: false, closeByEscape: true, closeByDocument: true, overlay: true, scope:  $scope});
		API.GET(API.endpoints.devices).then(function(response) {
			$scope.devices = response.data;
		}, function(error) {
			console.log(error);
		});
		

		dialog.closePromise.then(function(response) {
		})
    };
	
	$scope.saveTracker = function() {
		console.log($scope.formData); 
		
		API.POST(API.endpoints.trackers, {data: $scope.formData}).then(function(response) {
			$scope.trackers.push(response.data)
		}, function(error){
			console.error(error);
		})
		
		ngDialog.closeAll();
	}



});
