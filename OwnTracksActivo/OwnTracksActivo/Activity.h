//
//  Activity.h
//  OwnTracksActivo
//
//  Created by Christoph Krey on 30.04.15.
//  Copyright © 2015-2016 OwnTracks. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreData/CoreData.h>


@interface Activity : NSManagedObject

@property (nonatomic, retain) NSNumber * duration;
@property (nonatomic, retain) NSNumber * jobIdentifier;
@property (nonatomic, retain) NSDate * lastStart;
@property (nonatomic, retain) NSNumber * taskIdentifier;
@property (nonatomic, retain) NSNumber * machineIdentifier;
@property (nonatomic, retain) NSNumber * placeIdentifier;

@end
