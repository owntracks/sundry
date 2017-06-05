angular.module( 'sample.dashboard', [
  'ui.router',
  'angular-storage',
  'angular-jwt'
])
.config(function($stateProvider) {
  $stateProvider.state('dashboard', {
    url: '/',
    controller: 'DashboardCtrl',
    templateUrl: 'dashboard/dashboard.html',
    data: {
		requiresLogin: true
    }
  });
})
.controller( 'DashboardCtrl', function DashboardCtrl( $scope,$http) {
	console.log("loading dashboard")


});
