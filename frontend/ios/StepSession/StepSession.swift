// // ios/<YourApp>/StepSession/StepSession.swift
// import Foundation
// import HealthKit

// @objc(StepSession)
// final class StepSession: RCTEventEmitter {
//   // MARK: - Types
//   struct StartOptions: Codable {
//     let startAtIso: String
//     let endAtIso: String?
//     let uploadUrl: String
//     let authHeader: String?
//     let competitionId: String
//   }

//   // MARK: - HealthKit
//   private let healthStore = HKHealthStore()
//   private var workoutSessionMode = false
//   private var stepQuery: HKQuery?
//   private var observerQuery: HKObserverQuery?
//   private var anchor: HKQueryAnchor?
//   private var startDate: Date?
//   private var stepsSinceStart: Int = 0
//   private var minuteTimer: DispatchSourceTimer?
//   private var isRunningFlag = false
  
//   // iOS 17+ workout session properties
//   #if os(iOS)
//   @available(iOS 17.0, *)
//   private var session: HKWorkoutSession?
//   #endif

//   // MARK: - Background URLSession
//   private lazy var bgSession: URLSession = {
//     let cfg = URLSessionConfiguration.background(withIdentifier: Bundle.main.bundleIdentifier! + ".steps.bg")
//     cfg.sessionSendsLaunchEvents = true
//     cfg.isDiscretionary = false
//     cfg.allowsExpensiveNetworkAccess = true
//     cfg.allowsConstrainedNetworkAccess = true
//     return URLSession(configuration: cfg, delegate: self, delegateQueue: nil)
//   }()

//   private var lastUploadMinute: Int = -1
//   private var currentOpts: StartOptions?

//   // MARK: - RN plumbing
//   override static func requiresMainQueueSetup() -> Bool { true }
//   override func supportedEvents() -> [String]! { ["StepUpdate", "MinuteTick"] }

//   // MARK: - Permissions
//   @objc
//   func ensurePermissions(_ resolve: @escaping RCTPromiseResolveBlock,
//                          rejecter reject: @escaping RCTPromiseRejectBlock) {
//     let stepType = HKObjectType.quantityType(forIdentifier: .stepCount)!
    
//     // Always request step read permissions
//     var toShare: Set<HKSampleType> = []
//     var toRead: Set<HKObjectType> = [stepType]
    
//     // On iOS 17+, also request workout permissions
//     if #available(iOS 17.0, *) {
//       toShare.insert(HKObjectType.workoutType())
//     }
    
//     healthStore.requestAuthorization(toShare: toShare, read: toRead) { ok, err in
//       if let err = err { reject("perm_error", err.localizedDescription, err); return }
//       resolve(ok)
//     }
//   }

//   // MARK: - Start
//   @objc
//   func start(_ options: NSDictionary,
//              resolver resolve: @escaping RCTPromiseResolveBlock,
//              rejecter reject: @escaping RCTPromiseRejectBlock) {
//     guard !isRunningFlag else { resolve(true); return }
    
//     do {
//       // Parse options
//       let data = try JSONSerialization.data(withJSONObject: options, options: [])
//       let opts = try JSONDecoder().decode(StartOptions.self, from: data)
//       currentOpts = opts
//       let formatter = ISO8601DateFormatter()
//       guard let start = formatter.date(from: opts.startAtIso) else {
//         reject("bad_start", "Invalid startAtIso", nil); return
//       }
//       startDate = start
//       stepsSinceStart = 0
//       lastUploadMinute = -1
      
//       // Use workout session if iOS 17+ available
//       if #available(iOS 17.0, *) {
//         startWorkoutSession(start: start, resolve: resolve, reject: reject)
//       } else {
//         // Fallback for earlier iOS versions - just use queries
//         startStepTracking(from: start)
//         installMinuteTimer()
//         enableBackgroundDelivery()
//         isRunningFlag = true
//         resolve(true)
//       }
//     } catch {
//       reject("start_error", error.localizedDescription, error)
//     }
//   }
  
//   // iOS 17+ workout session start
//   @available(iOS 17.0, *)
//   private func startWorkoutSession(start: Date, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
//     do {
//       // Workout configuration
//       let cfg = HKWorkoutConfiguration()
//       cfg.activityType = .walking
//       cfg.locationType = .indoor

//       // CORRECT INITIALIZER: Don't use healthStore parameter
//       session = try HKWorkoutSession(configuration: cfg)
      
//       // Add the session to the health store
//       healthStore.start(session!)
    
//       // Handle state changes
//       session!.delegate = self
  
//       // Start workout
//       session!.startActivity(with: start)
//       workoutSessionMode = true
  
//       // Still use our step query for consistent counting
//       startStepTracking(from: start)
//       installMinuteTimer()
//       enableBackgroundDelivery()
//       isRunningFlag = true
//       resolve(true)
//     } catch {
//       // If workout session fails, fall back to query-only approach
//       print("Workout session failed, falling back: \(error.localizedDescription)")
//       startStepTracking(from: start)
//       installMinuteTimer()
//       enableBackgroundDelivery() 
//       isRunningFlag = true
//       resolve(true)
//     }
//   }

//   // MARK: - Stop
//   @objc
//   func stop(_ resolve: @escaping RCTPromiseResolveBlock,
//             rejecter reject: @escaping RCTPromiseRejectBlock) {
//     minuteTimer?.cancel()
//     minuteTimer = nil
    
//     if let query = stepQuery {
//       healthStore.stop(query)
//       stepQuery = nil
//     }
    
//     if let observer = observerQuery {
//       healthStore.stop(observer)
//       observerQuery = nil
//     }
    
//     // End workout session if available and active
//     if #available(iOS 17.0, *), workoutSessionMode, let session = session {
//       healthStore.end(session)  // Use healthStore.end instead of session.end()
//       self.session = nil
//       workoutSessionMode = false
//     }
    
//     isRunningFlag = false
//     resolve(true)
//   }

//   @objc
//   func isRunning(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
//     resolve(isRunningFlag)
//   }

//   // MARK: - Step Tracking (works on all iOS versions)
//   private func startStepTracking(from start: Date) {
//     let type = HKObjectType.quantityType(forIdentifier: .stepCount)!
//     let predicate = HKQuery.predicateForSamples(withStart: start, end: nil, options: .strictStartDate)

//     let query = HKAnchoredObjectQuery(type: type, predicate: predicate, anchor: anchor, limit: HKObjectQueryNoLimit) { [weak self] _, samples, _, newAnchor, _ in
//       self?.anchor = newAnchor
//       self?.consume(samples: samples)
//     }
    
//     query.updateHandler = { [weak self] _, samples, _, newAnchor, _ in
//       self?.anchor = newAnchor
//       self?.consume(samples: samples)
//     }
    
//     stepQuery = query
//     healthStore.execute(query)
//   }

//   private func consume(samples: [HKSample]?) {
//     guard let samples = samples as? [HKQuantitySample] else { return }
//     let delta = samples.reduce(0) { acc, sample in
//       acc + Int(sample.quantity.doubleValue(for: .count()))
//     }
//     if delta > 0 {
//       stepsSinceStart += delta
//       sendEvent(withName: "StepUpdate", body: ["steps": stepsSinceStart])
//     }
//   }

//   private func enableBackgroundDelivery() {
//     let type = HKObjectType.quantityType(forIdentifier: .stepCount)!
//     healthStore.enableBackgroundDelivery(for: type, frequency: .immediate) { _, _ in }
    
//     let observer = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, completion, _ in
//       // When woken, run another anchored fetch to catch up
//       if let start = self?.startDate, self?.isRunningFlag == true {
//         self?.startStepTracking(from: start)
//       }
//       completion()
//     }
    
//     observerQuery = observer
//     healthStore.execute(observer)
//   }

//   private func installMinuteTimer() {
//     guard let start = startDate else { return }
//     let q = DispatchQueue.global(qos: .background)
//     let t = DispatchSource.makeTimerSource(queue: q)
//     // Align to next wall-minute
//     let now = Date()
//     let toNextMin = 60 - (now.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 60))
//     t.schedule(deadline: .now() + toNextMin, repeating: 60)
//     t.setEventHandler { [weak self] in
//       guard let self = self, let opts = self.currentOpts else { return }
//       let minuteIdx = Int(Date().timeIntervalSince(start) / 60.0)
//       if minuteIdx != self.lastUploadMinute {
//         self.lastUploadMinute = minuteIdx
//         self.enqueueMinuteUpload(opts: opts, minuteIndex: minuteIdx, steps: self.stepsSinceStart)
//         self.sendEvent(withName: "MinuteTick", body: [:])
//       }
//     }
//     t.resume()
//     minuteTimer = t
//   }

//   private func enqueueMinuteUpload(opts: StartOptions, minuteIndex: Int, steps: Int) {
//     guard let url = URL(string: opts.uploadUrl) else { return }
//     var req = URLRequest(url: url)
//     req.httpMethod = "PUT"
//     if let h = opts.authHeader { req.addValue(h, forHTTPHeaderField: "Authorization") }
//     req.addValue("application/json", forHTTPHeaderField: "Content-Type")

//     let payload: [String: Any] = [
//       "competitionId": opts.competitionId,
//       "minuteIndex": minuteIndex,
//       "stepsSinceStart": steps,
//       "deviceTs": ISO8601DateFormatter().string(from: Date())
//     ]
//     // write small JSON file so background upload survives
//     let tmp = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("m\(minuteIndex).json")
//     if let data = try? JSONSerialization.data(withJSONObject: payload, options: []) {
//       try? data.write(to: tmp, options: .atomic)
//       bgSession.uploadTask(with: req, fromFile: tmp).resume()
//     }
//   }
// }

// // MARK: - URLSession delegates
// extension StepSession: URLSessionDelegate, URLSessionTaskDelegate {
//   // Add hooks if you want logging; not required for functionality
// }

// // MARK: - HKWorkoutSessionDelegate
// @available(iOS 17.0, *)
// extension StepSession: HKWorkoutSessionDelegate {
//   func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState, from fromState: HKWorkoutSessionState, date: Date) {
//     print("Workout session state changed: \(fromState.rawValue) -> \(toState.rawValue)")
//   }
  
//   func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
//     print("Workout session failed: \(error.localizedDescription)")
//     // Fallback to regular step tracking if workout session fails
//     if let start = startDate, isRunningFlag {
//       startStepTracking(from: start)
//     }
//   }
// }
