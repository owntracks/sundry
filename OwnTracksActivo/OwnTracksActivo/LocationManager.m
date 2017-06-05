//
//  LocationManager.m
//  OwnTracks
//
//  Created by Christoph Krey on 21.10.14.
//  Copyright © 2014-2016 OwnTracks. All rights reserved.
//

#import "LocationManager.h"
#import <Fabric/Fabric.h>
#import <Crashlytics/Crashlytics.h>

@interface AlertView: NSObject
+ (void)alert:(NSString *)title message:(NSString *)message;
@property (strong, nonatomic) UIAlertView *alertView;
@end

@implementation AlertView

+ (void)alert:(NSString *)title message:(NSString *)message {
    (void)[[AlertView alloc] initWithAlert:title message:message];
}

- (AlertView *)initWithAlert:(NSString *)title message:(NSString *)message {
    self = [super init];
    
    NSLog(@"AlertView %@/%@", title, message);
    self.alertView = [[UIAlertView alloc] initWithTitle:title
                                                message:message
                                               delegate:nil
                                      cancelButtonTitle:@"OK"
                                      otherButtonTitles:nil];
    return self;
}

@end


@interface LocationManager()
@property (strong, nonatomic) CLLocationManager *manager;
@end

@implementation LocationManager
static LocationManager *theInstance = nil;

+ (LocationManager *)sharedInstance {
    if (theInstance == nil) {
        theInstance = [[LocationManager alloc] init];
    }
    return theInstance;
}

- (id)init {
    self = [super init];

    self.manager = [[CLLocationManager alloc] init];
    self.manager.delegate = self;
    [self authorize];
    
    [[NSNotificationCenter defaultCenter] addObserverForName:UIApplicationWillEnterForegroundNotification
                                                      object:nil queue:nil usingBlock:^(NSNotification *note){
                                                          NSLog(@"UIApplicationWillEnterForegroundNotification");
                                                          //
                                                      }];
    [[NSNotificationCenter defaultCenter] addObserverForName:UIApplicationDidBecomeActiveNotification
                                                      object:nil queue:nil usingBlock:^(NSNotification *note){
                                                          NSLog(@"UIApplicationDidBecomeActiveNotification");
                                                          [self wakeup];
                                                      }];
    [[NSNotificationCenter defaultCenter] addObserverForName:UIApplicationWillResignActiveNotification
                                                      object:nil queue:nil usingBlock:^(NSNotification *note){
                                                          NSLog(@"UIApplicationWillResignActiveNotification");
                                                          [self sleep];
                                                      }];
    [[NSNotificationCenter defaultCenter] addObserverForName:UIApplicationWillTerminateNotification
                                                      object:nil queue:nil usingBlock:^(NSNotification *note){
                                                          NSLog(@"UIApplicationWillTerminateNotification");
                                                          [self stop];
                                                      }];

    return self;
}

- (void)start {
    NSLog(@"start");
    [self authorize];
}

- (void)wakeup {
    NSLog(@"wakeup");
    [self authorize];
    [self.manager startUpdatingLocation];
    for (CLRegion *region in self.manager.monitoredRegions) {
        NSLog(@"requestStateForRegion %@", region.identifier);
        [self.manager requestStateForRegion:region];
    }
}

- (void)authorize {
    CLAuthorizationStatus status = [CLLocationManager authorizationStatus];
    NSLog(@"authorizationStatus=%d", status);
    if (status == kCLAuthorizationStatusNotDetermined) {
        [self.manager requestWhenInUseAuthorization];
    }
}

- (void)sleep {
    NSLog(@"sleep");
    for (CLBeaconRegion *beaconRegion in self.manager.rangedRegions) {
        [self.manager stopRangingBeaconsInRegion:beaconRegion];
    }
    [self.manager stopUpdatingLocation];
}

- (void)stop {
    NSLog(@"stop");
}

- (void)startRegion:(CLRegion *)region {
    [self.manager startMonitoringForRegion:region];
}

- (void)stopRegion:(CLRegion *)region {
    [self.manager stopMonitoringForRegion:region];
}

- (void)resetRegions {
    for (CLRegion *region in self.manager.monitoredRegions) {
        [self.manager stopMonitoringForRegion:region];
    }
}

- (CLLocation *)location {
    return self.manager.location;
}

/*
 *
 * Delegate
 *
 */

- (void)locationManager:(CLLocationManager *)manager didChangeAuthorizationStatus:(CLAuthorizationStatus)status {
    NSLog(@"didChangeAuthorizationStatus to %d", status);
    if (status != kCLAuthorizationStatusAuthorizedAlways) {
        [self showError];
    }
}

- (void)showError {
    CLAuthorizationStatus status = [CLLocationManager authorizationStatus];
    switch (status) {
        case kCLAuthorizationStatusAuthorizedAlways:
            break;
        case kCLAuthorizationStatusAuthorizedWhenInUse:
            [AlertView alert:@"LocationManager" message:@"App is not allowed to use location services in background"];
            break;
        case kCLAuthorizationStatusNotDetermined:
            [AlertView alert:@"LocationManager" message:@"App is not allowed to use location services yet"];
            break;
        case kCLAuthorizationStatusDenied:
            [AlertView alert:@"LocationManager" message:@"App is not allowed to use location services"];
            break;
        case kCLAuthorizationStatusRestricted:
            [AlertView alert:@"LocationManager" message:@"App use of location services is restricted"];
            break;
        default:
            [AlertView alert:@"LocationManager" message:@"App use of location services is unclear"];
            break;
    }
    
    if (![CLLocationManager locationServicesEnabled]) {
        [AlertView alert:@"LocationManager" message:@"Location services are not enabled"];
    }
    
    if (![CLLocationManager significantLocationChangeMonitoringAvailable]) {
        [AlertView alert:@"LocationManager" message:@"Significant location change monitoring not available"];
    }
    
    if (![CLLocationManager isMonitoringAvailableForClass:[CLCircularRegion class]]) {
        [AlertView alert:@"LocationManager" message:@"Circular region monitoring not available"];
    }
    
    if (![CLLocationManager isMonitoringAvailableForClass:[CLBeaconRegion class]]) {
        [AlertView alert:@"LocationManager" message:@"iBeacon region monitoring not available"];
    }
    
    if (![CLLocationManager isRangingAvailable]) {
        [AlertView alert:@"LocationManager" message:@"iBeacon ranging not available"];
    }
    
    if (![CLLocationManager deferredLocationUpdatesAvailable]) {
        // [AlertView alert:where message:@"Deferred location updates not available"];
    }

    if (![CLLocationManager headingAvailable]) {
        // [AlertView alert:where message:@"Heading not available"];
    }
}

- (void)locationManager:(CLLocationManager *)manager didUpdateLocations:(NSArray *)locations {
    NSLog(@"didUpdateLocations");
    
    for (CLLocation *location in locations) {
        NSLog(@"Location: %@", location);
    }
    
    [self.delegate newLocation];
}

- (void)locationManager:(CLLocationManager *)manager didFailWithError:(NSError *)error {
    NSLog(@"didFailWithError %@", error.localizedDescription);
    // error
}


/*
 *
 * Regions
 *
 */
- (void)locationManager:(CLLocationManager *)manager didDetermineState:(CLRegionState)state forRegion:(CLRegion *)region {
    NSLog(@"didDetermineState %ld %@", (long)state, region);
    if (state == CLRegionStateInside) {
        if ([UIApplication sharedApplication].applicationState == UIApplicationStateActive) {
            if ([region isKindOfClass:[CLBeaconRegion class]]) {
                CLBeaconRegion *beaconRegion = (CLBeaconRegion *)region;
                [self.manager startRangingBeaconsInRegion:beaconRegion];
            }
        }
    } else if (state == CLRegionStateOutside) {
        if ([region isKindOfClass:[CLBeaconRegion class]]) {
            CLBeaconRegion *beaconRegion = (CLBeaconRegion *)region;
            [self.manager stopRangingBeaconsInRegion:beaconRegion];
        }
    }
    
    [self.delegate regionState:region inside:(state == CLRegionStateInside)];
}

- (void)locationManager:(CLLocationManager *)manager didEnterRegion:(CLRegion *)region
{
    NSLog(@"didEnterRegion %@", region);
    [self.delegate regionEvent:region enter:YES];
}

- (void)locationManager:(CLLocationManager *)manager didExitRegion:(CLRegion *)region
{
    NSLog(@"didExitRegion %@", region);
    [self.delegate regionEvent:region enter:NO];
}

- (void)locationManager:(CLLocationManager *)manager didStartMonitoringForRegion:(CLRegion *)region {
    NSLog(@"didStartMonitoringForRegion %@", region);
    [self.manager requestStateForRegion:region];
}

- (void)locationManager:(CLLocationManager *)manager monitoringDidFailForRegion:(CLRegion *)region withError:(NSError *)error {
    NSLog(@"monitoringDidFailForRegion %@ %@", region, error.localizedDescription);
    for (CLRegion *monitoredRegion in manager.monitoredRegions) {
        NSLog(@"monitoredRegion: %@", monitoredRegion);
    }
}

/*
 *
 * Beacons
 *
 */
- (void)locationManager:(CLLocationManager *)manager rangingBeaconsDidFailForRegion:(CLBeaconRegion *)region withError:(NSError *)error {
    NSLog(@"rangingBeaconsDidFailForRegion %@ %@", region, error.localizedDescription);
    // error
}

- (void)locationManager:(CLLocationManager *)manager didRangeBeacons:(NSArray *)beacons inRegion:(CLBeaconRegion *)region {
    NSLog(@"didRangeBeacons %@ %@", beacons, region);
    for (CLBeacon *beacon in beacons) {
        [self.delegate beaconInRange:beacon];
    }
}

/*
 *
 * Deferred Updates
 *
 */
- (void)locationManager:(CLLocationManager *)manager didFinishDeferredUpdatesWithError:(NSError *)error {
    //
}

- (void)locationManagerDidPauseLocationUpdates:(CLLocationManager *)manager {
    //
}

- (void)locationManagerDidResumeLocationUpdates:(CLLocationManager *)manager {
    //
}


/*
 *
 * Heading
 *
 */
- (void)locationManager:(CLLocationManager *)manager didUpdateHeading:(CLHeading *)newHeading {
    // we don't use heading
}

- (BOOL)locationManagerShouldDisplayHeadingCalibration:(CLLocationManager *)manager {
    // we don't use heading
    return false;
}

/*
 *
 * Visits
 *
 */
- (void)locationManager:(CLLocationManager *)manager didVisit:(CLVisit *)visit {
    //
}

@end


