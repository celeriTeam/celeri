Pod::Spec.new do |s|
  s.name         = "ReactAppDependencyProvider"
  s.version      = "1.0.0"
  s.summary      = "Mock pod to satisfy expo-dev-menu dependencies"
  s.description  = "Mock pod to satisfy expo-dev-menu dependencies"
  s.homepage     = "https://github.com/expo/expo"
  s.license      = "MIT"
  s.author       = "Expo"
  s.platform     = :ios, "13.0"
  s.source       = { :git => "https://github.com/expo/expo.git" }
  s.source_files = "Sources/**/*.{h,m,swift}"
  s.swift_version = "5.0"
end