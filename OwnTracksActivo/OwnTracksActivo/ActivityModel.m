//
//  Activity.m
//
//
//  Created by Christoph Krey on 22.04.15.
//
//

#import "ActivityModel.h"
#import "AppDelegate.h"
#import "Log.h"

static ActivityModel *theActivityModel;

@interface ActivityModel()
@property (strong, nonatomic) Activity *activity;

@end

@implementation ActivityModel
+ (ActivityModel *)sharedInstance {
    if (!theActivityModel) {
        theActivityModel = [[ActivityModel alloc] init];
    }
    return theActivityModel;
}

+ (NSUInteger)noId {
    return 0;
}

+ (NSUInteger)pauseId {
    return 10001;
}

+ (NSUInteger)defaultId {
    return 10002;
}

- (ActivityModel *)init {
    self = [super init];
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    NSFetchRequest *request = [NSFetchRequest fetchRequestWithEntityName:@"Activity"];
    
    NSError *error = nil;
    
    NSArray *matches = [appDelegate.managedObjectContext executeFetchRequest:request
                                                                       error:&error];
    
    if (matches && matches.count > 0) {
        self.activity = (Activity *)matches[0];
    }
    
    [self log:0 content:@"Activo starting"];
    
    return self;
}

- (BOOL)startJob:(NSUInteger)jobIdentifier
            task:(NSUInteger)taskIdentifier
           place:(NSUInteger)placeIdentifier
         machine:(NSUInteger)machineIdentifier {
    if (!self.activity) {
        AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
        self.activity = [NSEntityDescription insertNewObjectForEntityForName:@"Activity"
                                                      inManagedObjectContext:appDelegate.managedObjectContext];
        self.activity.jobIdentifier = [NSNumber numberWithUnsignedInteger:jobIdentifier];
        self.activity.taskIdentifier = [NSNumber numberWithUnsignedInteger:taskIdentifier];
        self.activity.placeIdentifier = [NSNumber numberWithUnsignedInteger:placeIdentifier];
        self.activity.machineIdentifier = [NSNumber numberWithUnsignedInteger:machineIdentifier];
        self.activity.lastStart = nil;
        self.activity.duration = [NSNumber numberWithDouble:0.0];
    } else {
        AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
        [appDelegate.mqttSession publishData:nil
                                     onTopic:[[NSUserDefaults standardUserDefaults] stringForKey:@"Publish"]
                                      retain:true
                                         qos:MQTTQosLevelExactlyOnce];
        [appDelegate.mqttSession publishData:[[NSString stringWithFormat:@"%@ %@ %@ %@",
                                               [NSNumber numberWithUnsignedInteger:[ActivityModel noId]],
                                               [NSNumber numberWithUnsignedInteger:[ActivityModel noId]],
                                               [NSNumber numberWithUnsignedInteger:[ActivityModel noId]],
                                               [NSNumber numberWithUnsignedInteger:[ActivityModel noId]]
                                               ] dataUsingEncoding:NSUTF8StringEncoding]
                                     onTopic:[NSString stringWithFormat:@"%@/%.0f",
                                              [[NSUserDefaults standardUserDefaults] stringForKey:@"Publish"],
                                              [[NSDate date] timeIntervalSince1970]]
                                      retain:false
                                         qos:MQTTQosLevelAtLeastOnce];
        
    }
    self.activity.lastStart = [NSDate date];
    [self log:1
      content:[NSString stringWithFormat:@"%@/%@/%@/%@",
               [self getJob:[self.activity.jobIdentifier integerValue]].name,
               [self getTask:[self.activity.taskIdentifier integerValue]
                       inJob:[self.activity.jobIdentifier integerValue]].name,
               [self getPlace:[self.activity.placeIdentifier integerValue]].name,
               [self getMachine:[self.activity.machineIdentifier integerValue]].name]];
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    [appDelegate.mqttSession publishData:[[NSString stringWithFormat:@"%@ %@ %@ %@",
                                           self.activity.jobIdentifier,
                                           self.activity.taskIdentifier,
                                           self.activity.placeIdentifier,
                                           self.activity.machineIdentifier] dataUsingEncoding:NSUTF8StringEncoding]
                                 onTopic:[[NSUserDefaults standardUserDefaults] stringForKey:@"Publish"]
                                  retain:true
                                     qos:MQTTQosLevelExactlyOnce];
    [appDelegate.mqttSession publishData:[[NSString stringWithFormat:@"%@ %@ %@ %@",
                                           self.activity.jobIdentifier,
                                           self.activity.taskIdentifier,
                                           self.activity.placeIdentifier,
                                           self.activity.machineIdentifier] dataUsingEncoding:NSUTF8StringEncoding]
                                 onTopic:[NSString stringWithFormat:@"%@/%.0f",
                                          [[NSUserDefaults standardUserDefaults] stringForKey:@"Publish"],
                                          [[NSDate date] timeIntervalSince1970]]
                                  retain:false
                                     qos:MQTTQosLevelAtLeastOnce];
    
    return true;
}

- (BOOL)pause {
    if (self.activity) {
        if (self.activity.lastStart != nil) {
            NSTimeInterval duration = [self.activity.duration doubleValue];
            duration += [[NSDate date] timeIntervalSinceDate:self.activity.lastStart];
            self.activity.duration = [NSNumber numberWithDouble:duration];
            self.activity.lastStart = nil;
            AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
            [appDelegate.mqttSession publishData:nil
                                         onTopic:[[NSUserDefaults standardUserDefaults] stringForKey:@"Publish"]
                                          retain:true
                                             qos:MQTTQosLevelExactlyOnce];
            [appDelegate.mqttSession publishData:[[NSString stringWithFormat:@"%@ %@ %@ %@",
                                                   [NSNumber numberWithUnsignedInteger:[ActivityModel noId]],
                                                   [NSNumber numberWithUnsignedInteger:[ActivityModel noId]],
                                                   [NSNumber numberWithUnsignedInteger:[ActivityModel noId]],
                                                   [NSNumber numberWithUnsignedInteger:[ActivityModel noId]]
                                                   ] dataUsingEncoding:NSUTF8StringEncoding]
                                         onTopic:[NSString stringWithFormat:@"%@/%.0f",
                                                  [[NSUserDefaults standardUserDefaults] stringForKey:@"Publish"],
                                                  [[NSDate date] timeIntervalSince1970]]
                                          retain:false
                                             qos:MQTTQosLevelAtLeastOnce];
            
            if ([[ActivityModel sharedInstance] getJob:[ActivityModel pauseId]]) {
                [appDelegate.mqttSession publishData:[[NSString stringWithFormat:@"%@ %@ %@ %@",
                                                       [NSNumber numberWithUnsignedInteger:[ActivityModel pauseId]],
                                                       [NSNumber numberWithUnsignedInteger:[ActivityModel pauseId]],
                                                       [NSNumber numberWithUnsignedInteger:[ActivityModel pauseId]],
                                                       [NSNumber numberWithUnsignedInteger:[ActivityModel pauseId]]
                                                       ] dataUsingEncoding:NSUTF8StringEncoding]
                                             onTopic:[[NSUserDefaults standardUserDefaults] stringForKey:@"Publish"]
                                              retain:true
                                                 qos:MQTTQosLevelExactlyOnce];
                [appDelegate.mqttSession publishData:[[NSString stringWithFormat:@"%@ %@ %@ %@",
                                                       [NSNumber numberWithUnsignedInteger:[ActivityModel pauseId]],
                                                       [NSNumber numberWithUnsignedInteger:[ActivityModel pauseId]],
                                                       [NSNumber numberWithUnsignedInteger:[ActivityModel pauseId]],
                                                       [NSNumber numberWithUnsignedInteger:[ActivityModel pauseId]]
                                                       ] dataUsingEncoding:NSUTF8StringEncoding]
                                             onTopic:[NSString stringWithFormat:@"%@/%.0f",
                                                      [[NSUserDefaults standardUserDefaults] stringForKey:@"Publish"],
                                                      [[NSDate date] timeIntervalSince1970]]
                                              retain:false
                                                 qos:MQTTQosLevelAtLeastOnce];
                
            }
            [self log:2
              content:[NSString stringWithFormat:@"%@", [self durationString]]
             ];
            
            return true;
        } else  {
            return false;
        }
    } else {
        return false;
    }
}

- (BOOL)stop {
    if (self.activity) {
        if (self.activity.lastStart != nil) {
            NSTimeInterval duration = [self.activity.duration doubleValue];
            duration += [[NSDate date] timeIntervalSinceDate:self.activity.lastStart];
            self.activity.duration = [NSNumber numberWithDouble:duration];
            self.activity.lastStart = nil;
            AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
            
            [appDelegate.mqttSession publishData:nil
                                         onTopic:[[NSUserDefaults standardUserDefaults] stringForKey:@"Publish"]
                                          retain:true
                                             qos:MQTTQosLevelExactlyOnce];
            [appDelegate.mqttSession publishData:[[NSString stringWithFormat:@"%@ %@ %@ %@",
                                                   [NSNumber numberWithUnsignedInteger:[ActivityModel noId]],
                                                   [NSNumber numberWithUnsignedInteger:[ActivityModel noId]],
                                                   [NSNumber numberWithUnsignedInteger:[ActivityModel noId]],
                                                   [NSNumber numberWithUnsignedInteger:[ActivityModel noId]]
                                                   ] dataUsingEncoding:NSUTF8StringEncoding]
                                         onTopic:[NSString stringWithFormat:@"%@/%.0f",
                                                  [[NSUserDefaults standardUserDefaults] stringForKey:@"Publish"],
                                                  [[NSDate date] timeIntervalSince1970]]
                                          retain:false
                                             qos:MQTTQosLevelAtLeastOnce];
            
            [self log:3
              content:[NSString stringWithFormat:@"%@", [self durationString]]
             ];
            
            [appDelegate.managedObjectContext deleteObject:self.activity];
            self.activity = nil;
            
            return true;
        } else  {
            return false;
        }
    } else {
        return false;
    }
    
}

- (NSTimeInterval)actualDuration {
    if (self.activity) {
        NSTimeInterval duration = [self.activity.duration doubleValue];
        if (self.activity.lastStart != nil) {
            duration += [[NSDate date] timeIntervalSinceDate:self.activity.lastStart];
        }
        return duration;
    } else {
        return 0;
    }
    
}

- (void)log:(int)status content:(NSString *)content {
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    Log *log = [NSEntityDescription insertNewObjectForEntityForName:@"Log"
                                             inManagedObjectContext:appDelegate.managedObjectContext];
    log.timestamp = [NSDate date];
    log.status = [NSNumber numberWithInt:status];
    log.content = content;
    
    NSFetchRequest *request = [NSFetchRequest fetchRequestWithEntityName:@"Log"];
    NSDate *oldDays = [NSDate dateWithTimeIntervalSinceNow:
                       -[[NSUserDefaults standardUserDefaults] integerForKey:@"KeepDays"] * 24 * 3600];
    request.predicate = [NSPredicate predicateWithFormat:@"timestamp < %@", oldDays];
    
    NSArray *matches = [appDelegate.managedObjectContext executeFetchRequest:request error:nil];
    if (matches) {
        for (log in matches) {
            [appDelegate.managedObjectContext deleteObject:log];
        }
    }
    
    [appDelegate saveContext];
}

- (NSArray *)jobs {
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    NSFetchRequest *request = [NSFetchRequest fetchRequestWithEntityName:@"Job"];
    request.sortDescriptors = @[[NSSortDescriptor sortDescriptorWithKey:@"identifier" ascending:YES]];
    NSArray *matches = [appDelegate.managedObjectContext executeFetchRequest:request error:nil];
    return matches;
}

- (NSArray *)places {
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    NSFetchRequest *request = [NSFetchRequest fetchRequestWithEntityName:@"Place"];
    request.sortDescriptors = @[[NSSortDescriptor sortDescriptorWithKey:@"identifier" ascending:YES]];
    NSArray *matches = [appDelegate.managedObjectContext executeFetchRequest:request error:nil];
    return matches;
}

- (NSArray *)machines {
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    NSFetchRequest *request = [NSFetchRequest fetchRequestWithEntityName:@"Machine"];
    request.sortDescriptors = @[[NSSortDescriptor sortDescriptorWithKey:@"identifier" ascending:YES]];
    NSArray *matches = [appDelegate.managedObjectContext executeFetchRequest:request error:nil];
    return matches;
}

- (NSArray *)tasksForJob:(NSUInteger)job {
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    NSFetchRequest *request = [NSFetchRequest fetchRequestWithEntityName:@"Task"];
    request.sortDescriptors = @[[NSSortDescriptor sortDescriptorWithKey:@"identifier" ascending:YES]];
    request.predicate = [NSPredicate predicateWithFormat:@"jobIdentifier = %@", [NSNumber numberWithUnsignedInteger:job]];
    NSArray *matches = [appDelegate.managedObjectContext executeFetchRequest:request error:nil];
    return matches;
}

- (BOOL)addJob:(NSUInteger)jobIdentifier name:(NSString *)name {
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    Job *job = [self getJob:jobIdentifier];
    if (!job) {
        job = [NSEntityDescription insertNewObjectForEntityForName:@"Job"
                                            inManagedObjectContext:appDelegate.managedObjectContext];
        job.identifier = [NSNumber numberWithUnsignedInteger:jobIdentifier];
        job.name = name;
    }
    job.name = name;
    [appDelegate saveContext];
    return true;
}

- (BOOL)addPlace:(NSUInteger)placeIdentifier
            name:(NSString *)name
        latitude:(double)latitude
       longitude:(double)longitude
          radius:(double)radius {
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    Place *place = [self getPlace:placeIdentifier];
    if (!place) {
        place = [NSEntityDescription insertNewObjectForEntityForName:@"Place"
                                              inManagedObjectContext:appDelegate.managedObjectContext];
        place.identifier = [NSNumber numberWithUnsignedInteger:placeIdentifier];
    }
    place.name = name;
    place.latitude = [NSNumber numberWithDouble:latitude];
    place.longitude = [NSNumber numberWithDouble:longitude];
    place.radius = [NSNumber numberWithDouble:radius];
    
    [appDelegate saveContext];
    return true;
}

- (BOOL)addMachine:(NSUInteger)machineIdentifier
              name:(NSString *)name
              uuid:(NSString *)uuid
             major:(NSUInteger)major
             minor:(NSUInteger)minor {
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    Machine *machine = [self getMachine:machineIdentifier];
    if (!machine) {
        machine = [NSEntityDescription insertNewObjectForEntityForName:@"Machine"
                                                inManagedObjectContext:appDelegate.managedObjectContext];
        machine.identifier = [NSNumber numberWithUnsignedInteger:machineIdentifier];
    }
    machine.name = name;
    machine.uuid = uuid;
    machine.major = [NSNumber numberWithUnsignedInteger:major];
    machine.minor = [NSNumber numberWithUnsignedInteger:minor];
    
    
    [appDelegate saveContext];
    return true;
}

- (BOOL)addTask:(NSUInteger)taskIdentifier inJob:(NSUInteger)jobIdentifier name:(NSString *)name {
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    Task *task = [self getTask:taskIdentifier inJob:jobIdentifier];
    if (task) {
        task.name = name;
    } else {
        task = [NSEntityDescription insertNewObjectForEntityForName:@"Task"
                                             inManagedObjectContext:appDelegate.managedObjectContext];
        task.identifier = [NSNumber numberWithUnsignedInteger:taskIdentifier];
        task.jobIdentifier = [NSNumber numberWithUnsignedInteger:jobIdentifier];
        task.name = name;
    }
    [appDelegate saveContext];
    return true;
}

- (Job *)getJob:(NSUInteger)jobIdentifier {
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    NSFetchRequest *request = [NSFetchRequest fetchRequestWithEntityName:@"Job"];
    request.predicate = [NSPredicate predicateWithFormat:@"identifier = %@", [NSNumber numberWithUnsignedInteger:jobIdentifier]];
    NSArray *matches = [appDelegate.managedObjectContext executeFetchRequest:request error:nil];
    return matches ? matches.count ? matches[0] : nil: nil;
}

- (Place *)getPlace:(NSUInteger)placeIdentifier {
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    NSFetchRequest *request = [NSFetchRequest fetchRequestWithEntityName:@"Place"];
    request.predicate = [NSPredicate predicateWithFormat:@"identifier = %@", [NSNumber numberWithUnsignedInteger:placeIdentifier]];
    NSArray *matches = [appDelegate.managedObjectContext executeFetchRequest:request error:nil];
    return matches ? matches.count ? matches[0] : nil: nil;
}

- (Machine *)getMachine:(NSUInteger)machineIdentifier {
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    NSFetchRequest *request = [NSFetchRequest fetchRequestWithEntityName:@"Machine"];
    request.predicate = [NSPredicate predicateWithFormat:@"identifier = %@", [NSNumber numberWithUnsignedInteger:machineIdentifier]];
    NSArray *matches = [appDelegate.managedObjectContext executeFetchRequest:request error:nil];
    return matches ? matches.count ? matches[0] : nil: nil;
}

- (Task *)getTask:(NSUInteger)taskIdentifier inJob:(NSUInteger)jobIdentifier {
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    NSFetchRequest *request = [NSFetchRequest fetchRequestWithEntityName:@"Task"];
    request.predicate = [NSPredicate predicateWithFormat:@"identifier = %@ and jobIdentifier = %@",
                         [NSNumber numberWithUnsignedInteger:taskIdentifier],
                         [NSNumber numberWithUnsignedInteger:jobIdentifier]];
    NSArray *matches = [appDelegate.managedObjectContext executeFetchRequest:request error:nil];
    return matches ? matches.count ? matches[0] : nil: nil;
}

- (BOOL)deleteJob:(NSUInteger)jobIdentifier {
    NSManagedObject *object = [self getJob:jobIdentifier];
    return [self deleteAnyObject:object];
}

- (BOOL)deletePlace:(NSUInteger)placeIdentifier {
    NSManagedObject *object = [self getPlace:placeIdentifier];
    return [self deleteAnyObject:object];
}

- (BOOL)deleteMachine:(NSUInteger)machineIdentifier {
    NSManagedObject *object = [self getMachine:machineIdentifier];
    return [self deleteAnyObject:object];
}

- (BOOL)deleteTask:(NSUInteger)taskIdentifier inJob:(NSUInteger)jobIdentifier {
    NSManagedObject *object = [self getTask:taskIdentifier inJob:jobIdentifier];
    return [self deleteAnyObject:object];
}

- (BOOL)deleteAnyObject:(NSManagedObject *)object {
    if (object) {
        AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
        [appDelegate.managedObjectContext deleteObject:object];
        [appDelegate saveContext];
        return true;
    } else {
        return false;
    }
}

- (NSString *)durationString {
    NSString *duration;
    NSTimeInterval interval = [self actualDuration];
    if (interval >= 3600) {
        duration = [NSString stringWithFormat:@"%d hours %d minutes",
                    (int)(interval / 3600),
                    (int)(fmod(interval, 3600)/ 60)
                    ];
    } else {
        duration = [NSString stringWithFormat:@"%d minutes %d seconds",
                    (int)(interval / 60),
                    (int)fmod(interval, 60)
                    ];
    }
    return duration;
}

@end
