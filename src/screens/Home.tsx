import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DeviceMain from './DeviceMain';
import TestMain from './TestMain';
import UserMain from './UserMain';
import { BottomMenu, MenuTab } from '../common/BottomMenu';
import { Device } from 'react-native-ble-plx';
import { StorageService } from '../services/storage';
import FilesMain from './FilesMain';
import { useDemoMode } from '../common/DemoModeContext';

export function HomePage({ device, onBack }: { device: Device | null, onBack: () => void }) {
  const [selectedTab, setSelectedTab] = useState<MenuTab>('tests');
  const [deviceConnected, setDeviceConnected] = useState(false);
  const { demoMode } = useDemoMode();

  // Load device connection status on component mount
  useEffect(() => {
    const loadConnectionStatus = async () => {
      const isConnected = await StorageService.isDeviceConnected();
      setDeviceConnected(isConnected);
    };
    loadConnectionStatus();
  }, []);

  // Update connection status when demoMode changes
  useEffect(() => {
    if (demoMode) {
      setDeviceConnected(true);
    } else {
      // Only update to false if we don't have a real device connected
      const checkRealDeviceConnection = async () => {
        const isConnected = await StorageService.isDeviceConnected();
        setDeviceConnected(isConnected);
      };
      checkRealDeviceConnection();
    }
  }, [demoMode]);

  let Content;
  if (selectedTab === 'device') {
    Content = <DeviceMain selected={selectedTab} onTabChange={setSelectedTab} onDisconnect={onBack} device={device} />;
  } else if (selectedTab === 'tests') {
    Content = <TestMain selected={selectedTab} onTabChange={setSelectedTab} device={device} />;
  } else if (selectedTab === 'files') {
    Content = <FilesMain device={device} />;
  } else {
    Content = <UserMain selected={selectedTab} onTabChange={setSelectedTab} />;
  }

  return (
    <View style={styles.container}>
      {demoMode && (
        <View style={styles.demoHeader}>
          <Text style={styles.demoText}>Demo Mode</Text>
        </View>
      )}
      <View style={styles.content}>
        {Content}
      </View>
      <BottomMenu
        selected={selectedTab}
        onTabChange={setSelectedTab}
        deviceConnected={deviceConnected}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  demoHeader: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    alignItems: 'center',
  },
  demoText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
