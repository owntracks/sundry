//
//  Log.h
//  OwnTracksActivo
//
//  Created by Christoph Krey on 30.04.15.
//  Copyright © 2015-2016 OwnTracks. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreData/CoreData.h>


@interface Log : NSManagedObject

@property (nonatomic, retain) NSString * content;
@property (nonatomic, retain) NSNumber * status;
@property (nonatomic, retain) NSDate * timestamp;

@end
