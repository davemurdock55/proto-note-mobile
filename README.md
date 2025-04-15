# Proto-Note Mobile

Proto-Note is a simple notes app that allows syncing across different devices (taking an offline-first approach).

The syncing uses AWS lambdas to perform its work and stores the necessary data (e.g. auth info, notes info, etc.) in DynamoDB.

## Project Setup

Below are the steps to set up and test the project:

### Clone Repository

First, you will need to clone the repository using:

```bash
$ git clone https://github.com/davemurdock55/proto-note-mobile.git
```

### Install Dependencies

Next, install the dependencies needed to run the project:

```bash
$ yarn install
```

### Download the "Expo Go" App

Go to the App Store and download the "Expo Go" app. This app was optimized for iOS (but may still run fine on Android -- I just don't have an android to test with). This is the app that is used to test the Proto-Note React Native / Expo application.

### Development

Lastly, you can run the development version of the app by running the following command at the top level of the cloned repository on your computer:

```bash
$ yarn expo start
```

This will show up with a **QR code** and a bunch of options to run the application with. **I would recommend scanning the QR code with the phone you intend to test with** (the one with "Expo Go" installed on it). This will build the app and run it on the phone.

There will also be various options to run the app, such as:

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

There should also be a way to test the app using web, but I get errors when I attempt to run it this way. The best experience, and the one that this app is created for, is as an iPhone mobile app.
