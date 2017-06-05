//
//  IdPicker.m
//  Wegeheld
//
//  Created by Christoph Krey on 18.02.15.
//  Copyright © 2015-2016 OwnTracks. All rights reserved.
//

#import "IdPicker.h"

@interface IdPicker()
@property (strong, nonatomic) UIPickerView *pickerView;
@property (nonatomic) NSUInteger maxLines;

@end

@implementation IdPicker

- (void)initialize {
    self.pickerView = [[UIPickerView alloc] init];
    [self.pickerView setAutoresizingMask:UIViewAutoresizingFlexibleHeight | UIViewAutoresizingFlexibleWidth];
    [self.pickerView setShowsSelectionIndicator:YES];
    self.pickerView.delegate = self;
    self.pickerView.dataSource = self;
    self.inputView = self.pickerView;
    
    UIBarButtonItem *doneButton = [[UIBarButtonItem alloc]
                                   initWithTitle:NSLocalizedString(@"Done", @"Done")
                                   style:UIBarButtonItemStyleDone
                                   target:self action:@selector(done:)];
    
    UIBarButtonItem *flexibleSpace = [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemFlexibleSpace
                                                                                   target:nil
                                                                                   action:nil];
    UIToolbar *toolBar = [[UIToolbar alloc]initWithFrame:
                          CGRectMake(0, self.frame.size.height-50, 320, 50)];
    NSArray *toolbarItems = [NSArray arrayWithObjects: flexibleSpace, doneButton, nil];
    [toolBar setItems:toolbarItems];
    self.inputAccessoryView = toolBar;
}

- (void)done:(UIBarButtonItem *)button {
    [self resignFirstResponder];
}

- (instancetype)initWithFrame:(CGRect)frame
{
    self = [super initWithFrame:frame];
    if (self)
    {
        [self initialize];
    }
    return self;
}

- (instancetype)initWithCoder:(NSCoder *)aDecoder
{
    self = [super initWithCoder:aDecoder];
    if (self)
    {
        [self initialize];
    }
    return self;
}

- (void)setArray:(NSArray *)array {
    _array = array;
    [self.pickerView reloadAllComponents];
}

- (void)setArrayId:(int)arrayId {
    _arrayId = arrayId;
    if (arrayId == 0) {
        self.text = @"";
    } else {
        for (int i = 0; i < self.array.count; i++) {
            if ([self.array[i] respondsToSelector:@selector(identifier)]) {
                int foundId = [[self.array[i] performSelector:@selector(identifier) withObject:nil] intValue];
                if (foundId == arrayId) {
                    if ([self.array[i] respondsToSelector:@selector(name)]) {
                        self.text = [self.array[i] performSelector:@selector(name) withObject:nil];
                    }
                    break;
                }
            }
        }
    }
}

- (NSInteger)numberOfComponentsInPickerView:(UIPickerView *)pickerView {
    return 1;
}

- (NSInteger)pickerView:(UIPickerView *)pickerView numberOfRowsInComponent:(NSInteger)component {
    return self.array.count + 1;
}

- (NSString *)pickerView:(UIPickerView *)pickerView titleForRow:(NSInteger)row forComponent:(NSInteger)component {
    NSString *string;
    if (row > 0) {
        if ([self.array[row - 1] respondsToSelector:@selector(name)]) {
            string = [self.array[row - 1] performSelector:@selector(name) withObject:nil];
        } else {
            string = [NSString stringWithFormat:@"Row %ld", (long)row - 1];
        }
    } else {
        string = NSLocalizedString(@"Select", @"Select");
    }
    return string;
}

- (void)pickerView:(UIPickerView *)pickerView didSelectRow:(NSInteger)row inComponent:(NSInteger)component {
    if (row == 0 || self.array.count > row - 1) {
        if (row > 0) {
            if ([self.array[row - 1] respondsToSelector:@selector(identifier)]) {
                self.arrayId = [[self.array[row - 1] performSelector:@selector(identifier) withObject:nil] intValue];
            } else {
                self.arrayId = 0;
            }
            if ([self.array[row - 1] respondsToSelector:@selector(name)]) {
                self.text = [self.array[row - 1] performSelector:@selector(name) withObject:nil];
            } else {
                self.text = @"";
            }
        } else {
            self.text = @"";
            self.arrayId = 0;
        }
        [self sendActionsForControlEvents:UIControlEventValueChanged];
    }
}

@end
