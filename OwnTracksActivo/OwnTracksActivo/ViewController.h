//
//  ViewController.h
//  OwnTracksActivo
//
//  Created by Christoph Krey on 22.04.15.
//  Copyright © 2015-2016 OwnTracks. All rights reserved.
//

#import <UIKit/UIKit.h>
#import <CoreData/CoreData.h>
#import "LocationManager.h"

@interface ViewController : UIViewController
                    <UITableViewDataSource,
                    UITableViewDelegate,
                    NSFetchedResultsControllerDelegate,
                    UIAlertViewDelegate,
                    LocationManagerDelegate>


@end

