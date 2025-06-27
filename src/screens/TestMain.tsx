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
const periods = ['1h', '4h', '24h'] as const;
type Period = typeof periods[number];
const frequencies = [
  { key: '10s', label: '10s', value: 10 },
  { key: '30s', label: '30s', value: 30 },
  { key: '1min', label: '1min', value: 60 },
] as const;
type Frequency = typeof frequencies[number]['key'];

const periodSeconds: Record<Period, number> = { '1h': 3600, '4h': 14400, '24h': 86400 };
const frequencySeconds: Record<Frequency, number> = { '10s': 10, '30s': 30, '1min': 60 };

const TestMain: React.FC<TestMainProps> = ({ selected, onTabChange, device }) => {
  const [selectedMethod, setSelectedMethod] = useState<TestMethod | null>(null);
  const [isPeriodic, setIsPeriodic] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('1h');
  const [selectedFrequency, setSelectedFrequency] = useState<Frequency>('10s');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<string[]>([]);

  const runUnitTest = async () => {
    if (!device) {
      Alert.alert('Erreur', 'Aucun appareil connecté');
      return;
    }

    try {
      const TOTAL_LINKCHECKS = 100;
      let count = 0;
      let startTime = 0;

      const services = await device.services();
      const allChars = await Promise.all(
        services.map(s => device.characteristicsForService(s.uuid))
      );
      const characteristics = allChars.flat();

      const writeChar = characteristics.find(c => c.isWritableWithoutResponse);
      const notifyChar = characteristics.find(c => c.isNotifiable);

      if (!writeChar || !notifyChar) {
        Alert.alert('Erreur', 'Caractéristiques non trouvées');
        return;
      }

      setProgress(0);
      setResults([]);

      const subscription = device.monitorCharacteristicForService(
        notifyChar.serviceUUID,
        notifyChar.uuid,
        (error, characteristic) => {
          if (error || !characteristic?.value) return;

          const decoded = Buffer.from(characteristic.value, 'base64').toString('utf-8');
          if (decoded.startsWith('+LINKCHECK:')) {
            count++;

            if (count === 1) startTime = Date.now();

            setProgress(Math.round((count / TOTAL_LINKCHECKS) * 100));
            setResults(prev => [...prev, decoded.trim()]);

            if (count >= TOTAL_LINKCHECKS) {
              const elapsed = Date.now() - startTime;
              subscription.remove();
              Alert.alert(
                'Terminé',
                `${TOTAL_LINKCHECKS} linkchecks reçus ✅\n${Math.floor(elapsed / 1000)}s ${elapsed % 1000}ms`
              );
            }
          }
        }
      );

      await device.writeCharacteristicWithoutResponseForService(
        writeChar.serviceUUID,
        writeChar.uuid,
        Buffer.from('ATC+TestLinkCheck\n', 'utf-8').toString('base64')
      );

      Alert.alert('Lancement', `Génération de ${TOTAL_LINKCHECKS} linkchecks...`);
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Échec');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Select method</Text>
      <View style={styles.cardRow}>
        {testMethods.map((method) => (
          <TouchableOpacity
            key={method.key}
            style={[styles.methodCard, selectedMethod === method.key && styles.methodCardSelected]}
            onPress={() => setSelectedMethod(method.key)}
            activeOpacity={0.85}
          >
            <MaterialIcons
              name={method.icon}
              size={32}
              color={selectedMethod === method.key ? '#fff' : '#007AFF'}
              style={styles.methodIcon}
            />
            <Text style={[styles.methodCardText, selectedMethod === method.key && styles.methodCardTextSelected]}>
              {method.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedMethod && (
        <>
          <View style={styles.selectionCard}>
            <View style={styles.bigSwitchRow}>
              <TouchableOpacity
                style={[styles.bigSwitchButton, !isPeriodic && styles.bigSwitchButtonActive]}
                onPress={() => setIsPeriodic(false)}
              >
                <Text style={[styles.bigSwitchText, !isPeriodic && styles.bigSwitchTextActive]}>Unit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bigSwitchButton, isPeriodic && styles.bigSwitchButtonActive]}
                onPress={() => setIsPeriodic(true)}
              >
                <Text style={[styles.bigSwitchText, isPeriodic && styles.bigSwitchTextActive]}>Periodic</Text>
              </TouchableOpacity>
            </View>

            {isPeriodic ? (
              <>
                <View style={styles.frequencyRow}>
                  {frequencies.map(freq => (
                    <TouchableOpacity
                      key={freq.key}
                      style={[styles.frequencyButton, selectedFrequency === freq.key && styles.frequencyButtonSelected]}
                      onPress={() => setSelectedFrequency(freq.key)}
                    >
                      <Text style={[styles.frequencyButtonText, selectedFrequency === freq.key && styles.frequencyButtonTextSelected]}>
                        {freq.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.periodRow}>
                  {periods.map(period => (
                    <TouchableOpacity
                      key={period}
                      style={[styles.periodButton, selectedPeriod === period && styles.periodButtonSelected]}
                      onPress={() => setSelectedPeriod(period)}
                    >
                      <Text style={[styles.periodButtonText, selectedPeriod === period && styles.periodButtonTextSelected]}>
                        {period}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.testCountText}>
                  Total tests: {Math.floor(periodSeconds[selectedPeriod] / frequencySeconds[selectedFrequency])}
                </Text>
              </>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.runButton}
            onPress={() => {
              if (!isPeriodic) runUnitTest();
              else Alert.alert('Info', 'Periodic mode n’est pas encore implémenté.');
            }}
          >
            <Text style={styles.runButtonText}>Run</Text>
          </TouchableOpacity>

          {!isPeriodic && (
            <>
              <Text style={{ textAlign: 'center', marginVertical: 16, fontSize: 16 }}>
                Progression : {progress}%
              </Text>
              <FlatList
                data={results}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => <Text style={{ paddingVertical: 4 }}>{item}</Text>}
              />
            </>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    padding: 16,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 18,
    textAlign: 'center',
    color: '#222',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  methodCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginHorizontal: 6,
    alignItems: 'center',
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  methodCardSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    elevation: 4,
  },
  methodIcon: {
    marginBottom: 8,
  },
  methodCardText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  methodCardTextSelected: {
    color: '#fff',
  },
  selectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginVertical: 18,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  bigSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 18,
  },
  bigSwitchButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  bigSwitchButtonActive: {
    backgroundColor: '#007AFF',
  },
  bigSwitchText: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
  },
  bigSwitchTextActive: {
    color: '#fff',
  },
  frequencyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  frequencyButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  frequencyButtonSelected: {
    backgroundColor: '#007AFF',
  },
  frequencyButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  frequencyButtonTextSelected: {
    color: '#fff',
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  periodButtonSelected: {
    backgroundColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  periodButtonTextSelected: {
    color: '#fff',
  },
  testCountText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 8,
    color: '#222',
    fontWeight: '500',
  },
  runButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    marginHorizontal: 24,
    marginTop: 12,
    alignItems: 'center',
    elevation: 2,
  },
  runButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default TestMain;
