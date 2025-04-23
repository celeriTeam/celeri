# Android Development Setup

### Install

Install Android Studio

Create an emulator.

Install ndk.

Create a `local.properties` file. It will look something like this:
```
sdk.dir=C:\\Users\\{name}\\AppData\\Local\\Android\\Sdk
ndk.dir=C:\\Users\\{name}\\AppData\\Local\\Android\\Sdk\\ndk\\26.1.10909125
org.gradle.java.home=C:\\Program Files\\Java\\jdk-17
```

### Clean:

```
cd frontend/android
./gradlew clean
```

### Setup Emulator:

Open the emulator. You can use the vscode extension [Android iOS Emulator](https://marketplace.visualstudio.com/items?itemName=DiemasMichiels.emulate).

Run `adb` to forward ports:
```
cd ..
adb reverse tcp:8081 tcp:8081
adb reverse tcp:19000 tcp:19000
```

### Running the application:

Run the app:
```
npx expo run:android
```
