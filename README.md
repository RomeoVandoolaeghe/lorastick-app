This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

> **Important**: Before running your app, decide whether you need **BLE (Bluetooth Low Energy)** functionality or just want to test the basic app features.
> 
> - **For BLE development**: Use a **physical device** (recommended) as BLE features may not work reliably in emulators/simulators.
> - **For general testing without BLE**: You can use an **emulator/simulator**. For Android, open Android Studio and click **"More Actions"** → **"Virtual Device Manager"** to create and start an Android Virtual Device (AVD).

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.

# Using a Physical Device for BLE Development

This app uses **Bluetooth Low Energy (BLE)**, which may not be fully supported or testable in emulators/simulators. For best results, use a real mobile device connected via USB to your Mac or PC.

## Why Use a Physical Device?
- BLE features are often not available or reliable in emulators/simulators.
- Real devices provide accurate BLE scanning, connection, and data transfer capabilities.

## Android

1. **Enable Developer Options & USB Debugging**
   - Go to **Settings > About phone** and tap **Build number** 7 times to enable Developer Options.
   - In **Settings > Developer options**, enable **USB debugging**.
2. **Connect your device via USB**
   - Use a USB cable to connect your Android device to your computer.
   - Allow USB debugging when prompted on your device.
3. **Grant Location & Bluetooth Permissions**
   - BLE scanning requires location and Bluetooth permissions. The app should request these, but ensure they are granted in device settings.
4. **Run the app**
   - With Metro running, use:
     ```sh
     npm run android
     # or
     yarn android
     ```
   - The app will be installed and launched on your connected device.

## iOS

1. **Enable Developer Mode**
   - On iOS 16+, go to **Settings > Privacy & Security > Developer Mode** and enable it.
2. **Connect your device via USB**
   - Use a Lightning cable to connect your iPhone/iPad to your Mac.
   - Trust the computer if prompted.
3. **Grant Bluetooth Permissions**
   - BLE requires Bluetooth permissions. The app should request these, but you can check in **Settings > [Your App]**.
4. **Run the app**
   - With Metro running, use:
     ```sh
     npm run ios
     # or
     yarn ios
     ```
   - In Xcode, select your device and press the Run button if you prefer.

## Additional Tips
- Make sure your device is unlocked during deployment.
- BLE may require location services to be enabled (especially on Android).
- For advanced BLE debugging, consider using tools like [nRF Connect](https://www.nordicsemi.com/Products/Development-tools/nRF-Connect-for-mobile) on your device.

For more details, see the [React Native BLE documentation](https://github.com/innoveit/react-native-ble-manager) or your BLE library's docs.
