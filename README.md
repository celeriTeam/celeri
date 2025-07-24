# Flex

Health Betting Application for iOS

## Getting started

### Installing Expo

- Download expo onto your mobile device:

    ![alt text](frontend/expo-download-qr.png)

- Install expo-router:

      npm install expo-router

### Starting the App

- Clone this github repo onto your local and go to the folder path.

- Install dependencies

      npm install

- Start the project with expo

      npx expo start

- Using your phone, scan the QR code that pops up to see your app.

### Pushing to Git

- Make sure you're on your `aidan-branch` branch

- Commit changes

      git add .
      git commit -m 'your commit message'
      git push

- Go to the [github repo](https://github.com/aidancng/flex) and create a pull request

### Pulling from main

- Commit changes

      git add .
      git commit -m 'your commit message'

- Pull latest from main

      git checkout main
      git pull

- Rebase onto your branch (`aidan-branch`)

      git checkout aidan-branch
      git rebase main
      git push