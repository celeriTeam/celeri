#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <React/RCTBridge.h>

// Basic RCTAppDelegate mock
@interface RCTAppDelegate : UIResponder <UIApplicationDelegate>
@property (nonatomic, strong) UIWindow *window;
@property (nonatomic, strong, readonly) RCTBridge *bridge;
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(nullable NSDictionary<UIApplicationLaunchOptionsKey,id> *)launchOptions;
- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge;
@end

// Basic RCTRootViewFactory mock
@interface RCTRootViewFactory : NSObject
- (id)createRootViewWithModuleName:(NSString *)moduleName initialProperties:(NSDictionary *)initialProperties;
- (NSArray *)extraModulesForBridge:(RCTBridge *)bridge;
@end

// Add this missing class
@interface RCTDefaultReactNativeFactoryDelegate : NSObject
- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge;
@end