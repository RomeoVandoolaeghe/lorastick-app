import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DeviceMain from './DeviceMain';
import TestMain from './TestMain';
import UserMain from './UserMain';
import { BottomMenu, MenuTab } from '../common/BottomMenu';

export function HomePage({ onBack }: { onBack: () => void }) {
  const [selectedTab, setSelectedTab] = useState<MenuTab>('tests');

  let Content;
  if (selectedTab === 'device') {
    Content = <DeviceMain selected={selectedTab} onTabChange={setSelectedTab} onDisconnect={onBack} />;
  } else if (selectedTab === 'tests') {
    Content = <TestMain selected={selectedTab} onTabChange={setSelectedTab} />;
  } else {
    Content = <UserMain selected={selectedTab} onTabChange={setSelectedTab} />;
  }

  return (
    <View style={styles.container}>
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
}); 