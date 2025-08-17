Pod::Spec.new do |s|
  s.name         = "React_RCTAppDelegate"
  s.version      = "1.0.0"
  s.summary      = "Mock pod for React_RCTAppDelegate"
  s.description  = "Mock pod to satisfy expo-dev-menu dependencies"
  s.homepage     = "https://github.com/facebook/react-native"
  s.license      = "MIT"
  s.author       = "Facebook"
  s.platform     = :ios, "13.0"
  s.source       = { :git => "https://github.com/facebook/react-native.git" }
  s.source_files = "Sources/**/*.{h,m,swift}"
  s.swift_version = "5.0"
  
  # Add these dependencies
  s.framework = "Foundation"
  s.dependency "React-Core"
end