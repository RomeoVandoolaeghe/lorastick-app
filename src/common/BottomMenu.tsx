import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export type MenuTab = 'tests' | 'device' | 'user';

interface BottomMenuProps {
  selected: MenuTab;
  onTabChange: (tab: MenuTab) => void;
}

export const BottomMenu: React.FC<BottomMenuProps> = ({ selected, onTabChange }) => {
  return (
    <View style={styles.menuBar}>
      <TouchableOpacity style={styles.menuItem} onPress={() => onTabChange('tests')}>
        <MaterialIcons name="network-check" size={28} color={selected === 'tests' ? '#007AFF' : '#888'} />
        <Text style={[styles.menuText, selected === 'tests' && styles.selectedText]}>Run</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={() => onTabChange('device')}>
        <MaterialIcons name="settings" size={28} color={selected === 'device' ? '#007AFF' : '#888'} />
        <Text style={[styles.menuText, selected === 'device' && styles.selectedText]}>Device</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={() => onTabChange('user')}>
        <MaterialIcons name="account-circle" size={28} color={selected === 'user' ? '#007AFF' : '#888'} />
        <Text style={[styles.menuText, selected === 'user' && styles.selectedText]}>User</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  menuBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  menuItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  selectedText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
}); 