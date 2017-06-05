//
//  ViewController.m
//  OwnTracksActivo
//
//  Created by Christoph Krey on 22.04.15.
//  Copyright © 2015-2016 OwnTracks. All rights reserved.
//

#import "ViewController.h"
#import "AppDelegate.h"
#import "Log.h"
#import "ActivityModel.h"
#import "IdPicker.h"

#import <Crashlytics/Crashlytics.h>

@interface ViewController ()
@property (weak, nonatomic) IBOutlet UIBarButtonItem *home;
@property (weak, nonatomic) IBOutlet IdPicker *tasks;
@property (weak, nonatomic) IBOutlet IdPicker *jobs;
@property (weak, nonatomic) IBOutlet IdPicker *places;
@property (weak, nonatomic) IBOutlet IdPicker *machines;
@property (weak, nonatomic) IBOutlet UIBarButtonItem *play;
@property (weak, nonatomic) IBOutlet UIBarButtonItem *pause;
@property (weak, nonatomic) IBOutlet UIBarButtonItem *stop;
@property (weak, nonatomic) IBOutlet UILabel *status;
@property (weak, nonatomic) IBOutlet UITableView *logs;

@property (strong, nonatomic) NSFetchedResultsController *fetchedResultsController;
@property (strong, nonatomic) NSTimer *timer;
@property (nonatomic) BOOL automaticPlace;
@property (nonatomic) BOOL automaticMachine;

@end

@implementation ViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    self.logs.delegate = self;
    self.logs.dataSource = self;
    [self.logs reloadData];
    
    [LocationManager sharedInstance].delegate = self;;
    [[LocationManager sharedInstance] start];
    [[LocationManager sharedInstance] resetRegions];
    NSArray *beacons = [[NSUserDefaults standardUserDefaults] arrayForKey:@"Beacons"];
    for (NSString *uuidString in beacons) {
        NSUUID *uuid = [[NSUUID alloc] initWithUUIDString:uuidString];
        CLBeaconRegion *beaconRegion = [[CLBeaconRegion alloc] initWithProximityUUID:uuid
                                                                      identifier:uuidString];
        [[LocationManager sharedInstance] startRegion:beaconRegion];
    }
}

- (void)regionEvent:(CLRegion *)region enter:(BOOL)enter {
   //
}

- (void)regionState:(CLRegion *)region inside:(BOOL)inside {
   //
}

- (void)beaconInRange:(CLBeacon *)beacon {
    if (self.automaticMachine) {
        NSArray *machines = [[ActivityModel sharedInstance] machines];
        for (Machine *machine in machines) {
            if ([machine.uuid isEqualToString:beacon.proximityUUID.UUIDString] &&
                ([machine.major intValue] == 0 || [machine.major intValue] == [beacon.major intValue]) &&
                ([machine.minor intValue] == 0 || [machine.minor intValue] == [beacon.minor intValue])) {
                self.machines.arrayId = [machine.identifier intValue];
                [self setStatus];
                break;
            }
        }
    }
}

- (void)newLocation {
    if (self.automaticPlace) {
        NSArray *places = [[ActivityModel sharedInstance] places];
        for (Place *place in places) {
            CLCircularRegion *circularRegion = [[CLCircularRegion alloc]
                                                initWithCenter:CLLocationCoordinate2DMake([place.latitude doubleValue],
                                                                                          [place.longitude doubleValue])
                                                radius:[place.radius doubleValue]
                                                identifier:place.name];
            if ([circularRegion containsCoordinate:[LocationManager sharedInstance].location.coordinate]) {
                self.places.arrayId = [place.identifier intValue];
                [self setStatus];
                break;
            }
        }
    }
}

- (void)viewDidAppear:(BOOL)animated {
    self.timer = [NSTimer timerWithTimeInterval:1.0 target:self selector:@selector(tick:) userInfo:nil repeats:true];
    [[NSRunLoop currentRunLoop] addTimer:self.timer forMode:NSRunLoopCommonModes];
    
    self.title = [[NSUserDefaults standardUserDefaults] stringForKey:@"Caption"];
    NSDictionary *background = [[NSUserDefaults standardUserDefaults] dictionaryForKey:@"Background"];
    self.view.backgroundColor = [UIColor colorWithRed:[[background objectForKey:@"Red"] intValue] / 255.0
                                                green:[[background objectForKey:@"Green"] intValue] / 255.0
                                                 blue:[[background objectForKey:@"Blue"] intValue] / 255.0
                                                alpha:[[background objectForKey:@"Alpha"] intValue] / 255.0];
    
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    [appDelegate.mqttSession addObserver:self forKeyPath:@"status"
                                 options:NSKeyValueObservingOptionInitial | NSKeyValueObservingOptionNew
                                 context:nil];
    [self setStatus];
}

- (void)viewWillDisappear:(BOOL)animated {
    [self.timer invalidate];
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    [appDelegate.mqttSession removeObserver:self forKeyPath:@"status" context:nil];

    [super viewWillDisappear:animated];
}

- (void)observeValueForKeyPath:(NSString *)keyPath ofObject:(id)object change:(NSDictionary *)change context:(void *)context {
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    switch (appDelegate.mqttSession.status) {
        case MQTTSessionStatusConnected:
            self.home.tintColor = [UIColor greenColor];
            break;
        case MQTTSessionStatusConnecting:
        case MQTTSessionStatusCreated:
        case MQTTSessionStatusDisconnecting:
            self.home.tintColor = [UIColor yellowColor];
            break;
        case MQTTSessionStatusClosed:
        case MQTTSessionStatusError:
        default:
            self.home.tintColor = [UIColor redColor];
            break;
    }
}

- (void)setStatus {
#define noColor [UIColor colorWithRed:0.75 green:0.75 blue:0.75 alpha:1.0]
#define defaultColor [UIColor colorWithRed:0.75 green:0.75 blue:1.0 alpha:1.0]
#define valueColor [UIColor colorWithRed:0.75 green:1.0 blue:0.75 alpha:1.0]
#define runColor [UIColor colorWithRed:71.0/255.0 green:141.0/255.0 blue:178.0/255.0 alpha:1.0]
    
    self.jobs.array = [[ActivityModel sharedInstance] jobs];
    self.places.array = [[ActivityModel sharedInstance] places];
    self.machines.array = [[ActivityModel sharedInstance] machines];
    self.tasks.array = [[ActivityModel sharedInstance] tasksForJob:self.jobs.arrayId];

    if ([ActivityModel sharedInstance].activity) {
        self.jobs.enabled = false;
        self.jobs.borderStyle = UITextBorderStyleNone;
        self.jobs.backgroundColor = runColor;
        self.jobs.arrayId = (int)[[ActivityModel sharedInstance].activity.jobIdentifier integerValue];

        self.places.enabled = false;
        self.automaticPlace = false;
        self.places.borderStyle = UITextBorderStyleNone;
        self.places.backgroundColor = runColor;
        self.places.arrayId = (int)[[ActivityModel sharedInstance].activity.placeIdentifier integerValue];
        
        self.machines.enabled = false;
        self.automaticMachine = false;
        self.machines.borderStyle = UITextBorderStyleNone;
        self.machines.backgroundColor = runColor;
        self.machines.arrayId = (int)[[ActivityModel sharedInstance].activity.machineIdentifier integerValue];
        
        self.tasks.enabled = false;
        self.tasks.borderStyle = UITextBorderStyleNone;
        self.tasks.backgroundColor = runColor;
        self.tasks.arrayId = (int)[[ActivityModel sharedInstance].activity.taskIdentifier integerValue];
        
        if ([ActivityModel sharedInstance].activity.lastStart) {
            self.play.enabled = false;
            self.pause.enabled = true;
            self.stop.enabled = true;
        } else {
            self.play.enabled = true;
            self.pause.enabled = false;
            self.stop.enabled = false;
        }
    } else {
        self.jobs.enabled = true;
        self.jobs.borderStyle = UITextBorderStyleRoundedRect;
        
        self.places.enabled = true;
        if (self.places.arrayId == [ActivityModel noId]) {
            self.automaticPlace = true;
        }
        self.places.borderStyle = UITextBorderStyleRoundedRect;
        
        self.machines.enabled = true;
        if (self.machines.arrayId == [ActivityModel noId]) {
            self.automaticMachine = true;
        }
        self.machines.borderStyle = UITextBorderStyleRoundedRect;
        
        self.play.enabled = false;
        self.pause.enabled = false;
        self.stop.enabled = false;
        if (self.jobs.arrayId == [ActivityModel noId]) {
            self.tasks.enabled = false;
            self.tasks.borderStyle = UITextBorderStyleNone;
        } else {
            self.tasks.enabled = true;
            self.tasks.borderStyle = UITextBorderStyleRoundedRect;
        }
        if (self.tasks.arrayId == [ActivityModel noId] ||
            self.places.arrayId == [ActivityModel noId] ||
            self.machines.arrayId == [ActivityModel noId]) {
            self.play.enabled = false;
        } else {
            self.play.enabled = true;
        }
        if (self.jobs.arrayId == [ActivityModel noId]) {
            self.jobs.backgroundColor = noColor;
        } else if (self.jobs.arrayId == [ActivityModel defaultId]) {
            self.jobs.backgroundColor = defaultColor;
        } else {
            self.jobs.backgroundColor = valueColor;
        }
        if (self.places.arrayId == [ActivityModel noId]) {
            self.places.backgroundColor = noColor;
        } else if (self.places.arrayId == [ActivityModel defaultId]) {
            self.places.backgroundColor = defaultColor;
        } else {
            self.places.backgroundColor = valueColor;
        }
        if (self.machines.arrayId == [ActivityModel noId]) {
            self.machines.backgroundColor = noColor;
        } else if (self.machines.arrayId == [ActivityModel defaultId]) {
            self.machines.backgroundColor = defaultColor;
        } else {
            self.machines.backgroundColor = valueColor;
        }
        if (self.tasks.arrayId == [ActivityModel noId]) {
            self.tasks.backgroundColor = noColor;
        } else if (self.tasks.arrayId == [ActivityModel defaultId]) {
            self.tasks.backgroundColor = defaultColor;
        } else {
            self.tasks.backgroundColor = valueColor;
        }
    }
    
    self.automaticPlace = (self.places.arrayId == [ActivityModel noId] || self.places.arrayId == [ActivityModel defaultId]);
    self.automaticMachine = (self.machines.arrayId == [ActivityModel noId] || self.machines.arrayId == [ActivityModel defaultId]);
}

- (IBAction)jobStarting:(IdPicker *)sender {
    self.jobs.array = [[ActivityModel sharedInstance] jobs];
}

- (IBAction)job:(IdPicker *)sender {
    self.tasks.array = [[ActivityModel sharedInstance] tasksForJob:sender.arrayId];
    self.tasks.arrayId = 0;
    [self setStatus];
}

- (IBAction)taskStarting:(IdPicker *)sender {
    self.tasks.array = [[ActivityModel sharedInstance] tasksForJob:self.jobs.arrayId];
}

- (IBAction)task:(IdPicker *)sender {
    [self setStatus];
}

- (IBAction)placeStarting:(IdPicker *)sender {
    self.places.array = [[ActivityModel sharedInstance] places];
}

- (IBAction)place:(IdPicker *)sender {
    [self setStatus];
}

- (IBAction)machineStarting:(IdPicker *)sender {
    self.machines.array = [[ActivityModel sharedInstance] machines];
}

- (IBAction)machine:(IdPicker *)sender {
    [self setStatus];
}

- (IBAction)home:(UIBarButtonItem *)sender {
    NSMutableDictionary *config = [[NSMutableDictionary alloc] init];
    for (NSString *key in @[@"Publish",
                            @"Host",
                            @"Port",
                            @"SSL",
                            @"ClientId",
                            @"UserName",
                            @"Password",
                            @"Subscription",
                            @"KeepDays",
                            @"Beacons"]) {
        [config setObject:[[NSUserDefaults standardUserDefaults] objectForKey:key] forKey:key];
    }
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    [config setObject:appDelegate.mqttError ? [appDelegate.mqttError description] : @"-" forKey:@"MQTTError"];

    UIAlertView *alertView = [[UIAlertView alloc] initWithTitle:@"Configuration"
                                                        message:[config description]
                                                       delegate:self
                                              cancelButtonTitle:@"Cancel"
                                              otherButtonTitles:@"Reconnect", nil];
    [alertView show];
}

- (void)alertView:(UIAlertView *)alertView clickedButtonAtIndex:(NSInteger)buttonIndex {
    if (buttonIndex == 1) {
        AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
        [appDelegate reconnect];
    }
}

- (void)tick:(NSTimer *)timer {
    if ([ActivityModel sharedInstance].activity) {
        if ([ActivityModel sharedInstance].activity.lastStart) {
            self.status.text = [NSString stringWithFormat:@"working for %@",
                                [[ActivityModel sharedInstance] durationString]];
        } else {
            self.status.text = [NSString stringWithFormat:@"pause"];
        }
    } else {
        self.status.text = @"";
    }
    if (self.jobs.arrayId == 0 &&
        [[ActivityModel sharedInstance] getJob:[ActivityModel defaultId]] != nil) {
        self.jobs.arrayId = (int)[ActivityModel defaultId];
        self.tasks.array = [[ActivityModel sharedInstance] tasksForJob:self.jobs.arrayId];
    }
    if (self.tasks.arrayId == 0 &&
        [[ActivityModel sharedInstance] getTask:[ActivityModel defaultId] inJob:self.jobs.arrayId] != nil) {
        self.tasks.arrayId = (int)[ActivityModel defaultId];
    }
    if (self.places.arrayId == 0 &&
    
        [[ActivityModel sharedInstance] getPlace:[ActivityModel defaultId]] != nil) {
        self.places.arrayId = (int)[ActivityModel defaultId];
    }
    if (self.machines.arrayId == 0 && [[ActivityModel sharedInstance] getMachine:[ActivityModel defaultId]] != nil) {
        self.machines.arrayId = (int)[ActivityModel defaultId];
    }
    [self setStatus];
}

- (IBAction)pause:(UIBarButtonItem *)sender {
    [[ActivityModel sharedInstance] pause];
    [self setStatus];
}

- (IBAction)stop:(UIBarButtonItem *)sender {
    [[ActivityModel sharedInstance] stop];
    [self setStatus];
}

- (IBAction)play:(UIBarButtonItem *)sender {
    [[ActivityModel sharedInstance] startJob:self.jobs.arrayId
                                        task:self.tasks.arrayId
                                       place:self.places.arrayId
                                     machine:self.machines.arrayId];
    [self setStatus];}

#pragma mark - Fetched results controller

- (NSFetchedResultsController *)fetchedResultsController
{
    if (_fetchedResultsController != nil) {
        return _fetchedResultsController;
    }

    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    NSFetchedResultsController *aFetchedResultsController = [[NSFetchedResultsController alloc] initWithFetchRequest:[self fetchRequestForTableView]
                                                                                                managedObjectContext:appDelegate.managedObjectContext
                                                                                                  sectionNameKeyPath:nil
                                                                                                           cacheName:nil];
    aFetchedResultsController.delegate = self;
    self.fetchedResultsController = aFetchedResultsController;


    NSError *error = nil;
    if (![self.fetchedResultsController performFetch:&error]) {
        // Replace this implementation with code to handle     the error appropriately.
        // abort() causes the application to generate a crash log and terminate. You should not use this function in a shipping application, although it may be useful during development.
        NSLog(@"Unresolved error %@, %@", error, [error userInfo]);
        abort();
    }

    return _fetchedResultsController;
}

- (void)controllerWillChangeContent:(NSFetchedResultsController *)controller
{
    [self.logs beginUpdates];
}

- (void)controller:(NSFetchedResultsController *)controller
  didChangeSection:(id <NSFetchedResultsSectionInfo>)sectionInfo
           atIndex:(NSUInteger)sectionIndex
     forChangeType:(NSFetchedResultsChangeType)type
{
    switch(type) {
        case NSFetchedResultsChangeInsert:
            [self.logs insertSections:[NSIndexSet indexSetWithIndex:sectionIndex] withRowAnimation:UITableViewRowAnimationFade];
            break;

        case NSFetchedResultsChangeDelete:
            [self.logs deleteSections:[NSIndexSet indexSetWithIndex:sectionIndex] withRowAnimation:UITableViewRowAnimationFade];
            break;
        default:
            break;
    }
}

- (void)controller:(NSFetchedResultsController *)controller
   didChangeObject:(id)anObject
       atIndexPath:(NSIndexPath *)indexPath forChangeType:(NSFetchedResultsChangeType)type
      newIndexPath:(NSIndexPath *)newIndexPath
{
    switch(type) {
        case NSFetchedResultsChangeInsert:
            [self.logs insertRowsAtIndexPaths:@[newIndexPath] withRowAnimation:UITableViewRowAnimationFade];
            break;

        case NSFetchedResultsChangeDelete:
            [self.logs deleteRowsAtIndexPaths:@[indexPath] withRowAnimation:UITableViewRowAnimationFade];
            break;

        case NSFetchedResultsChangeUpdate:
            [self.logs reloadRowsAtIndexPaths:@[indexPath] withRowAnimation:UITableViewRowAnimationAutomatic];
            break;

        case NSFetchedResultsChangeMove:
            [self.logs deleteRowsAtIndexPaths:@[indexPath] withRowAnimation:UITableViewRowAnimationFade];
            [self.logs insertRowsAtIndexPaths:@[newIndexPath] withRowAnimation:UITableViewRowAnimationFade];
            break;
    }
}

- (void)controllerDidChangeContent:(NSFetchedResultsController *)controller
{
    [self.logs endUpdates];
}

#pragma mark - Table view data source

- (NSInteger)numberOfSectionsInTableView:(UITableView *)tableView
{
    return [[self.fetchedResultsController sections] count];
}

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section
{
    id <NSFetchedResultsSectionInfo> sectionInfo = [self.fetchedResultsController sections][section];
    return [sectionInfo numberOfObjects];
}

- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath
{
    UITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:@"log" forIndexPath:indexPath];
    [self configureCell:cell atIndexPath:indexPath];
    return cell;
}

- (BOOL)tableView:(UITableView *)tableView canEditRowAtIndexPath:(NSIndexPath *)indexPath
{
    return YES;
}

- (void)tableView:(UITableView *)tableView commitEditingStyle:(UITableViewCellEditingStyle)editingStyle forRowAtIndexPath:(NSIndexPath *)indexPath
{
    if (editingStyle == UITableViewCellEditingStyleDelete) {
        NSManagedObjectContext *context = [self.fetchedResultsController managedObjectContext];
        [context deleteObject:[self.fetchedResultsController objectAtIndexPath:indexPath]];

        NSError *error = nil;
        if (![context save:&error]) {
            NSLog(@"Unresolved error %@, %@", error, [error userInfo]);
            abort();
        }
    }
}

- (BOOL)tableView:(UITableView *)tableView canMoveRowAtIndexPath:(NSIndexPath *)indexPath
{
    return NO;
}


- (NSFetchRequest *)fetchRequestForTableView
{
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    NSFetchRequest *fetchRequest = [[NSFetchRequest alloc] init];
    NSEntityDescription *entity = [NSEntityDescription entityForName:@"Log"
                                              inManagedObjectContext:appDelegate.managedObjectContext];
    [fetchRequest setEntity:entity];
    [fetchRequest setFetchBatchSize:20];
    NSSortDescriptor *sortDescriptor1 = [[NSSortDescriptor alloc] initWithKey:@"timestamp" ascending:NO];
    NSArray *sortDescriptors = @[sortDescriptor1];

    [fetchRequest setSortDescriptors:sortDescriptors];

    return fetchRequest;
}

- (NSString *)tableView:(UITableView *)tableView titleForHeaderInSection:(NSInteger)section
{
    if ([[UIDevice currentDevice] userInterfaceIdiom] == UIUserInterfaceIdiomPad) {
        return [NSString stringWithFormat:@"Messages"];
    } else {
        return nil;
    }
}

- (void)configureCell:(UITableViewCell *)cell atIndexPath:(NSIndexPath *)indexPath
{
    Log *log = [self.fetchedResultsController objectAtIndexPath:indexPath];
    
    if (log.status) {
        switch ([log.status intValue]) {
            case 3:
                cell.imageView.image = [UIImage imageNamed:@"Stop"];
                break;
            case 2:
                cell.imageView.image = [UIImage imageNamed:@"Pause"];
                break;
            case 1:
                cell.imageView.image = [UIImage imageNamed:@"Play"];
                break;
            case 0:
            default:
                cell.imageView.image = [UIImage imageNamed:@"Logo"];
                break;
        }
    } else {
        cell.imageView.image = nil;
    }
    
    cell.detailTextLabel.text = [NSDateFormatter localizedStringFromDate:log.timestamp
                                                               dateStyle:NSDateFormatterShortStyle
                                                               timeStyle:NSDateFormatterShortStyle];
    
    cell.textLabel.text = log.content;
}

@end
