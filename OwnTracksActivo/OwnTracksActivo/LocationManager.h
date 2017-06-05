//
//  LocationManager.h
//  OwnTracks
//
//  Created by Christoph Krey on 21.10.14.
//  Copyright © 2014-2016 OwnTracks. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <MapKit/MapKit.h>
#import <CoreLocation/CoreLocation.h>

@protocol LocationManagerDelegate <NSObject>

- (void)regionEvent:(CLRegion *)region enter:(BOOL)enter;
- (void)regionState:(CLRegion *)region inside:(BOOL)inside;
- (void)beaconInRange:(CLBeacon *)beacon;
- (void)newLocation;

@end

@interface LocationManager : NSObject <CLLocationManagerDelegate>
+ (LocationManager *)sharedInstance;
@property (weak, nonatomic) id<LocationManagerDelegate> delegate;
@property (readonly, nonatomic) CLLocation *location;

- (void)start;
- (void)wakeup;
- (void)sleep;
- (void)stop;
- (void)startRegion:(CLRegion *)region;
- (void)stopRegion:(CLRegion *)region;
- (void)resetRegions;

@end

