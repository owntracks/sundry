angular.module( 'sample.account', [
  'ui.router',
  'angular-storage'
])
.config(function($stateProvider) {
  $stateProvider.state('account', {
    url: '/account',
    controller: 'AccountCtrl',
    templateUrl: 'account/account.html',
	bodyId: 'account'
  });
})
.controller( 'AccountCtrl', function LoginController($scope, $interval, $window, $http, store, $state, AuthenticationService, API, ngDialog, flash) {

	API.get(API.endpoints.sessions, {params: {last: true}}).then(function(response) {
		$scope.sessions = response.data
	}, function(error) {
		console.log(error);
	});

	$scope.editAccount = function() {
		$scope.formData = {};

		
        var dialog = ngDialog.open({ template: 'account/edit.html', showClose: false, closeByEscape: true, closeByDocument: true, overlay: true, scope:  $scope});
			
		dialog.closePromise.then(function(data) {

		})
    };

	$scope.saveAccount = function() {
		console.log($scope.formData); 
		if(!$scope.formData.fullname) {
			flash.to('flash-account-edit').error = 'Please your name';
			return; 
		}
		
		if(!$scope.formData.password) {
			flash.to('flash-account-edit').error = 'Please provide your current password';
			return; 
		}


		if($scope.formData.newPassword && ($scope.formData.newPassword != $scope.formData.newPasswordRepeat)) {
			flash.to('flash-account-edit').error = 'New passwords do not match';
			return; 
		}

		API.POST(API.endpoints.user, {data: $scope.formData}).then(function(response) {
			ngDialog.closeAll();
			flash.to('flash-account').success = 'Account details updated successfully';
			AuthenticationService.setUser(response.data); 
		}, function(error){

			console.error(error);
			if(error.status == 409) {
				flash.to('flash-account-edit').error = 'The specified email address is already taken';
				return; 
			}
			if(error.status == 401) {
				flash.to('flash-account-edit').error = 'The provided current password is invalid';
				return; 
			}
			if(error.status == 400) {
				flash.to('flash-account-edit').error = 'Account details could not be updated due to an invalid request';
				return; 
			}
			
			
			flash.to('flash-account-edit').error = 'Account details could not be updated';
			
		})	
	}

});