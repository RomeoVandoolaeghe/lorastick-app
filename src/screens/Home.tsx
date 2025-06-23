import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DeviceMain from './DeviceMain';
import TestMain from './TestMain';
import UserMain from './UserMain';
import { BottomMenu, MenuTab } from '../common/BottomMenu';
import { Device } from 'react-native-ble-plx';

export function HomePage({ device, demoMode = false, onBack }: { device: Device | null, demoMode?: boolean, onBack: () => void }) {
  const [selectedTab, setSelectedTab] = useState<MenuTab>('tests');

  let Content;
  if (selectedTab === 'device') {
    Content = <DeviceMain selected={selectedTab} onTabChange={setSelectedTab} onDisconnect={onBack} />;
  } else if (selectedTab === 'tests') {
    Content = <TestMain selected={selectedTab} onTabChange={setSelectedTab} device={device} demoMode={demoMode} />;
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
      <BottomMenu selected={selectedTab} onTabChange={setSelectedTab} />
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
