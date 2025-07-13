import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { Picker } from '@react-native-picker/picker';
import { MenuTab } from '../../common/BottomMenu';

import styles from './TestMain.styles.ts';
import { saveCSVToFile, shareCSVFile, LinkCheckRecord } from '../../services/csvUtils';
import { checkLoraMode, GetLoRaWANsetup, GetDataRateList } from '../../services/DeviceServices';
import TestMainUnit from './TestMainUnit';
import TestMainRealtime from './TestMainRealtime';
import { useDemoMode } from '../../common/DemoModeContext';
import TestMainPeriod from './TestMainPeriod';

// Props pour le composant TestMain
interface TestMainProps {
  selected: MenuTab;
  onTabChange: (tab: MenuTab) => void;
  device: Device | null;
  demoMode?: boolean;
}


// Méthodes de test disponibles
const testMethods = [
  { key: 'LinkCheck', icon: 'network-check', label: 'LinkCheck' },
  // { key: 'P2P', icon: 'sync-alt', label: 'P2P' },
  { key: 'Device Mode', icon: 'settings-input-antenna', label: 'Device Mode' },
] as const;


// Périodes et fréquences disponibles
const periods = ['1h', '4h', '24h'] as const;


// Durées en secondes pour les périodes et fréquences
const periodSeconds = { '1h': 3600, '4h': 14400, '24h': 86400 };
const frequencySeconds = { '10s': 10, '30s': 30, '1min': 60 };


// Type pour les méthodes de test
type TestMethod = typeof testMethods[number]['key'];
type Period = typeof periods[number];
type TestMode = 'unit' | 'periodic' | 'realtime' | null;


//----------------------------------------------------------------------
const TestMain: React.FC<TestMainProps> = ({ selected, onTabChange, device }) => {
  
  // États pour gérer la sélection de méthode, mode de test, période, fréquence et résultats
  const [selectedMethod, setSelectedMethod] = useState<TestMethod | null>(null);
  const [testMode, setTestMode] = useState<TestMode>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('1h');
  const [linkcheckResults, setLinkcheckResults] = useState<LinkCheckRecord[]>([]);
  const [isRealtimeRunning, setIsRealtimeRunning] = useState(false);
  const realtimeSubscriptionRef = useRef<ReturnType<Device['monitorCharacteristicForService']> | null>(null);
  const realtimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const unitSubscriptionRef = useRef<ReturnType<Device['monitorCharacteristicForService']> | null>(null);
  const [networkMode, setNetworkMode] = useState<'lorawan' | 'p2p'>('lorawan');
  const [selectedDR, setSelectedDR] = useState('0');
  const [dataRateList, setDataRateList] = useState<Array<{ data_rate: string, lora_sf: string, bit_rate: string }>>([]);


  // Fetch DR from device on device change
  useEffect(() => {
    (async () => {
      try {
        const setup = await GetLoRaWANsetup(device);
        if (setup && setup.region) {
          const drList = await GetDataRateList(setup.region);
          console.log('Picker region:', setup.region, 'DataRateList:', drList, 'Device DR:', setup.dr);
          setDataRateList(drList);
          // Always set selectedDR to device DR if possible, else fallback to first in list
          if (setup.dr !== undefined && drList.some(dr => dr.data_rate === setup.dr.toString())) {
            setSelectedDR(setup.dr.toString());
          } else if (drList.length > 0) {
            setSelectedDR(drList[0].data_rate);
          }
        } else {
          setDataRateList([]);
        }
      } catch (e) {
        setDataRateList([]);
      }
    })();
  }, [device]);


  // Fonction pour démarrer le mode temps réel
  const startRealtimeMode = async () => {
    if (!device) {
      Alert.alert('Erreur', 'Aucun appareil connecté');
      return;
    }

    //Nettoyer l'abonnement du mode unit si encore actif
    if (unitSubscriptionRef.current) {
      unitSubscriptionRef.current.remove();
      unitSubscriptionRef.current = null;
    }

    // Nettoyer l'intervalle précédent s'il existe
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

    if (realtimeSubscriptionRef.current) {
      realtimeSubscriptionRef.current.remove();
      realtimeSubscriptionRef.current = null;
    }

    realtimeSubscriptionRef.current = device.monitorCharacteristicForService(
      notifyChar.serviceUUID,
      notifyChar.uuid,
      (error, characteristic) => {
        if (error || !characteristic?.value) return;

        const decoded = Buffer.from(characteristic.value, 'base64').toString('utf-8');
        if (decoded.startsWith('+LINKCHECK:')) {
          const clean = decoded.trim().replace('+LINKCHECK: ', '');
          const [gateways, latitude, longitude, rx_rssi, rx_snr, tx_demod_margin, tx_dr, lost_packets] = clean.split(',').map(Number);

          const newResult: LinkCheckRecord = {
            time: new Date().toISOString(), // ou récupérée du device si fournie
            mode: 0,
            gateways,
            latitude,
            longitude,
            rx_rssi,
            rx_snr,
            tx_demod_margin,
            tx_dr,
            lost_packets,
          };

          setLinkcheckResults(prev => [newResult, ...prev]);
        }

      }
    );

    //---------------------------------------------------
    // Send RUN Genlinkcheck to LoRaStick
    const sendLinkCheck = async () => {
      try {
        await device.writeCharacteristicWithoutResponseForService(
          writeChar.serviceUUID,
          writeChar.uuid,
          Buffer.from('RUN Genlinkcheck\n', 'utf-8').toString('base64')
        );
      } catch (e) {
        console.error('Erreur envoi Genlinkcheck:', e);
      }
    };

    await sendLinkCheck();
    realtimeIntervalRef.current = setInterval(sendLinkCheck, intervalMs);
    setIsRealtimeRunning(true);
  };


  // Fonction pour arrêter le mode temps réel
  const stopRealtimeMode = () => {
    if (realtimeIntervalRef.current) {
      clearInterval(realtimeIntervalRef.current);
      realtimeIntervalRef.current = null;
    }
    setIsRealtimeRunning(false);

    if (realtimeSubscriptionRef.current) {
      realtimeSubscriptionRef.current.remove();
      realtimeSubscriptionRef.current = null;
    }
  };


  // Fonction pour gérer l'exécution du test en fonction du mode sélectionné
  const handleRun = () => {
    if (!selectedMethod || !testMode) return;

    // Unit test logic is now handled inside TestMainUnit
    if (testMode === 'realtime') {
      isRealtimeRunning ? stopRealtimeMode() : startRealtimeMode();
    } else if (testMode === 'periodic') {
      const total = Math.floor(
        periodSeconds[selectedPeriod] / frequencySeconds[selectedFrequency]
      );
      Alert.alert('Info', `Mode périodique : ${total} tests seront exécutés.`);
    }
  };

  // Fonction pour obtenir le label d'une méthode de test à partir de sa clé
  const getMethodLabel = (key: TestMethod | null) => {
    const method = testMethods.find(m => m.key === key);
    return method ? method.label : '';
  };


  // Effet pour nettoyer les subscriptions et intervals à la désactivation du composant
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


  // Effet pour gérer le changement de mode de test
  useEffect(() => {
    if (testMode !== 'realtime' && isRealtimeRunning) {
      stopRealtimeMode();
    }

    if (realtimeSubscriptionRef.current) {
      realtimeSubscriptionRef.current.remove();
      realtimeSubscriptionRef.current = null;
    }

    if (unitSubscriptionRef.current) {
      unitSubscriptionRef.current.remove();
      unitSubscriptionRef.current = null;
    }
  }, [testMode]);

  const getModeLabel = () => {
    if (testMode === 'unit') return 'Unit Test';
    if (testMode === 'realtime') return 'RealTime Test';
    if (testMode === 'periodic') return 'Periodic Test';
    return '';
  };

  useEffect(() => {
    if (!device) return;

    checkLoraMode(device).then(mode => {
      if (mode === "1") {
        setNetworkMode("lorawan");
      } else if (mode === "0") {
        setNetworkMode("p2p");
      }
    });
  }, [device]);


  // Helper to render the correct test mode component
  const renderTestModeComponent = () => {
    switch (testMode) {
      case 'unit':
        return (
          <TestMainUnit device={device} />
        );
      case 'realtime':
        return (
          <TestMainRealtime
            device={device}
          />
        );
      case 'periodic':
        return (
          <TestMainPeriod
            selectedPeriod={selectedPeriod}
            setSelectedPeriod={(period: string) => setSelectedPeriod(period as Period)}
            periods={periods as any}
            selectedFrequency={selectedFrequency}
            frequencySeconds={frequencySeconds}
            periodSeconds={periodSeconds}
            handleRun={handleRun}
            styles={styles}
          />
        );
      default:
        return null;
    }
  };


  return (
    <View style={styles.container}>
      {selectedMethod ? (
        <View style={styles.headerContainer}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => {
                if (testMode) {
                  setTestMode(null);
                } else {
                  setSelectedMethod(null);
                }
                setLinkcheckResults([]);
              }}
              style={styles.backButton}
            >
              <View style={{ height: 32, width: 32, justifyContent: 'center', alignItems: 'center' }}>
                <MaterialIcons name="arrow-back" size={28} color="#007AFF" style={{ transform: [{ translateY: 2 }] }} />
              </View>
            </TouchableOpacity>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 0, paddingBottom: 0 }}>
              <Text style={styles.headerSelected}>{getMethodLabel(selectedMethod)}</Text>
            </View>
            {/* Centralized subtitle for each test mode (moved after label) */}
            {testMode === 'unit' && (
              <Text style={styles.unitSubtitle}>Unit</Text>
            )}
            {testMode === 'realtime' && (
              <Text style={styles.unitSubtitle}>Real Time</Text>
            )}
            {testMode === 'periodic' && (
              <Text style={styles.unitSubtitle}>Periodic</Text>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.headerContainer}>
          <Text style={styles.header}>
            {networkMode === 'lorawan' ? 'LoRaWAN Mode' : networkMode === 'p2p' ? 'P2P Mode' : 'Checking mode...'}
          </Text>
        </View>
      )}


      {!selectedMethod && (
        <View style={styles.cardRow}>
          {testMethods.map(method => (
            <TouchableOpacity
              key={method.key}
              style={styles.methodCard}
              onPress={() => setSelectedMethod(method.key)}
            >
              <MaterialIcons name={method.icon} size={32} color="#007AFF" />
              <Text style={styles.methodCardText}>{method.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {selectedMethod && !testMode && (
        <View style={styles.verticalButtonGroup}>
          {['unit', 'realtime', 'periodic'].map(mode => (
            <TouchableOpacity
              key={mode}
              style={styles.verticalButton}
              onPress={() => setTestMode(mode as TestMode)}
            >
              <Text style={styles.verticalButtonText}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Test mode is selected, screen depends on test node */}
      {testMode && renderTestModeComponent()}

    </View>
  );
};

export default TestMain;
