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
  subBand: 'N/A', // or another default/placeholder value
};

const DeviceMain: React.FC<DeviceMainProps> = ({ selected, onTabChange, onDisconnect, device }) => {
  // Removed adr and adrChanged as 'adr' does not exist on defaultDeviceInfo
  const [bleStatus, setBleStatus] = useState<DeviceBLEStatus>('disconnected');
  const [isP2PMode, setIsP2PMode] = useState(false);
  const [p2pConfig, setP2PConfig] = useState<null | {
    freq: string;
    sf: string;
    bw: string;
    cr: string;
    preamble: string;
    txpower: string;
    crc: string;
    iq: string;
  }>(null);
  const [lorawanInfo, setLoraWANInfo] = useState<any>(defaultDeviceInfo);
  const [loadingLoraWAN, setLoadingLoraWAN] = useState(false);
  const [demoModeEnabled, setDemoModeEnabled] = useState(false);


  useEffect(() => {
    const loadBLEStatus = async () => {
      const status = await StorageService.getDeviceBLEStatus();
      setBleStatus(status);
    };
    loadBLEStatus();
  }, []);

  useEffect(() => {
    const checkDemoModeAndFetch = async () => {
      const isDemo = await StorageService.isDemoModeEnabled();
      setDemoModeEnabled(isDemo);
      if (isDemo) {
        setLoraWANInfo(defaultDeviceInfo);
        return;
      }
      setLoadingLoraWAN(true);
      // Only get from storage
      const stored = await StorageService.getLoRaWANSetup();
      if (stored && typeof stored === 'object' && 'raw' in stored) {
        setLoraWANInfo(parseGetStatus((stored as any).raw));
      } else {
        setLoraWANInfo(defaultDeviceInfo);
      }
      setLoadingLoraWAN(false);
    };
    checkDemoModeAndFetch();
  }, [device]);

  function parseGetStatus(raw: string) {
    // Example:
    // DevEUI: 70B3D57ED0001234\nAppEUI: 70B3D57ED0005678\nAppKey: 8D7F6E5D4C3B2A190817161514131211\nJoin Status: JOINED\n
    const info: any = {};
    const lines = raw.split('\n');
    lines.forEach(line => {
      if (line.startsWith('DevEUI:')) info.devEUI = line.replace('DevEUI:', '').trim();
      if (line.startsWith('AppEUI:')) info.appEUI = line.replace('AppEUI:', '').trim();
      if (line.startsWith('AppKey:')) info.appKey = line.replace('AppKey:', '').trim();
      if (line.startsWith('Join Status:')) info.joinStatus = line.replace('Join Status:', '').trim();
    });
    // Add region/band/subBand if needed, fallback to default
    info.region = defaultDeviceInfo.region;
    info.band = defaultDeviceInfo.band;
    info.subBand = defaultDeviceInfo.subBand;
    return { ...defaultDeviceInfo, ...info };
  }


  const handleDisconnect = async () => {
    await StorageService.setDeviceBLEStatus('disconnected');
    setBleStatus('disconnected');
    if (onDisconnect) onDisconnect();
  };

  const handleJoin = async () => {
    if (!device) {
      Alert.alert('Error', 'No device connected');
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
        Alert.alert('Error', 'BLE characteristics not found');
        return;
      }

      // Étape 1 : Envoyer "RUN SetLoRaWANMode"
      const modePromise = new Promise<string>((resolve, reject) => {
        const subscription = device.monitorCharacteristicForService(
          notifyChar.serviceUUID,
          notifyChar.uuid,
          (error, characteristic) => {
            if (error || !characteristic?.value) {
              reject('BLE read error');
              return;
            }

            const decoded = Buffer.from(characteristic.value, 'base64').toString('utf-8').trim();

            if (decoded.startsWith('MODE=')) {
              resolve(decoded);
              subscription.remove();
            }
          }
        );
      });

      await device.writeCharacteristicWithoutResponseForService(
        writeChar.serviceUUID,
        writeChar.uuid,
        Buffer.from('RUN SetLoRaWANMode\n', 'utf-8').toString('base64')
      );

      // Étape 2 : Attendre la réponse "MODE=1"
      const response = await modePromise;

      if (response === 'MODE=1') {
        // Envoi du JoinRequest
        Alert.alert('Info', 'Join request sent, waiting for response...');

        const joinSubscription = device.monitorCharacteristicForService(
          notifyChar.serviceUUID,
          notifyChar.uuid,
          (error, characteristic) => {
            if (error || !characteristic?.value) return;

            const decoded = Buffer.from(characteristic.value, 'base64').toString('utf-8');
            Alert.alert('Réponse du RAK4631', decoded.trim());
            joinSubscription.remove();
          }
        );

        await device.writeCharacteristicWithoutResponseForService(
          writeChar.serviceUUID,
          writeChar.uuid,
          Buffer.from('RUN JoinRequest\n', 'utf-8').toString('base64')
        );
      } else {
        Alert.alert('Erreur', 'Le device n\'est pas en mode LoRaWAN');
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Échec de l\'envoi');
    }
  };



  const handleGetP2P = async () => {
    if (!device) return;

    try {
      const services = await device.services();
      const allChars = await Promise.all(
        services.map(s => device.characteristicsForService(s.uuid))
      );
      const characteristics = allChars.flat();

      const writeChar = characteristics.find(c => c.isWritableWithoutResponse);
      const notifyChar = characteristics.find(c => c.isNotifiable);
      if (!writeChar || !notifyChar) return;

      // Subscription pour recevoir la réponse GetP2P
      const subscription = device.monitorCharacteristicForService(
        notifyChar.serviceUUID,
        notifyChar.uuid,
        (error, characteristic) => {
          if (error || !characteristic?.value) return;
          const decoded = Buffer.from(characteristic.value, 'base64').toString('utf-8').trim();

          if (decoded.startsWith("P2P:")) {
            const raw = decoded.replace("P2P:", "").trim();
            const [freq, sf, bw, cr, preamble, txpower, crc, iq] = raw.split(",");
            setP2PConfig({
              freq,
              sf,
              bw,
              cr,
              preamble,
              txpower,
              crc,
              iq,
            });
          }

          subscription.remove();
        }
      );

      // Envoi de la commande BLE
      await device.writeCharacteristicWithoutResponseForService(
        writeChar.serviceUUID,
        writeChar.uuid,
        Buffer.from('RUN GetP2P\n', 'utf-8').toString('base64')
      );
    } catch (e: any) {
      console.warn('GetP2P failed', e.message);
    }
  };


  useEffect(() => {
    handleGetP2P(); // récupère toujours au montage
  }, []);

  const getStatusColor = () => bleStatus === 'connected' ? '#4CAF50' : '#F44336';
  const getStatusText = () => bleStatus === 'connected' ? 'Connected' : 'Disconnected';
  const getStatusIcon = () => bleStatus === 'connected' ? 'bluetooth' : 'bluetooth-off';

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
        <Text style={styles.header}>LoRa</Text>
        <Text style={styles.subtitle}>Select mode</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity
            style={[styles.tabButton, !isP2PMode && styles.tabButtonActive]}
            onPress={() => setIsP2PMode(false)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, !isP2PMode && styles.tabButtonTextActive]}>LoRaWAN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, isP2PMode && styles.tabButtonActive]}
            onPress={() => setIsP2PMode(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, isP2PMode && styles.tabButtonTextActive]}>P2P</Text>
          </TouchableOpacity>
        </View>

        {isP2PMode ? (
          <>
            {p2pConfig && (
              <View>
                <InfoRow label="Freq (Hz)" value={p2pConfig.freq} />
                <InfoRow label="Spreading Factor" value={p2pConfig.sf} />
                <InfoRow label="Bandwidth" value={p2pConfig.bw} />
                <InfoRow label="Coding Rate" value={p2pConfig.cr} />
                <InfoRow label="Preamble Length" value={p2pConfig.preamble} />
                <InfoRow label="Tx Power (dBm)" value={p2pConfig.txpower} />
                <InfoRow label="Encryption Mode is enabled" value={p2pConfig.crc === 'true' ? 'Yes' : 'No'} />
                <InfoRow label="P2P FSK modem bitrate" value={p2pConfig.iq} />
              </View>
            )}
          </>
        ) : (
          // LoraWAN mode
          <>
            <View style={styles.statusSubCard}>
              <View style={styles.networkServerRow}>
                <Text style={styles.label}>Network server</Text>
                <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
                  <Text style={styles.joinButtonText}>Join</Text>
                </TouchableOpacity>
              </View>
            </View>
            {loadingLoraWAN ? (
              <Text>Loading LoRaWAN info...</Text>
            ) : (
              <>
                <InfoRow label="DevEUI" value={lorawanInfo.devEUI} />
                <InfoRow label="AppEUI" value={lorawanInfo.appEUI} />
                <InfoRow label="AppKey" value={lorawanInfo.appKey} />
                <InfoRow label="LoRaWAN Region & Band" value={`${lorawanInfo.region} / ${lorawanInfo.band}`} />
                <InfoRow label="SubBand" value={lorawanInfo.subBand || 'N/A'} />
                {lorawanInfo.joinStatus && <InfoRow label="Join Status" value={lorawanInfo.joinStatus} />}
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.formRow}>
    <Text style={styles.formLabel}>{label}</Text>
    <Text style={styles.formValue}>{value}</Text>
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
    backgroundColor: '#c2e1ffff',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  networkServerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
    color: '#007AFF',
  },
  subtitle: {
    fontSize: 15,
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 10,
    marginTop: 0,
    fontWeight: '500',
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
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f4fa',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#007AFF',
  },
  tabButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  formRow: {
    marginBottom: 18,
  },
  formLabel: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  formValue: {
    fontSize: 16,
    color: '#555',
    marginLeft: 0,
    textAlign: 'left',
    flexWrap: 'wrap',
  },
});

export default DeviceMain;
