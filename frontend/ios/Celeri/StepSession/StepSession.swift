// ios/<YourApp>/StepSession/StepSession.swift
import Foundation
import HealthKit

@objc(StepSession)
final class StepSession: RCTEventEmitter {
  // MARK: - Types
  struct StartOptions: Codable {
    let startAtIso: String
    let endAtIso: String?
    let uploadUrl: String
    let authHeader: String?
    let competitionId: String
  }

  // MARK: - HealthKit
  private let healthStore = HKHealthStore()
  private var session: HKWorkoutSession?
  private var builder: HKLiveWorkoutBuilder?
  private var anchor: HKQueryAnchor?
  private var startDate: Date?
  private var stepsSinceStart: Int = 0
  private var minuteTimer: DispatchSourceTimer?
  private var isRunningFlag = false

  // MARK: - Background URLSession
  private lazy var bgSession: URLSession = {
    let cfg = URLSessionConfiguration.background(withIdentifier: Bundle.main.bundleIdentifier! + ".steps.bg")
    cfg.sessionSendsLaunchEvents = true
    cfg.isDiscretionary = false
    cfg.allowsExpensiveNetworkAccess = true
    cfg.allowsConstrainedNetworkAccess = true
    return URLSession(configuration: cfg, delegate: self, delegateQueue: nil)
  }()

  private var lastUploadMinute: Int = -1
  private var currentOpts: StartOptions?

  // MARK: - RN plumbing
  override static func requiresMainQueueSetup() -> Bool { true }
  override func supportedEvents() -> [String]! { ["StepUpdate", "MinuteTick"] }

  // MARK: - Permissions
  @objc
  func ensurePermissions(_ resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
    let stepType = HKObjectType.quantityType(forIdentifier: .stepCount)!
    let toShare: Set = [HKObjectType.workoutType()]
    let toRead: Set = [stepType]
    healthStore.requestAuthorization(toShare: toShare, read: toRead) { ok, err in
      if let err = err { reject("perm_error", err.localizedDescription, err); return }
      resolve(ok)
    }
  }

  // MARK: - Start
  @objc
  func start(_ options: NSDictionary,
             resolver resolve: @escaping RCTPromiseResolveBlock,
             rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard !isRunningFlag else { resolve(true); return }
    do {
      let data = try JSONSerialization.data(withJSONObject: options, options: [])
      let opts = try JSONDecoder().decode(StartOptions.self, from: data)
      currentOpts = opts
      let formatter = ISO8601DateFormatter()
      guard let start = formatter.date(from: opts.startAtIso) else {
        reject("bad_start", "Invalid startAtIso", nil); return
      }
      startDate = start
      stepsSinceStart = 0
      lastUploadMinute = -1

      // Workout configuration
      let cfg = HKWorkoutConfiguration()
      cfg.activityType = .walking
      cfg.locationType = .indoor

      session = try HKWorkoutSession(healthStore: healthStore, configuration: cfg)
      builder = session!.associatedWorkoutBuilder()
      builder!.dataSource = HKLiveWorkoutDataSource(healthStore: healthStore, workoutConfiguration: cfg)

      // Start
      session!.startActivity(with: start)
      builder!.beginCollection(withStart: start) { [weak self] _, _ in
        self?.installStepStream(from: start)
        self?.installMinuteTimer()
        self?.enableBackgroundDelivery()
        self?.isRunningFlag = true
        resolve(true)
      }
    } catch {
      reject("start_error", error.localizedDescription, error)
    }
  }

  // MARK: - Stop
  @objc
  func stop(_ resolve: @escaping RCTPromiseResolveBlock,
            rejecter reject: @escaping RCTPromiseRejectBlock) {
    minuteTimer?.cancel(); minuteTimer = nil
    builder?.endCollection(withEnd: Date()) { [weak self] _, _ in
      self?.session?.end()
      self?.isRunningFlag = false
      resolve(true)
    }
  }

  @objc
  func isRunning(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    resolve(isRunningFlag)
  }

  // MARK: - Internals
  private func installStepStream(from start: Date) {
    let type = HKObjectType.quantityType(forIdentifier: .stepCount)!
    let predicate = HKQuery.predicateForSamples(withStart: start, end: nil, options: .strictStartDate)

    let q = HKAnchoredObjectQuery(type: type, predicate: predicate, anchor: anchor, limit: HKObjectQueryNoLimit) { [weak self] _, samples, _, newAnchor, _ in
      self?.anchor = newAnchor
      self?.consume(samples: samples)
    }
    q.updateHandler = { [weak self] _, samples, _, newAnchor, _ in
      self?.anchor = newAnchor
      self?.consume(samples: samples)
    }
    healthStore.execute(q)
  }

  private func consume(samples: [HKSample]?) {
    guard let samples = samples as? [HKQuantitySample] else { return }
    let delta = samples.reduce(0) { acc, sample in
      acc + Int(sample.quantity.doubleValue(for: .count()))
    }
    if delta > 0 {
      stepsSinceStart += delta
      sendEvent(withName: "StepUpdate", body: ["steps": stepsSinceStart])
    }
  }

  private func enableBackgroundDelivery() {
    let type = HKObjectType.quantityType(forIdentifier: .stepCount)!
    healthStore.enableBackgroundDelivery(for: type, frequency: .immediate) { _, _ in }
    let obs = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, completion, _ in
      // When woken, run another anchored fetch to catch up
      if let start = self?.startDate { self?.installStepStream(from: start) }
      completion()
    }
    healthStore.execute(obs)
  }

  private func installMinuteTimer() {
    guard let start = startDate else { return }
    let q = DispatchQueue.global(qos: .background)
    let t = DispatchSource.makeTimerSource(queue: q)
    // Align to next wall-minute
    let now = Date()
    let toNextMin = 60 - (now.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 60))
    t.schedule(deadline: .now() + toNextMin, repeating: 60)
    t.setEventHandler { [weak self] in
      guard let self = self, let opts = self.currentOpts else { return }
      let minuteIdx = Int(Date().timeIntervalSince(start) / 60.0)
      if minuteIdx != self.lastUploadMinute {
        self.lastUploadMinute = minuteIdx
        self.enqueueMinuteUpload(opts: opts, minuteIndex: minuteIdx, steps: self.stepsSinceStart)
        self.sendEvent(withName: "MinuteTick", body: [:])
      }
    }
    t.resume()
    minuteTimer = t
  }

  private func enqueueMinuteUpload(opts: StartOptions, minuteIndex: Int, steps: Int) {
    guard let url = URL(string: opts.uploadUrl) else { return }
    var req = URLRequest(url: url)
    req.httpMethod = "PUT"
    if let h = opts.authHeader { req.addValue(h, forHTTPHeaderField: "Authorization") }
    req.addValue("application/json", forHTTPHeaderField: "Content-Type")

    let payload: [String: Any] = [
      "competitionId": opts.competitionId,
      "minuteIndex": minuteIndex,
      "stepsSinceStart": steps,
      "deviceTs": ISO8601DateFormatter().string(from: Date())
    ]
    // write small JSON file so background upload survives
    let tmp = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("m\(minuteIndex).json")
    if let data = try? JSONSerialization.data(withJSONObject: payload, options: []) {
      try? data.write(to: tmp, options: .atomic)
      bgSession.uploadTask(with: req, fromFile: tmp).resume()
    }
  }
}

// MARK: - URLSession delegates
extension StepSession: URLSessionDelegate, URLSessionTaskDelegate {
  // Add hooks if you want logging; not required for functionality
}
