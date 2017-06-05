angular.module( 'sample', [
  'sample.devices',
  'sample.shares',
  'sample.history',
  'sample.login',
  'sample.signup',
  'sample.account',
  'angular-storage',
  'angular-jwt',
  'angular-loading-bar',
  'ngDialog',
  'vs-repeat',
  'angular-flash.service', 
  'angular-flash.flash-alert-directive'
])
.config( function myAppConfig ($urlRouterProvider, jwtInterceptorProvider, $httpProvider, flashProvider) {
  $urlRouterProvider.otherwise('/');
  $urlRouterProvider.when('/', '/devices');


  jwtInterceptorProvider.tokenGetter = ['AuthenticationService', 'config', function(AuthenticationService, config) {
	if (config.url.substr(config.url.length - 5) == '.html') {
      return null;
    }
	  
	return AuthenticationService.getAccessToken(); 

  }];
  $httpProvider.interceptors.push('jwtInterceptor');
  
  
	flashProvider.errorClassnames.push('alert-danger');
	flashProvider.warnClassnames.push('alert-warning');
	flashProvider.infoClassnames.push('alert-info');
	flashProvider.successClassnames.push('alert-success');



}).run(function($rootScope, $state, store, AuthenticationService) {

	$rootScope.$on('$stateChangeStart', function (e, to) {
		if (to.data && to.data.requiresLogin && !AuthenticationService.loggedIn) {
			e.preventDefault();
			$state.go('login');	
		}	
	});
	$rootScope.$on('$stateChangeSuccess',function(event, toState, toParams, fromState, fromParams){
        $rootScope.bodyId = toState.bodyId;
    });

	$rootScope.$on('loggedOut', function(event, args) {
		$state.go('login');	
				flash.success = 'Your session has expired due to updated credentials. Please login again.';

	});
	
})
.controller( 'AppCtrl', function AppCtrl ($rootScope, $state, $scope, $location, AuthenticationService, API, ngDialog, flash) {
	$rootScope.AuthenticationService = AuthenticationService
	$scope.$on('$routeChangeSuccess', function(e, nextRoute){
		if ( nextRoute.$$route && angular.isDefined( nextRoute.$$route.pageTitle ) ) {
		  $scope.pageTitle = nextRoute.$$route.pageTitle + ' | ngEurope Sample' ;
		}
	});
	
	$scope.logout = function() {
		AuthenticationService.logoutReasonManual();	
	}
	

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
			if($scope.formData.newPassword) { // Password changed, token has been invalidated. Login again 
				AuthenticationService.logoutReasonPasswordChange(); 
			} else { // Non password data has been updated, refresh user details with new data 
				AuthenticationService.setUser(response.data); 
				flash.success = 'Account updated successfully';

			}
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
	
	
	
})
.factory( 'AuthenticationService', function($rootScope, $http, store, jwtHelper, $q, flash) {
	var authService = {loggedIn: false, refreshTokenInformation: {}, accessTokenInformation: undefined};
	var decodedRefreshToken; 

	authService.setUser = function(user) {
		authService.currentUser = user; 
		$rootScope.$broadcast('currentUserUpdated');
		console.log(authService.currentUser)
	}

	getRefreshToken = function() { 
		return store.get('refreshToken')
	}
	
	
	setRefreshToken = function(refreshToken) {
		store.set('refreshToken', refreshToken);
	}
	
	hasRefreshToken = function() { 
		return getRefreshToken() != null
	}
	
	loginWithToken = function(refreshToken) {
		setRefreshToken(refreshToken);
		authService.refreshTokenInformation = jwtHelper.decodeToken(refreshToken);
		authService.loggedIn = true; 
		console.log("logged in");
		$rootScope.$broadcast('loggedIn');

		return $http({
			url: 'https://hosted-dev.owntracks.org/api/v1/users/'+authService.getCurrentUserId(),
			method: 'GET',
			skipAuthorization: false
		}).then(function(response) {
			authService.setUser(response.data.data);
		})

		

	}
	authService.getCurrentUser = function() { return authService.currentUser; },
	authService.getCurrentUserId = function() { return authService.refreshTokenInformation.userId; }
	
	authService.login = function (credentials) {
		return $http({
			url: 'https://hosted-dev.owntracks.org/api/v1/authenticate',
			method: 'POST',
			data: credentials,
			skipAuthorization: true
		}).then(function(response) {
			loginWithToken(response.data.data.refreshToken)
		})
	}
	
	authService.logoutReasonManual = function(){
		// TODO: delete server side session 
		authService.logout()
		flash.success = 'You have logged out';
	}
	
	authService.logoutReasonPasswordChange = function(){
	
		authService.logout()
		flash.warn = 'Your session has expired due to updated credentials. Please login again.';

	}
	
	authService.logoutReasonRefreshTokenExpired = function(){
		authService.logout()
		flash.error = 'Your session has expired. Please login again.';

	}
	
	authService.logout = function () {
		store.remove("accessToken");
		store.remove("refreshToken");
		authService.loggedIn = false; 
		$rootScope.$broadcast('loggedOut');

	}
	

	
	var accessTokenRequestLock = false;
	var requestPromiseQueue = []; 
	authService.getAccessToken = function() {
	
		var refreshToken = store.get('refreshToken');

		if(!refreshToken) {
		  console.error("user is not logged in"); 
		  return; 
		}
		
		var idToken = store.get('accessToken');
		if (!idToken || jwtHelper.isTokenExpired(idToken)) {
			console.log("access token is expired or not preset, gettig one");
			
			if(accessTokenRequestLock) {
				// An access token is already being requested
				// Return a not fulfilled promise
				// It will be fulfilled with the access token once it is availale
				return new Promise(function(resolve, reject) {
					requestPromiseQueue.push(resolve);
				})	
			} else {
				accessTokenRequestLock = true;
			}
			
			// This is a promise of a JWT id_token
			return $http({
				url: '/api/v1/authenticate/refresh',
				// This makes it so that this request doesn't send the JWT
				skipAuthorization: true,
				method: 'POST',
				headers: {
				  'Authorization':('Bearer ' + refreshToken)
				}
			}).then(function(response) {
				console.log("response for refresh token: "); 
				console.log(response);
				var id_token = response.data.data.accessToken;
				if(!id_token)
					  return;
				  
				store.set('accessToken', id_token);
				console.log("new access token is now available"); 
				console.log("fulfilling  " + requestPromiseQueue.length + " promises"); 

				for(var i=0; i< requestPromiseQueue.length; i++) {
					console.log(requestPromiseQueue[i]);
					requestPromiseQueue[i](id_token);
				}
				requestPromiseQueue.length = 0 // clear queue
				accessTokenRequestLock = false;
				
				return id_token;
			}).catch(function(error){
				console.log(error);
				if(error.status == 401){
					console.error("refresh token has expired or was revoked"); 
				}
				
				authService.logoutReasonRefreshTokenExpired();
				return null;
			});
		} else {
			//console.log("using access token: " + idToken); 
			return idToken;
		}
	}
	
	// Login on page load if a refresh token exists
	if(hasRefreshToken()) {
		loginWithToken(getRefreshToken());			
	} 
		
		
	return authService;

})
.factory('API', function($q, $http, AuthenticationService) {

    var baseApiUrl = 'https://hosted-dev.owntracks.org/api/v1/',
    endpoints = {
		signup: baseApiUrl + 'users',
        users : baseApiUrl + 'users',
        user: baseApiUrl + 'users/:userId',
        devices: baseApiUrl + 'users/:userId/devices',
        device: baseApiUrl + 'users/:userId/devices/:deviceId',
        deviceHistory: baseApiUrl + 'users/:userId/devices/:deviceId/history',
        deviceHistoryExport: baseApiUrl + 'users/:userId/devices/:deviceId/history/export',
        shares: baseApiUrl + 'users/:userId/shares',
        share: baseApiUrl + 'users/:userId/shares/:shareId',
        sessions: baseApiUrl + 'users/:userId/sessions',
        session: baseApiUrl + 'users/:userId/sessions/:sessionId',

    };

    function fillUrl(urlFormat, pathParams, options) {
        var url = urlFormat;
		console.log("fillUrl:" + urlFormat);

		var params = pathParams || {};
		if(!options.skipAuthorization && !params.userId) {
			params.userId = AuthenticationService.getCurrentUserId();
        }

        angular.forEach(params, function (val, name) {
            if (typeof(val) === 'undefined' || val === null || val === '') {
                url = url.replace(RegExp('/:' + name, 'g'), '');
            } else {
                url = url.replace(RegExp(':' + name, 'g'), val);
            }

        });

        return url;
    }
  
    var queryEndpoint = function(endpoint, options, method) {

		if(!options)
			options = {}

		var url = fillUrl(endpoint, options.pathParams, options); 
		console.log("running API query to endpoint: " + url);

		var d = $q.defer();
		$http({url: url, method: method || 'GET', data: options.data, params: options.params, skipAuthorization: options.skipAuthorization || false}).success(function(data){
			return d.resolve(data);
		}).error(function(error){
			return d.reject(error);
		});
 
		return d.promise;
    };

    var GET = function(endpoint, options) {
		return queryEndpoint(endpoint, options, 'GET');
	}
	var POST = function(endpoint, options) {
		return queryEndpoint(endpoint, options, 'POST');
	}
	var PUT = function(endpoint, options) {
		return queryEndpoint(endpoint, options, 'PUT');
	}
	var DELETE = function(endpoint, options) {
		return queryEndpoint(endpoint, options, 'DELETE');
	}
    return {
        endpoints: endpoints,
        q: queryEndpoint ,
		get: GET,
		post: POST, 
		put: PUT, 
		GET: GET,
		POST: POST, 
		PUT: PUT, 
		DELETE: DELETE, 
		fillUrl: fillUrl
    };
}).directive('ngReallyClick', [function() {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            element.bind('click', function() {
                var message = attrs.ngReallyMessage;
                if (message && confirm(message)) {
                    scope.$apply(attrs.ngReallyClick);
                }
            });
        }
    }
}]);
;




