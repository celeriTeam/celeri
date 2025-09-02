import Foundation
import CoreMotion
import React

@objc(PedometerModule)
class PedometerModule: NSObject {
  let pedometer = CMPedometer()

  @objc
  func startPedometerUpdates(_ callback: @escaping RCTResponseSenderBlock) {
    if CMPedometer.isStepCountingAvailable() {
      pedometer.startUpdates(from: Date()) { data, error in
        guard let steps = data?.numberOfSteps else {
          callback(["Step data not available"])
          return
        }
        callback([NSNull(), steps])
      }
    } else {
      callback(["Step counting not available"])
    }
  }

  @objc
  func queryPedometerData(_ startTimestamp: NSNumber, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    let startDate = Date(timeIntervalSince1970: startTimestamp.doubleValue)
    let endDate = Date()
    pedometer.queryPedometerData(from: startDate, to: endDate) { data, error in
      if let error = error {
        rejecter("query_error", "Failed to query step data", error)
      } else {
        resolver(data?.numberOfSteps.intValue ?? 0)
      }
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
