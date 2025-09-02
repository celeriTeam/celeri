#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PedometerModule, NSObject)
RCT_EXTERN_METHOD(startPedometerUpdates: (RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(queryPedometerData: (nonnull NSNumber *)startTimestamp
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
