//
//  Machine.h
//  OwnTracksActivo
//
//  Created by Christoph Krey on 30.04.15.
//  Copyright © 2015-2016 OwnTracks. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreData/CoreData.h>


@interface Machine : NSManagedObject

@property (nonatomic, retain) NSNumber * identifier;
@property (nonatomic, retain) NSString * name;
@property (nonatomic, retain) NSString * uuid;
@property (nonatomic, retain) NSNumber * major;
@property (nonatomic, retain) NSNumber * minor;

@end
