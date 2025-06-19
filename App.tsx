/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState } from 'react';
import { View, Button, FlatList, Text, StyleSheet, StatusBar, PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';

const manager = new BleManager();

async function requestAndroidPermissions() {
  try {
    console.log('Requesting Android permissions...');
    const permissions = [
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ];
    if (Number(Platform.Version) >= 31) { // Android 12+
      permissions.push(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
      );
    }
    console.log('Requesting permissions:', permissions);
    const granted = await PermissionsAndroid.requestMultiple(permissions);
    console.log('Permission results:', granted);
    const allGranted = permissions.every(p => granted[p] === PermissionsAndroid.RESULTS.GRANTED);
    console.log('All permissions granted:', allGranted);
    return allGranted;
  } catch (e) {
    console.log('Permission request error:', e);
    return false;
  }
}

function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [scanning, setScanning] = useState(false);
  const [showTestPage, setShowTestPage] = useState(false);

  const handlePermissionDenied = () => {
    Alert.alert(
      'Permissions Required',
      'Bluetooth and Location permissions are required to scan for BLE devices. Please enable them in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  };

  const scanForDevices = async () => {
    setDevices([]);
    setScanning(true);
    let hasPermission = true;
    if (Platform.OS === 'android') {
      hasPermission = await requestAndroidPermissions();
    }
    if (!hasPermission) {
      setScanning(false);
      handlePermissionDenied();
      return;
    }
    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        Alert.alert('Scan error', error.message);
        setScanning(false);
        return;
      }
      if (device && device.name) {
        setDevices(prev => {
          if (prev.find(d => d.id === device.id)) return prev;
          return [...prev, device];
        });
      }
    });
    setTimeout(() => {
      manager.stopDeviceScan();
      setScanning(false);
    }, 5000);
  };

  if (showTestPage) {
    const { HomePage } = require('./src/screens/Home');
    return <HomePage onBack={() => setShowTestPage(false)} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.title}>LoraStick</Text>
      <View style={styles.buttonContainer}>
        <Button title={scanning ? 'Scanning...' : 'Connect'} onPress={scanForDevices} disabled={scanning} />
        <View style={styles.buttonSpacer} />
        <Button title="Demo Mode" onPress={() => setShowTestPage(true)} />
      </View>
      <FlatList
        data={devices}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.deviceItem}>
            <Text>{item.name} ({item.id})</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No devices found</Text>}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 48,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
  },
  buttonContainer: {
    marginBottom: 16,
  },
  buttonSpacer: {
    height: 12,
  },
  list: {
    marginTop: 16,
  },
  deviceItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    color: '#888',
  },
});

export default App;
