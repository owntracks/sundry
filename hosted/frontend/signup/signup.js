angular.module( 'sample.signup', [
  'ui.router',
  'angular-storage'
])
.config(function($stateProvider) {
  $stateProvider.state('signup', {
    url: '/signup',
    controller: 'SignupCtrl',
    templateUrl: 'signup/signup.html'
  });
})
.controller( 'SignupCtrl', function SignupController( $scope, $http, store, $state, API) {

  $scope.user = {};

  $scope.signup = function() {  
	//TODO: check password match
  
	API.POST(API.endpoints.signup, {data: $scope.user, skipAuthorization: true}).then(function(res) {
		$state.go('login');
	 }).catch(function(res) {
		console.log(res.status + " - " +  res.error);
	 })
  }

});
