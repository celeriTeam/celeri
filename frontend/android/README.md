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
npx expo start
```

OR

```
npx expo run:android
```

## Ready to upload a new version?

### Updating the version

This is important for Google Play to differentiate between different app bundles.

In `build.gradle`:

- Increment the `versionCode` (Previously on version code `4`)
- Update the `versionName` (Previously on version `2.0.2`)

### Uploading the expo build

Development android build:

    eas build --profile development --platform android

Android build:

    eas build --platform android

### Add to Google Play

**Internal App Sharing:**

- Drop your app bundle (`.aab`) [here](https://play.google.com/console/u/0/internal-app-sharing).

**Open testing:** (Currently inactive for production. Need to run a closed test on >=12 users for >=14 days)

- Go to [All app bundles](https://play.google.com/console/u/0/developers/5632879565246356586/app/4976476189007278725/bundle-explorer-selector)

- Press `Upload new version`, and drop your downloaded app bundle (`.aab`)