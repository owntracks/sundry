//
//  Activity.h
//  
//
//  Created by Christoph Krey on 22.04.15.
//
//

#import <Foundation/Foundation.h>
#import "Activity.h"
#import "Job.h"
#import "Task.h"
#import "Place.h"
#import "Machine.h"

@interface ActivityModel : NSObject

@property (readonly, strong, nonatomic) Activity *activity;
+ (ActivityModel *)sharedInstance;
+ (NSUInteger)defaultId;
+ (NSUInteger)pauseId;
+ (NSUInteger)noId;

- (BOOL)startJob:(NSUInteger)jobIdentifier
            task:(NSUInteger)taskIdentifier
           place:(NSUInteger)placeIdentifier
         machine:(NSUInteger)machineIdentifier;
- (BOOL)pause;
- (BOOL)stop;
- (NSTimeInterval)actualDuration;
- (NSString *)durationString;

- (NSArray *)jobs;
- (NSArray *)tasksForJob:(NSUInteger)job;
- (NSArray *)places;
- (NSArray *)machines;

- (BOOL)addJob:(NSUInteger)jobIdentifier name:(NSString *)name;
- (BOOL)addTask:(NSUInteger)taskIdentifier inJob:(NSUInteger)jobIdentifier name:(NSString *)name;
- (BOOL)addPlace:(NSUInteger)placeIdentifier
            name:(NSString *)name
        latitude:(double)latitude
       longitude:(double)longitude
          radius:(double)radius;
- (BOOL)addMachine:(NSUInteger)machineIdentifier
              name:(NSString *)name
              uuid:(NSString *)uuid
             major:(NSUInteger)major
             minor:(NSUInteger)minor;

- (Job *)getJob:(NSUInteger)jobIdentifier;
- (Task *)getTask:(NSUInteger)taskIdentifier inJob:(NSUInteger)jobIdentifier ;
- (Place *)getPlace:(NSUInteger)placeIdentifier;
- (Machine *)getMachine:(NSUInteger)machineIdentifier;

- (BOOL)deleteJob:(NSUInteger)jobIdentifier;
- (BOOL)deleteTask:(NSUInteger)taskIdentifier inJob:(NSUInteger)jobIdentifier ;
- (BOOL)deletePlace:(NSUInteger)placeIdentifier;
- (BOOL)deleteMachine:(NSUInteger)machineIdentifier;



@end
