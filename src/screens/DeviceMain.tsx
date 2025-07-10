import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Switch, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { MenuTab } from '../common/BottomMenu';
import { StorageService, DeviceBLEStatus } from '../services/storage';
import { Buffer } from 'buffer'; // en haut du fichier si ce n’est pas déjà fait
import { Device } from 'react-native-ble-plx'; // au cas où

interface DeviceMainProps {
  selected: MenuTab;
  onTabChange: (tab: MenuTab) => void;
  onDisconnect?: () => void;
  device: Device | null; // 👈 ajoute ça
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

const DeviceMain: React.FC<DeviceMainProps> = ({ selected, onTabChange, onDisconnect, device }) => {
  const [adr, setAdr] = useState(defaultDeviceInfo.adr);
  const [adrChanged, setAdrChanged] = useState(false);
  const [bleStatus, setBleStatus] = useState<DeviceBLEStatus>('disconnected');

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
    // TODO: Envoyer la configuration à l'appareil
    Alert.alert('Configuration', 'Configuration envoyée au LoRaStick (TODO)');
  };

  const handleDisconnect = async () => {
    await StorageService.setDeviceBLEStatus('disconnected');
    setBleStatus('disconnected');
    if (onDisconnect) onDisconnect();
  };

  const handleJoin = async () => {
    if (!device) {
      Alert.alert('Erreur', 'Aucun appareil connecté');
      return;
    }

    try {
      const services = await device.services();
      const allChars = await Promise.all(
        services.map(s => device.characteristicsForService(s.uuid))
      );
      const characteristics = allChars.flat();

      const writeChar = characteristics.find(c => c.isWritableWithoutResponse);
      const notifyChar = characteristics.find(c => c.isNotifiable);

      if (!writeChar || !notifyChar) {
        Alert.alert('Erreur', 'Caractéristiques BLE non trouvées');
        return;
      }

      Alert.alert('Info', 'Join request sent, waiting for response...');

      // Écoute une seule réponse
      const subscription = device.monitorCharacteristicForService(
        notifyChar.serviceUUID,
        notifyChar.uuid,
        (error, characteristic) => {
          if (error || !characteristic?.value) return;

          const decoded = Buffer.from(characteristic.value, 'base64').toString('utf-8');
          Alert.alert('Réponse du RAK4631', decoded.trim());
          subscription.remove();
        }
      );

      await device.writeCharacteristicWithoutResponseForService(
        writeChar.serviceUUID,
        writeChar.uuid,
        Buffer.from('RUN JoinRequest\n', 'utf-8').toString('base64')
      );
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Échec de l\'envoi');
    }
  };

  const getStatusColor = () => bleStatus === 'connected' ? '#4CAF50' : '#F44336';
  const getStatusText = () => bleStatus === 'connected' ? 'Connected' : 'Disconnected';

  return (
    <ScrollView contentContainerStyle={styles.container}>
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

        {/* Network Server Join Button */}
        <View style={styles.statusSubCard}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Network server</Text>
            <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
              <Text style={styles.joinButtonText}>Join</Text>
            </TouchableOpacity>
          </View>
        </View>

        <InfoRow label="DevEUI" value={defaultDeviceInfo.devEUI} />
        <InfoRow label="AppEUI" value={defaultDeviceInfo.appEUI} />
        <InfoRow label="AppKey" value={defaultDeviceInfo.appKey} />
        <InfoRow label="LoRaWAN Region & Band" value={`${defaultDeviceInfo.region} / ${defaultDeviceInfo.band}`} />
      </View>
    </ScrollView>
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
    padding: 24,
    backgroundColor: '#f7fafd',
    paddingBottom: 100, // pour laisser de l’espace au menu en bas
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
  joinButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default DeviceMain;
