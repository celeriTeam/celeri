import Foundation

// Remove the React import and use NSObject for bridges
@objc
public class RCTReactNativeFactory: NSObject {
  @objc public var rootViewFactory: RootViewFactory!
  
  @objc public init(delegate: Any) {
    super.init()
    self.rootViewFactory = RootViewFactory()
  }
}

@objc
public class RootViewFactory: NSObject {
  @objc public var bridge: NSObject?
}

@objc
public class DevMenuReactNativeFactoryDelegate: NSObject {
  @objc public var dependencyProvider: Any?
  
  @objc public func sourceURL(for bridge: NSObject) -> URL {
    return URL(string: "about:blank")!
  }
  
  @objc public func bundleURL() -> URL? {
    return URL(string: "about:blank")
  }
  
  @objc public func bridge(_ bridge: NSObject, didNotFindModule moduleName: String) -> Bool {
    return false
  }
}