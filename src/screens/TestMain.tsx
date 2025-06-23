import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { MenuTab } from '../common/BottomMenu';
import { Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

interface TestMainProps {
  selected: MenuTab;
  onTabChange: (tab: MenuTab) => void;
  device: Device | null;
  demoMode?: boolean;
}

const testMethods = [
  { key: 'LinkCheck', icon: 'network-check', label: 'LinkCheck' },
  { key: 'P2P', icon: 'sync-alt', label: 'P2P' },
  { key: 'Device Mode', icon: 'settings-input-antenna', label: 'Device Mode' },
] as const;
type TestMethod = typeof testMethods[number]['key'];

const TOTAL_DURATION_HOURS = 24;
const INTERVAL_SECONDS = 10;
const TOTAL_TESTS = (TOTAL_DURATION_HOURS * 3600) / INTERVAL_SECONDS;

const TestMain: React.FC<TestMainProps> = ({ selected, onTabChange, device }) => {
  const [selectedMethod, setSelectedMethod] = useState<TestMethod | null>(null);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    if (!device) return;

    const subscribe = async () => {
      const services = await device.services();
      const allChars = await Promise.all(
        services.map(s => device.characteristicsForService(s.uuid))
      );
      const characteristics = allChars.flat();
      const notifyChar = characteristics.find(c => c.isNotifiable);
      if (!notifyChar) return;

      let testCount = 0;

      device.monitorCharacteristicForService(
        notifyChar.serviceUUID,
        notifyChar.uuid,
        (error, characteristic) => {
          if (error) {
            console.log('Erreur BLE', error.message);
            return;
          }

          if (characteristic?.value) {
            const decoded = Buffer.from(characteristic.value, 'base64').toString('utf-8');
            if (decoded.startsWith('+LINKCHECK:')) {
              testCount++;
              setProgress(Math.round((testCount / TOTAL_TESTS) * 100));
              setResults(prev => [...prev, decoded.trim()]);
            }
          }
        }
      );
    };

    subscribe();
  }, [device]);

  const runUnitTest = async () => {
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
      if (!writeChar) {
        Alert.alert("Erreur", "Impossible d'envoyer la commande");
        return;
      }

      const command = 'ATC+LinkCheck\n';
      await device.writeCharacteristicWithoutResponseForService(
        writeChar.serviceUUID,
        writeChar.uuid,
        Buffer.from(command, 'utf-8').toString('base64')
      );
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Echec de l'envoi");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Select method</Text>
      <View style={styles.cardRow}>
        {testMethods.map((method) => (
          <TouchableOpacity
            key={method.key}
            style={[
              styles.methodCard,
              selectedMethod === method.key ? styles.methodCardSelected : null,
            ]}
            onPress={() => setSelectedMethod(method.key)}
            activeOpacity={0.85}
          >
            <MaterialIcons
              name={method.icon}
              size={32}
              color={selectedMethod === method.key ? '#fff' : '#007AFF'}
              style={styles.methodIcon}
            />
            <Text
              style={[
                styles.methodCardText,
                selectedMethod === method.key ? styles.methodCardTextSelected : null,
              ]}
            >
              {method.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {selectedMethod && (
        <>
          <TouchableOpacity style={styles.runButton} onPress={runUnitTest} activeOpacity={0.85}>
            <Text style={styles.runButtonText}>Run</Text>
          </TouchableOpacity>
          <Text style={{ textAlign: 'center', marginVertical: 16, fontSize: 16 }}>
            Progression : {progress}%
          </Text>
          <FlatList
            data={results}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <Text style={{ paddingVertical: 4 }}>{item}</Text>
            )}
            style={{ marginTop: 12 }}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafd',
    padding: 24,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#007AFF',
    letterSpacing: 0.5,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 28,
    flexWrap: 'wrap',
  },
  methodCard: {
    flex: 0,
    width: 150,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 22,
    marginHorizontal: 6,
    marginBottom: 12,
    shadowColor: '#007AFF',
    shadowOpacity: 0.10,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodCardSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    shadowOpacity: 0.18,
  },
  methodIcon: {
    marginBottom: 8,
  },
  methodCardText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  methodCardTextSelected: {
    color: '#fff',
  },
  runButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 60,
    alignItems: 'center',
    marginTop: 24,
    alignSelf: 'center',
    shadowColor: '#007AFF',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  runButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 0.5,
  },
});

export default TestMain;
