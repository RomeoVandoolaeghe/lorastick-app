import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Switch, TouchableOpacity } from 'react-native';
import { MenuTab } from '../common/BottomMenu';
import { StorageService, DeviceBLEStatus } from '../services/storage';

interface DeviceMainProps {
  selected: MenuTab;
  onTabChange: (tab: MenuTab) => void;
  onDisconnect?: () => void;
}

const defaultDeviceInfo = {
  devEUI: '70B3D57ED0001234',
  appEUI: '70B3D57ED0005678',
  appKey: '8D7F6E5D4C3B2A190817161514131211',
  region: 'EU868',
  band: '868 MHz',
  version: '1.0.3',
  adr: true,
  dr: 'DR5',
  txPower: '14 dBm',
};

const DeviceMain: React.FC<DeviceMainProps> = ({ selected, onTabChange, onDisconnect }) => {
  const [adr, setAdr] = useState(defaultDeviceInfo.adr);
  const [adrChanged, setAdrChanged] = useState(false);
  const [bleStatus, setBleStatus] = useState<DeviceBLEStatus>('disconnected');

  // Load BLE status on component mount
  useEffect(() => {
    const loadBLEStatus = async () => {
      const status = await StorageService.getDeviceBLEStatus();
      setBleStatus(status);
    };
    loadBLEStatus();
  }, []);

  const handleAdrToggle = (value: boolean) => {
    setAdr(value);
    setAdrChanged(value !== defaultDeviceInfo.adr);
  };

  const handleSend = () => {
    // TODO: Implement sending updated configuration to LoRaStick device
    // Example: sendConfigToLoRaStick({ ... })
  };

  const handleDisconnect = async () => {
    // Update stored BLE status to disconnected
    await StorageService.setDeviceBLEStatus('disconnected');
    setBleStatus('disconnected');
    
    if (onDisconnect) {
      onDisconnect();
    }
  };

  const getStatusColor = () => {
    return bleStatus === 'connected' ? '#4CAF50' : '#F44336';
  };

  const getStatusText = () => {
    return bleStatus === 'connected' ? 'Connected' : 'Disconnected';
  };

  return (
    <View style={styles.container}>
      {/* Bluetooth Section */}
      <View style={styles.card}>
        <Text style={styles.header}>Bluetooth</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Connection status</Text>
          <Text style={[styles.value, { color: getStatusColor() }]}>{getStatusText()}</Text>
        </View>
        <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
          <Text style={styles.disconnectButtonText}>Disconnect</Text>
        </TouchableOpacity>
      </View>
      {/* LoRaWAN Section */}
      <View style={styles.card}>
        <Text style={styles.header}>LoRaWAN</Text>
        {/* Network Server Info (separate part at the top) */}
        <View style={styles.statusSubCard}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Network server</Text>
            <Text style={styles.value}>Joined</Text>
          </View>
        </View>
        <InfoRow label="DevEUI" value={defaultDeviceInfo.devEUI} />
        <InfoRow label="AppEUI" value={defaultDeviceInfo.appEUI} />
        <InfoRow label="AppKey" value={defaultDeviceInfo.appKey} />
        <InfoRow label="LoRaWAN Region & Band" value={`${defaultDeviceInfo.region} / ${defaultDeviceInfo.band}`} />
        <InfoRow label="LoRaWAN Version" value={defaultDeviceInfo.version} />
        <View style={styles.infoRow}>
          <Text style={styles.label}>ADR</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{adr ? 'Enabled' : 'Disabled'}</Text>
            <Switch
              value={adr}
              onValueChange={handleAdrToggle}
              thumbColor={adr ? '#007AFF' : '#ccc'}
              trackColor={{ true: '#b3e5fc', false: '#eee' }}
            />
          </View>
        </View>
        <InfoRow label="DR (Data Rate)" value={defaultDeviceInfo.dr} />
        <InfoRow label="TX Power" value={defaultDeviceInfo.txPower} />
        {adrChanged && (
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Text style={styles.sendButtonText}>Send to LoRaStick</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafd',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 24,
  },
  statusSubCard: {
    backgroundColor: '#f3f8fd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#007AFF',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  label: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  value: {
    fontSize: 16,
    color: '#555',
    marginLeft: 12,
    flex: 1.2,
    textAlign: 'right',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    marginRight: 8,
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  disconnectButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FF3B30',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    shadowColor: '#FF3B30',
    shadowOpacity: 0.10,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  disconnectButtonText: {
    color: '#FF3B30',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});

export default DeviceMain; 