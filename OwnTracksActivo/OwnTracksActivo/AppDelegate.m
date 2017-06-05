//
//  AppDelegate.m
//  OwnTracksActivo
//
//  Created by Christoph Krey on 22.04.15.
//  Copyright © 2015-2016 OwnTracks. All rights reserved.
//

#import "AppDelegate.h"
#import "ActivityModel.h"

#import <Fabric/Fabric.h>
#import <Crashlytics/Crashlytics.h>

@interface AppDelegate ()

@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    // Override point for customization after application launch.

    [Fabric with:@[CrashlyticsKit]];

    NSURL *bundleURL = [[NSBundle mainBundle] bundleURL];
    NSURL *otacPlistURL = [bundleURL URLByAppendingPathComponent:@"otac.plist"];
    [[NSUserDefaults standardUserDefaults] registerDefaults:[NSDictionary dictionaryWithContentsOfURL:otacPlistURL]];
    return YES;
}

- (BOOL)application:(UIApplication *)application
            openURL:(NSURL *)url
  sourceApplication:(NSString *)sourceApplication
         annotation:(id)annotation {

    if (url) {
        NSInputStream *input = [NSInputStream inputStreamWithURL:url];
        if ([input streamError]) {
            return FALSE;
        }
        [input open];
        if ([input streamError]) {
            return FALSE;
        }

        NSString *extension = [url pathExtension];
        if ([extension isEqualToString:@"otac"]) {
            NSDictionary *dictionary = [NSJSONSerialization JSONObjectWithStream:input options:0 error:nil];
            if (dictionary) {
                for (NSString *key in [dictionary allKeys]) {
                    [[NSUserDefaults standardUserDefaults] setValue:dictionary[key] forKey:key];
                }
            }
        }
    }
    return TRUE;
}

- (void)applicationWillResignActive:(UIApplication *)application {
    // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
    // Use this method to pause ongoing tasks, disable timers, and throttle down OpenGL ES frame rates. Games should use this method to pause the game.
    [self.mqttSession closeAndWait];
    [self saveContext];
}

- (void)applicationDidEnterBackground:(UIApplication *)application {
    // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
    // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
}

- (void)applicationWillEnterForeground:(UIApplication *)application {
    // Called as part of the transition from the background to the inactive state; here you can undo many of the changes made on entering the background.
}

- (void)applicationDidBecomeActive:(UIApplication *)application {
    // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    [self.mqttSession connectToHost:[[NSUserDefaults standardUserDefaults] stringForKey:@"Host"]
                               port:(int)[[NSUserDefaults standardUserDefaults] integerForKey:@"Port"]
                           usingSSL:[[NSUserDefaults standardUserDefaults] boolForKey:@"SSL"]];
}

- (void)applicationWillTerminate:(UIApplication *)application {
    // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    // Saves changes in the application's managed object context before the application terminates.
    [self.mqttSession closeAndWait];
    [self saveContext];
}

- (void)reconnect {
    [self.mqttSession closeAndWait];
    _mqttSession.clientId = [[NSUserDefaults standardUserDefaults] stringForKey:@"ClientId"];
    _mqttSession.userName = [[NSUserDefaults standardUserDefaults] stringForKey:@"UserName"];
    _mqttSession.password = [[NSUserDefaults standardUserDefaults] stringForKey:@"Password"];
    [self.mqttSession connectToHost:[[NSUserDefaults standardUserDefaults] stringForKey:@"Host"]
                               port:(int)[[NSUserDefaults standardUserDefaults] integerForKey:@"Port"]
                           usingSSL:[[NSUserDefaults standardUserDefaults] boolForKey:@"SSL"]];
}

#pragma mark - MQTTClient session
@synthesize mqttSession = _mqttSession;
@synthesize mqttError = _mqttError;

- (MQTTSession *)mqttSession {
    if (_mqttSession != nil) {
        return _mqttSession;
    }
    _mqttSession = [[MQTTSession alloc] initWithClientId:[[NSUserDefaults standardUserDefaults] stringForKey:@"ClientId"]
                                                userName:[[NSUserDefaults standardUserDefaults] stringForKey:@"UserName"]
                                                password:[[NSUserDefaults standardUserDefaults] stringForKey:@"Password"]
                                               keepAlive:60
                                            cleanSession:TRUE
                                                    will:NO
                                               willTopic:nil
                                                 willMsg:nil
                                                 willQoS:MQTTQosLevelAtMostOnce
                                          willRetainFlag:NO
                                           protocolLevel:4
                                                 runLoop:nil
                                                 forMode:nil];
    _mqttSession.delegate = self;
    return _mqttSession;
}

- (void)newMessage:(MQTTSession *)session
              data:(NSData *)data
           onTopic:(NSString *)topic
               qos:(MQTTQosLevel)qos
          retained:(BOOL)retained
               mid:(unsigned int)mid {
    NSArray *topicComponents = [topic componentsSeparatedByString:@"/"];
    
    int job = -1;
    for (int i = 0; i < topicComponents.count; i++) {
        NSString *component = topicComponents[i];
        if ([component isEqualToString:@"job"]) {
            job = i;
            break;
        }
    }
    if (job > -1) {
        if (topicComponents.count == job + 2) {
            if (data.length) {
                [[ActivityModel sharedInstance] addJob:[topicComponents[job + 1] integerValue]
                                                  name:[[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding]];
            } else {
                [[ActivityModel sharedInstance] deleteJob:[topicComponents[job + 1] integerValue]];
            }
        } else if (topicComponents.count == job + 3) {
            if (data.length) {
                [[ActivityModel sharedInstance] addTask:[topicComponents[job + 2] integerValue]
                                                  inJob:[topicComponents[job + 1] integerValue]
                                                   name:[[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding]];
            } else {
                [[ActivityModel sharedInstance] deleteTask:[topicComponents[job + 2] integerValue]
                                                     inJob:[topicComponents[job + 1] integerValue]];
            }
        }
    }
    
    int place = -1;
    for (int i = 0; i < topicComponents.count; i++) {
        NSString *component = topicComponents[i];
        if ([component isEqualToString:@"place"]) {
            place = i;
            break;
        }
    }
    if (place > -1) {
        if (topicComponents.count == place + 2) {
            if (data.length) {
                NSString *dataString = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
                NSArray *tokens = [dataString componentsSeparatedByString:@" "];
                if (tokens.count == 4) {
                    [[ActivityModel sharedInstance] addPlace:[topicComponents[place + 1] integerValue]
                                                        name:tokens[0]
                                                    latitude:[tokens[1] doubleValue]
                                                   longitude:[tokens[2] doubleValue]
                                                      radius:[tokens[3] doubleValue]];

                }
            } else {
                [[ActivityModel sharedInstance] deletePlace:[topicComponents[place + 1] integerValue]];
            }
        }
    }
    
    int machine = -1;
    for (int i = 0; i < topicComponents.count; i++) {
        NSString *component = topicComponents[i];
        if ([component isEqualToString:@"machine"]) {
            machine = i;
            break;
        }
    }
    if (machine > -1) {
        if (topicComponents.count == machine + 2) {
            if (data.length) {
                NSString *dataString = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
                NSArray *tokens = [dataString componentsSeparatedByString:@" "];
                if (tokens.count == 4) {
                    [[ActivityModel sharedInstance] addMachine:[topicComponents[machine + 1] integerValue]
                                                          name:tokens[0]
                                                          uuid:tokens[1]
                                                         major:[tokens[2] intValue]
                                                         minor:[tokens[3] intValue]];
                    
                }
            } else {
                [[ActivityModel sharedInstance] deleteMachine:[topicComponents[machine + 1] integerValue]];
            }
        }
    }
}

- (void)connected:(MQTTSession *)session sessionPresent:(BOOL)sessionPresent {
    if (!sessionPresent) {
        [self.mqttSession subscribeToTopic:[[NSUserDefaults standardUserDefaults] stringForKey:@"Subscription"]
                                   atLevel:MQTTQosLevelAtLeastOnce];
    }
}

- (void)handleEvent:(MQTTSession *)session event:(MQTTSessionEvent)eventCode error:(NSError *)error {
    _mqttError = error;
}

#pragma mark - Core Data stack

@synthesize managedObjectContext = _managedObjectContext;
@synthesize managedObjectModel = _managedObjectModel;
@synthesize persistentStoreCoordinator = _persistentStoreCoordinator;

- (NSURL *)applicationDocumentsDirectory {
    // The directory the application uses to store the Core Data store file. This code uses a directory named "org.owntracks.OwnTracksActivo" in the application's documents directory.
    return [[[NSFileManager defaultManager] URLsForDirectory:NSDocumentDirectory inDomains:NSUserDomainMask] lastObject];
}

- (NSManagedObjectModel *)managedObjectModel {
    // The managed object model for the application. It is a fatal error for the application not to be able to find and load its model.
    if (_managedObjectModel != nil) {
        return _managedObjectModel;
    }
    NSURL *modelURL = [[NSBundle mainBundle] URLForResource:@"OwnTracksActivo" withExtension:@"momd"];
    _managedObjectModel = [[NSManagedObjectModel alloc] initWithContentsOfURL:modelURL];
    return _managedObjectModel;
}

- (NSPersistentStoreCoordinator *)persistentStoreCoordinator {
    // The persistent store coordinator for the application. This implementation creates and return a coordinator, having added the store for the application to it.
    if (_persistentStoreCoordinator != nil) {
        return _persistentStoreCoordinator;
    }
    
    // Create the coordinator and store
    
    _persistentStoreCoordinator = [[NSPersistentStoreCoordinator alloc] initWithManagedObjectModel:[self managedObjectModel]];
    NSURL *storeURL = [[self applicationDocumentsDirectory] URLByAppendingPathComponent:@"OwnTracksActivo.sqlite"];
    NSDictionary *options = @{NSMigratePersistentStoresAutomaticallyOption: @YES,
                              NSInferMappingModelAutomaticallyOption: @YES};
    
    NSError *error = nil;
    NSString *failureReason = @"There was an error creating or loading the application's saved data.";
    if (![_persistentStoreCoordinator addPersistentStoreWithType:NSSQLiteStoreType
                                                   configuration:nil
                                                             URL:storeURL
                                                         options:options
                                                           error:&error]) {
        // Report any error we got.
        NSMutableDictionary *dict = [NSMutableDictionary dictionary];
        dict[NSLocalizedDescriptionKey] = @"Failed to initialize the application's saved data";
        dict[NSLocalizedFailureReasonErrorKey] = failureReason;
        dict[NSUnderlyingErrorKey] = error;
        error = [NSError errorWithDomain:@"YOUR_ERROR_DOMAIN" code:9999 userInfo:dict];
        // Replace this with code to handle the error appropriately.
        // abort() causes the application to generate a crash log and terminate. You should not use this function in a shipping application, although it may be useful during development.
        NSLog(@"Unresolved error %@, %@", error, [error userInfo]);
        abort();
    }
    
    return _persistentStoreCoordinator;
}


- (NSManagedObjectContext *)managedObjectContext {
    // Returns the managed object context for the application (which is already bound to the persistent store coordinator for the application.)
    if (_managedObjectContext != nil) {
        return _managedObjectContext;
    }
    
    NSPersistentStoreCoordinator *coordinator = [self persistentStoreCoordinator];
    if (!coordinator) {
        return nil;
    }
    _managedObjectContext = [[NSManagedObjectContext alloc] init];
    [_managedObjectContext setPersistentStoreCoordinator:coordinator];
    return _managedObjectContext;
}

#pragma mark - Core Data Saving support

- (void)saveContext {
    NSManagedObjectContext *managedObjectContext = self.managedObjectContext;
    if (managedObjectContext != nil) {
        NSError *error = nil;
        if ([managedObjectContext hasChanges] && ![managedObjectContext save:&error]) {
            // Replace this implementation with code to handle the error appropriately.
            // abort() causes the application to generate a crash log and terminate. You should not use this function in a shipping application, although it may be useful during development.
            NSLog(@"Unresolved error %@, %@", error, [error userInfo]);
            abort();
        }
    }
}

@end
