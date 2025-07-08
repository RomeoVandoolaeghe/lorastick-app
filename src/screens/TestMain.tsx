import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
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

const periods = ['1h', '4h', '24h'] as const;
const frequencies = [
  { key: '10s', label: '10s', value: 10 },
  { key: '30s', label: '30s', value: 30 },
  { key: '1min', label: '1min', value: 60 },
] as const;

const periodSeconds = { '1h': 3600, '4h': 14400, '24h': 86400 };
const frequencySeconds = { '10s': 10, '30s': 30, '1min': 60 };

type TestMethod = typeof testMethods[number]['key'];
type Period = typeof periods[number];
type Frequency = typeof frequencies[number]['key'];
type TestMode = 'unit' | 'periodic' | 'realtime';

const TestMain: React.FC<TestMainProps> = ({ selected, onTabChange, device }) => {
  const [selectedMethod, setSelectedMethod] = useState<TestMethod | null>(null);
  const [testMode, setTestMode] = useState<TestMode>('unit');
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('1h');
  const [selectedFrequency, setSelectedFrequency] = useState<Frequency>('10s');
  const [linkcheckResults, setLinkcheckResults] = useState<{ label: string; value: string }[]>([]);
  const [isRealtimeRunning, setIsRealtimeRunning] = useState(false);

  const realtimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const unitSubscriptionRef = useRef<ReturnType<Device['monitorCharacteristicForService']> | null>(null);

  const runUnitTest = async () => {
    if (!device) {
      Alert.alert('Erreur', 'Aucun appareil connecté');
      return;
    }

    if (unitSubscriptionRef.current) {
      unitSubscriptionRef.current.remove();
      unitSubscriptionRef.current = null;
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
        Alert.alert('Erreur', 'Caractéristiques non trouvées');
        return;
      }

      unitSubscriptionRef.current = device.monitorCharacteristicForService(
        notifyChar.serviceUUID,
        notifyChar.uuid,
        (error, characteristic) => {
          if (error || !characteristic?.value) return;

          const decoded = Buffer.from(characteristic.value, 'base64').toString('utf-8');
          if (decoded.startsWith('+LINKCHECK:')) {
            const clean = decoded.trim();
            unitSubscriptionRef.current?.remove();
            unitSubscriptionRef.current = null;
            setLinkcheckResults(prev => [
              ...prev,
              { label: `valeur${prev.length + 1}`, value: clean },
            ]);
          }
        }
      );

      await device.writeCharacteristicWithoutResponseForService(
        writeChar.serviceUUID,
        writeChar.uuid,
        Buffer.from('RUN Genlinkcheck\n', 'utf-8').toString('base64')
      );
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Échec');
    }
  };

  const startRealtimeMode = async () => {
    if (!device) {
      Alert.alert('Erreur', 'Aucun appareil connecté');
      return;
    }

    if (realtimeIntervalRef.current) {
      clearInterval(realtimeIntervalRef.current);
    }

    const intervalMs = frequencySeconds[selectedFrequency] * 1000;

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

    device.monitorCharacteristicForService(
      notifyChar.serviceUUID,
      notifyChar.uuid,
      (error, characteristic) => {
        if (error || !characteristic?.value) return;

        const decoded = Buffer.from(characteristic.value, 'base64').toString('utf-8');
        if (decoded.startsWith('+LINKCHECK:')) {
          const clean = decoded.trim();
          setLinkcheckResults(prev => [
            ...prev,
            { label: `valeur${prev.length + 1}`, value: clean },
          ]);
        }
      }
    );

    const sendLinkCheck = async () => {
      try {
        await device.writeCharacteristicWithoutResponseForService(
          writeChar.serviceUUID,
          writeChar.uuid,
          Buffer.from('RUN Genlinkcheck\n', 'utf-8').toString('base64')
        );
        console.log('Commande RUN Genlinkcheck envoyée');
      } catch (e) {
        console.error('Erreur envoi Genlinkcheck:', e);
      }
    };

    await sendLinkCheck();
    realtimeIntervalRef.current = setInterval(sendLinkCheck, intervalMs);
    setIsRealtimeRunning(true);
  };

  const stopRealtimeMode = () => {
    if (realtimeIntervalRef.current) {
      clearInterval(realtimeIntervalRef.current);
      realtimeIntervalRef.current = null;
    }
    setIsRealtimeRunning(false);
  };

  const handleSave = () => {
    if (linkcheckResults.length === 0) {
      Alert.alert('Sauvegarde', 'Aucune donnée à sauvegarder.');
      return;
    }

    Alert.alert(
      'Sauvegarde',
      `${linkcheckResults.length} résultats enregistrés en mémoire.`
    );
  };

  const handleRun = () => {
    if (!selectedMethod) return;

    if (testMode === 'periodic') {
      const total = Math.floor(
        periodSeconds[selectedPeriod] / frequencySeconds[selectedFrequency]
      );
      Alert.alert('Info', `Mode périodique : ${total} tests seront exécutés.`);
    } else if (testMode === 'unit') {
      runUnitTest();
    } else if (testMode === 'realtime') {
      if (isRealtimeRunning) {
        stopRealtimeMode();
      } else {
        startRealtimeMode();
      }
    }
  };

  const resetResults = () => {
    setLinkcheckResults([]);
  };


  useEffect(() => {
    return () => {
      if (realtimeIntervalRef.current) {
        clearInterval(realtimeIntervalRef.current);
        realtimeIntervalRef.current = null;
      }
      if (unitSubscriptionRef.current) {
        unitSubscriptionRef.current.remove();
        unitSubscriptionRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (selectedMethod === null && realtimeIntervalRef.current) {
      clearInterval(realtimeIntervalRef.current);
      realtimeIntervalRef.current = null;
    }
  }, [selectedMethod]);

  const getMethodLabel = (key: TestMethod | null) => {
    const method = testMethods.find(m => m.key === key);
    return method ? method.label : '';
  };

  return (
    <View style={styles.container}>
      {selectedMethod ? (
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setSelectedMethod(null)} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={28} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerSelected}>{getMethodLabel(selectedMethod)}</Text>
        </View>
      ) : (
        <Text style={styles.header}>Select method</Text>
      )}

      {selectedMethod === null && (
        <View style={styles.cardRow}>
          {testMethods.map(method => (
            <TouchableOpacity
              key={method.key}
              style={styles.methodCard}
              onPress={() => setSelectedMethod(method.key)}
            >
              <MaterialIcons name={method.icon} size={32} color="#007AFF" style={styles.methodIcon} />
              <Text style={styles.methodCardText}>{method.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {selectedMethod && (
        <>
          <View style={styles.selectionCard}>
            <View style={styles.bigSwitchRow}>
              {['unit', 'periodic', 'realtime'].map(mode => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.bigSwitchButton, testMode === mode && styles.bigSwitchButtonActive]}
                  onPress={() => setTestMode(mode as TestMode)}
                >
                  <Text style={[styles.bigSwitchText, testMode === mode && styles.bigSwitchTextActive]}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {testMode !== 'unit' && (
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
            )}

            {testMode === 'periodic' && (
              <>
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
            )}
          </View>

          <TouchableOpacity
            style={isRealtimeRunning ? styles.stopButton : styles.runButton}
            onPress={handleRun}
          >
            <Text style={isRealtimeRunning ? styles.stopButtonText : styles.runButtonText}>
              {isRealtimeRunning ? 'Stop' : 'Run'}
            </Text>
          </TouchableOpacity>


          {testMode === 'realtime' && (
            <>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Sauvegarder</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stopButton} onPress={resetResults}>
                <Text style={styles.stopButtonText}>Reset</Text>
              </TouchableOpacity>
            </>
          )}
          {linkcheckResults.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Résultats reçus :</Text>
              {linkcheckResults.slice(-10).map((res, idx) => (
                <Text key={idx} style={{ fontSize: 14, color: '#333', marginBottom: 4 }}>
                  valeur{idx + 1} : {res.value}
                </Text>
              ))}
            </View>
          )}

        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA', padding: 16 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 18, textAlign: 'center', color: '#222' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backButton: { padding: 4, marginRight: 8 },
  headerSelected: { fontSize: 22, fontWeight: 'bold', color: '#222' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  methodCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 18, marginHorizontal: 6, alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#E0E0E0' },
  methodIcon: { marginBottom: 8 },
  methodCardText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  selectionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 18, marginVertical: 18, elevation: 2, borderWidth: 1, borderColor: '#E0E0E0' },
  bigSwitchRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 18 },
  bigSwitchButton: { flex: 1, paddingVertical: 12, marginHorizontal: 8, borderRadius: 8, backgroundColor: '#F0F0F0', alignItems: 'center' },
  bigSwitchButtonActive: { backgroundColor: '#007AFF' },
  bigSwitchText: { fontSize: 18, color: '#007AFF', fontWeight: '600' },
  bigSwitchTextActive: { color: '#fff' },
  frequencyRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12 },
  frequencyButton: { paddingVertical: 8, paddingHorizontal: 18, marginHorizontal: 6, borderRadius: 8, backgroundColor: '#F0F0F0' },
  frequencyButtonSelected: { backgroundColor: '#007AFF' },
  frequencyButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '500' },
  frequencyButtonTextSelected: { color: '#fff' },
  periodRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12 },
  periodButton: { paddingVertical: 8, paddingHorizontal: 18, marginHorizontal: 6, borderRadius: 8, backgroundColor: '#F0F0F0' },
  periodButtonSelected: { backgroundColor: '#007AFF' },
  periodButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '500' },
  periodButtonTextSelected: { color: '#fff' },
  testCountText: { textAlign: 'center', fontSize: 16, marginTop: 8, color: '#222', fontWeight: '500' },
  runButton: { backgroundColor: '#007AFF', borderRadius: 8, paddingVertical: 14, marginHorizontal: 24, marginTop: 12, alignItems: 'center', elevation: 2 },
  runButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  stopButton: { backgroundColor: '#FF3B30', borderRadius: 8, paddingVertical: 14, marginHorizontal: 24, marginTop: 12, alignItems: 'center', elevation: 2 },
  stopButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  saveButton: { backgroundColor: '#34C759', borderRadius: 8, paddingVertical: 14, marginHorizontal: 24, marginTop: 12, alignItems: 'center', elevation: 2 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default TestMain;
