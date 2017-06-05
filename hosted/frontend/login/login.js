angular.module( 'sample.login', [
  'ui.router',
  'angular-storage'
])
.config(function($stateProvider) {
  $stateProvider.state('login', {
    url: '/login',
    controller: 'LoginCtrl',
    templateUrl: 'login/login.html',
	bodyId: 'login'
  });
})
.controller( 'LoginCtrl', function LoginController( $scope, $interval, $window, $http, store, $state, AuthenticationService) {

  $scope.user = {};

  $scope.login = function() {
	$scope.user.clientType = "web";
	 AuthenticationService.login($scope.user).then(function() {
	 		$state.go('devices');
	 }).catch(function(error) {
		console.log(error.status + " - " +  error.statusText);

	 })
  }
  
});
