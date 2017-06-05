//
//  Task.h
//  OwnTracksActivo
//
//  Created by Christoph Krey on 30.04.15.
//  Copyright © 2015-2016 OwnTracks. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreData/CoreData.h>


@interface Task : NSManagedObject

@property (nonatomic, retain) NSNumber * identifier;
@property (nonatomic, retain) NSNumber * jobIdentifier;
@property (nonatomic, retain) NSString * name;

@end
