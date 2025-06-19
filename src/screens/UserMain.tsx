import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MenuTab } from '../common/BottomMenu';

interface UserMainProps {
  selected: MenuTab;
  onTabChange: (tab: MenuTab) => void;
}

const UserMain: React.FC<UserMainProps> = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Info</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.infoText}>Please log in to view your information.</Text>
        <TouchableOpacity style={styles.loginButton}>
          <Text style={styles.loginButtonText}>Log in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 56,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
    color: '#222',
  },
  loginButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbb',
    paddingVertical: 12,
    paddingHorizontal: 32,
    elevation: 2,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
});

export default UserMain; 