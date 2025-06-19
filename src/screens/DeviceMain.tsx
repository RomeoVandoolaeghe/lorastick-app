import React, { useState } from 'react';
import { View, StyleSheet, Text, Switch, TouchableOpacity } from 'react-native';
import { MenuTab } from '../common/BottomMenu';

interface DeviceMainProps {
  selected: MenuTab;
  onTabChange: (tab: MenuTab) => void;
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

const DeviceMain: React.FC<DeviceMainProps> = () => {
  const [adr, setAdr] = useState(defaultDeviceInfo.adr);
  const [adrChanged, setAdrChanged] = useState(false);

  const handleAdrToggle = (value: boolean) => {
    setAdr(value);
    setAdrChanged(value !== defaultDeviceInfo.adr);
  };

  const handleSend = () => {
    // TODO: Implement sending updated configuration to LoRaStick device
    // Example: sendConfigToLoRaStick({ ... })
  };

  return (
    <View style={styles.container}>
      {/* Status Section */}
      <View style={styles.statusCard}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Network server</Text>
          <Text style={styles.value}>Joined</Text>
        </View>
      </View>
      <Text style={styles.header}>Setup</Text>
      <View style={styles.card}>
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
      </View>
      {adrChanged && (
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>Send to LoRaStick</Text>
        </TouchableOpacity>
      )}
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
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    marginBottom: 18,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#007AFF',
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
});

export default DeviceMain; 