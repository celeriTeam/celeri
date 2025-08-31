// import ExpoModulesCore
// import HealthKit
// import UIKit

// // Fix MinuteStepsManager class with proper annotations
// @available(iOS 17.0, *)
// class MinuteStepsManager: NSObject {
//     static let shared = MinuteStepsManager()
//     private let store = HKHealthStore()
//     private var session: HKWorkoutSession?
//     private var anchor: HKQueryAnchor?
//     private var observer: HKObserverQuery?
//     private var startDate: Date?
    
//     var onMinuteTotal: ((Int) -> Void)?
    
//     // MARK: - Auth
//     func requestAuth(_ done: @escaping (Bool, Error?) -> Void) {
//         guard HKHealthStore.isHealthDataAvailable(),
//               let steps = HKObjectType.quantityType(forIdentifier: .stepCount) else {
//             done(false, NSError(domain: "LiveHK", code: 1, userInfo: [NSLocalizedDescriptionKey: "Health data not available"]))
//             return
//         }
//         store.requestAuthorization(toShare: [], read: [steps, HKObjectType.workoutType()]) { ok, err in
//             done(ok, err)
//         }
//     }
    
//     // MARK: - Start/stop workout (no builder)
//     func startWorkout(_ done: @escaping (Error?) -> Void) {
//         let cfg = HKWorkoutConfiguration()
//         cfg.activityType = .walking
//         cfg.locationType = .outdoor

//         //Create workout session
//         do {
//           let session = try HKWorkoutSession(healthStore: store, configuration: cfg)
//           session.delegate = self

//           let builder = session.associatedWorkoutBuilder()
//           builder.delegate = self
//           builder.dataSource = HKLiveWorkoutDataSource(healthStore: store, workoutConfiguration: cfg)

//           session.prepare()

//           session.startActivity(with: startDate)
//           try await builder.beginCollection(at: startDate)
        
//            // setupBackgroundSteps() { err in done(err) }
//         } catch {
//             done(error)
//         }
//     }
    
//     func stopWorkout(_ done: @escaping (Error?) -> Void) {
//         observer.map(store.stop)
//         observer = nil
        
//         if let s = session {
//           s.stopActivity(with: Date())           // stop the activity
//           s.end()                                 // end the session
//           // If you used a builder, end collection and finish the workout in the delegate once state changes to .ended
//         }
//       session = nil
//       startDate = nil
//       done(nil)
//     }
//     // MARK: - Background delivery + queries
//     private func setupBackgroundSteps(_ done: @escaping (Error?) -> Void) {
//         guard let stepsType = HKObjectType.quantityType(forIdentifier: .stepCount),
//               let start = startDate else { done(nil); return }
        
//         // Enable immediate background delivery for steps
//         store.enableBackgroundDelivery(for: stepsType, frequency: .immediate) { ok, err in
//             if let err = err { done(err); return }
            
//             // Observer wakes us when new step samples arrive
//             self.observer = HKObserverQuery(sampleType: stepsType, predicate: nil) { [weak self] _, completion, _ in
//                 self?.runMinuteStats(from: start)
//                 completion()
//             }
//             if let o = self.observer { self.store.execute(o) }
            
//             // Prime once immediately
//             self.runMinuteStats(from: start)
//             done(nil)
//         }
//     }
    
//     /// Compute totals in 1-minute buckets from session start -> now
//     private func runMinuteStats(from start: Date) {
//         guard let stepsType = HKObjectType.quantityType(forIdentifier: .stepCount) else { return }
        
//         var anchorDate = Calendar.current.dateInterval(of: .day, for: start)?.start ?? start
//         // Minute granularity
//         var interval = DateComponents()
//         interval.minute = 1
        
//         let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: [.strictStartDate])
        
//         let q = HKStatisticsCollectionQuery(
//             quantityType: stepsType,
//             quantitySamplePredicate: predicate,
//             options: [.cumulativeSum],
//             anchorDate: anchorDate,
//             intervalComponents: interval
//         )
        
//         q.initialResultsHandler = { [weak self] _, coll, _ in
//             guard let self, let coll else { return }
//             let end = Date()
//             var total = 0
//             coll.enumerateStatistics(from: start, to: end) { stats, _ in
//                 if let sum = stats.sumQuantity() {
//                     total += Int(sum.doubleValue(for: HKUnit.count()))
//                 }
//             }
//             print("[LiveHealthkit] Initial stats - total steps: \(total)")
//             DispatchQueue.main.async { self.onMinuteTotal?(total) } // total since workout start
//         }
        
//         q.statisticsUpdateHandler = { [weak self] _, _, coll, _ in
//             guard let self, let coll else { return }
//             let end = Date()
//             var total = 0
//             coll.enumerateStatistics(from: start, to: end) { stats, _ in
//                 if let sum = stats.sumQuantity() {
//                     total += Int(sum.doubleValue(for: .count()))
//                 }
//             }
//             DispatchQueue.main.async { self.onMinuteTotal?(total) }
//         }
        
//         store.execute(q)
//     }
    
//     // Add to MinuteStepsManager
//     func applicationWillEnterBackground() {
//         // Ensure the observer is active when entering background
//         if let start = startDate, observer == nil {
//             setupBackgroundSteps { _ in }
//         }
//     }
    
//     private var backgroundTask: UIBackgroundTaskIdentifier = .invalid
//     private func beginBackgroundTask() {
//         endBackgroundTask()
//         backgroundTask = UIApplication.shared.beginBackgroundTask { [weak self] in
//             self?.endBackgroundTask()
//         }
//     }
    
//     private func endBackgroundTask() {
//         if backgroundTask != .invalid {
//             UIApplication.shared.endBackgroundTask(backgroundTask)
//             backgroundTask = .invalid
//         }
//     }
// }

// extension MinuteStepsManager: HKWorkoutSessionDelegate {
//   public func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState, from fromState: HKWorkoutSessionState, date: Date) {
//         print("[MinuteStepsManager] Session state changed: \(fromState.rawValue) -> \(toState.rawValue)")
//     }
  
//   public func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
//         print("[MinuteStepsManager] Session failed: \(error.localizedDescription)")
//     }
// }

// // ---- Expo Module surface ----
// public class LiveHealthkitModule: Module {
//     // Version check helper
//     private var isIOS17Available: Bool {
//         if #available(iOS 17.0, *) { return true }
//         return false
//     }
    
//     // Conditionally create manager
//     private lazy var stepManager: Any? = {
//         if #available(iOS 17.0, *) {
//             return MinuteStepsManager.shared
//         }
//         return nil
//     }()
    
//     public func definition() -> ModuleDefinition {
//         Name("LiveHealthkit")
        
//         Constants([
//           "PI": Double.pi,
//           "HAS_WORKOUT_API": self.isIOS17Available
//         ])
        
//         Events("onChange", "onMinuteSteps")
        
//         // Basic functions for all iOS versions
//         AsyncFunction("hello") { () -> String in
//             print("[LiveHealthkit] Hello world from native 👋")
//             return "Hello world! 👋"
//         }
        
//         AsyncFunction("emitTest") {
//             self.sendEvent("onChange", ["value": "native says hi"])
//         }
        
//         // Testing helper that works on all iOS versions
//         AsyncFunction("simulateSteps") { (steps: Int) in
//             print("[LiveHealthkit] Simulating \(steps) steps")
//             self.sendEvent("onMinuteSteps", ["value": steps])
//         }
        
        
//         AsyncFunction("startWorkoutSession") {
//           guard #available(iOS 17.0, *),
//                 let mgr = self.stepManager as? MinuteStepsManager else {
//             throw NSError(domain: "LiveHealthkit", code: 1, userInfo: [NSLocalizedDescriptionKey: "iOS 17+ required"])
//           }
//           try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
//             mgr.onMinuteTotal = { [weak self] total in
//               self?.sendEvent("onMinuteSteps", ["value": total])
//             }
//             mgr.startWorkout { err in
//               if let err = err { cont.resume(throwing: err) }
//               else { cont.resume() }
//             }
//           }
//         }

//         AsyncFunction("stopWorkoutSession") {
//           guard #available(iOS 17.0, *),
//                 let mgr = self.stepManager as? MinuteStepsManager else {
//             throw NSError(domain: "LiveHealthkit", code: 1, userInfo: [NSLocalizedDescriptionKey: "iOS 17+ required"])
//           }
//           try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
//             mgr.stopWorkout { err in
//               if let err = err { cont.resume(throwing: err) }
//               else { cont.resume() }
//             }
//           }
//         }
        
        
//         // // View component if needed
//         // View(LiveHealthkitView.self) {
//         //     // View props...
//         // }
//     }
    
//     // public override func appContextDidEnterBackground() {
//     //   if let mgr = stepManager as? MinuteStepsManager {
//     //     mgr.applicationWillEnterBackground()
//     //   }
//     // }
// }
