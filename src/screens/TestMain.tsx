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
import { MenuTab } from '../common/BottomMenu';
import { Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import RNFS from 'react-native-fs'; // Importer react-native-fs pour la gestion des fichiers
import Share from 'react-native-share';  // Importer react-native-share pour le partage de fichiers
import { StorageService } from '../services/storage';
import styles from './TestMain.styles.ts';
import { saveCSVToFile, shareCSVFile, LinkCheckRecord } from '../services/csvUtils';
import { checkLoraMode } from '../services/bleService';
import { demoSamples } from './TestMainDemosample';
import TestMainUnit from './TestMainUnit';

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
const frequencies = [
  { key: '10s', label: '10s', value: 10 },
  { key: '30s', label: '30s', value: 30 },
  { key: '1min', label: '1min', value: 60 },
] as const;


// Durées en secondes pour les périodes et fréquences
const periodSeconds = { '1h': 3600, '4h': 14400, '24h': 86400 };
const frequencySeconds = { '10s': 10, '30s': 30, '1min': 60 };


// Type pour les méthodes de test
type TestMethod = typeof testMethods[number]['key'];
type Period = typeof periods[number];
type Frequency = typeof frequencies[number]['key'];
type TestMode = 'unit' | 'periodic' | 'realtime' | null;



const TestMain: React.FC<TestMainProps> = ({ selected, onTabChange, device }) => {
  // États pour gérer la sélection de méthode, mode de test, période, fréquence et résultats
  const [selectedMethod, setSelectedMethod] = useState<TestMethod | null>(null);
  const [testMode, setTestMode] = useState<TestMode>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('1h');
  const [selectedFrequency, setSelectedFrequency] = useState<Frequency>('10s');
  const [linkcheckResults, setLinkcheckResults] = useState<LinkCheckRecord[]>([]);
  const [isRealtimeRunning, setIsRealtimeRunning] = useState(false);
  const realtimeSubscriptionRef = useRef<ReturnType<Device['monitorCharacteristicForService']> | null>(null);
  const realtimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const unitSubscriptionRef = useRef<ReturnType<Device['monitorCharacteristicForService']> | null>(null);
  const [networkMode, setNetworkMode] = useState<'lorawan' | 'p2p'>('lorawan');
  const [demoModeEnabled, setDemoModeEnabled] = useState(false);


  useEffect(() => {
    const loadDemoMode = async () => {
      const enabled = await StorageService.isDemoModeEnabled();
      setDemoModeEnabled(enabled);
    };
    loadDemoMode();
  }, []);


  // Fonction pour exécuter le test unitaire LinkCheck
  const runUnitTest = async () => {
    if (demoModeEnabled) {
      // Add one more sample value each time Run is clicked
      setLinkcheckResults(prev => {
        const nextIndex = prev.length;
        if (nextIndex < demoSamples.length) {
          return [...prev, demoSamples[nextIndex]];
        } else {
          // If all samples are shown, cycle or keep adding the last one
          return [...prev, demoSamples[demoSamples.length - 1]];
        }
      });
      return;
    }
    if (!device) {
      Alert.alert('Erreur', 'Aucun appareil connecté');
      return;
    }

    // Nettoyer les anciennes subscriptions
    if (unitSubscriptionRef.current) {
      unitSubscriptionRef.current.remove();
      unitSubscriptionRef.current = null;
    }

    // Vérifier les services et caractéristiques du device
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

            setLinkcheckResults(prev => [...prev, newResult]);
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

          setLinkcheckResults(prev => [...prev, newResult]);
        }

      }
    );


    // Fonction pour envoyer la commande RUN Genlinkcheck
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

    if (testMode === 'unit') {
      runUnitTest();
    } else if (testMode === 'realtime') {
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
            <Text style={styles.headerSelected}>{getMethodLabel(selectedMethod)}</Text>
          </View>
          {/* Centralized subtitle for Unit Test mode */}
          {testMode === 'unit' && (
            <Text style={styles.unitSubtitle}>Unit Test</Text>
          )}
          {testMode !== 'unit' && (
            <Text style={styles.subHeader}>{getModeLabel()}</Text>
          )}
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




      {testMode && (
        <>
          {testMode && (
            <>
              {testMode === 'realtime' && (
                <>
                  <View style={styles.frequencyRow}>
                    {frequencies.map(freq => (
                      <TouchableOpacity
                        key={freq.key}
                        style={[
                          styles.frequencyButton,
                          selectedFrequency === freq.key && styles.frequencyButtonSelected,
                        ]}
                        onPress={() => setSelectedFrequency(freq.key)}
                      >
                        <Text
                          style={[
                            styles.frequencyButtonText,
                            selectedFrequency === freq.key && styles.frequencyButtonTextSelected,
                          ]}
                        >
                          {freq.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* ✅ Use TestMainUnit for unit mode */}
              {testMode === 'unit' && (
                <TestMainUnit
                  device={device}
                  linkcheckResults={linkcheckResults}
                  setLinkcheckResults={setLinkcheckResults}
                  runUnitTest={runUnitTest}
                  saveCSVToFile={saveCSVToFile}
                  shareCSVFile={shareCSVFile}
                  demoModeEnabled={demoModeEnabled}
                  styles={styles}
                />
              )}

              {/* ✅ Bouton Run seulement pour le mode realtime (unit is now handled by TestMainUnit) */}
              {testMode === 'realtime' && (
                <TouchableOpacity
                  style={isRealtimeRunning ? styles.stopButton : styles.runButton}
                  onPress={handleRun}
                >
                  <Text style={isRealtimeRunning ? styles.stopButtonText : styles.runButtonText}>
                    {isRealtimeRunning ? 'Stop' : 'Run'}
                  </Text>
                </TouchableOpacity>
              )}

            </>
          )}


          {testMode === 'periodic' && (
            <>
              <View style={styles.periodRow}>
                {periods.map(period => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodButton,
                      selectedPeriod === period && styles.periodButtonSelected,
                    ]}
                    onPress={() => setSelectedPeriod(period)}
                  >
                    <Text
                      style={[
                        styles.periodButtonText,
                        selectedPeriod === period && styles.periodButtonTextSelected,
                      ]}
                    >
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.testCountText}>
                Total tests: {Math.floor(periodSeconds[selectedPeriod] / frequencySeconds[selectedFrequency])}
              </Text>

              {/* 👇 Ajoute ce bouton ici pour le placer juste après les fréquences */}
              <TouchableOpacity
                style={styles.runButton}
                onPress={handleRun}
              >
                <Text style={styles.runButtonText}>Run</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Remove duplicated Save/Share/results UI for unit mode, now handled by TestMainUnit */}
          {testMode === 'realtime' && (
            <>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.saveButtonWide} onPress={() => saveCSVToFile(linkcheckResults)}>
                  <Text style={styles.saveButtonText}>Save as file</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.shareButtonSquare} onPress={() => shareCSVFile(linkcheckResults)}>
                  <MaterialIcons name="share" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {linkcheckResults.length > 0 && (
                <ScrollView style={{ marginTop: 20 }} contentContainerStyle={{ flexGrow: 1 }} ref={ref => { if (ref) ref.scrollTo({ y: 0, animated: false }); }}>
                  <ScrollView horizontal>
                    <View>
                      {/* En-têtes de colonnes */}
                      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#ccc', paddingBottom: 1, marginBottom: 2 }}>
                        <Text style={{ width: 50, fontWeight: 'bold', fontSize: 12 }}>#</Text>
                        {['Time', 'Mode', 'Gw', 'Lat', 'Lng', 'RX_RSSI', 'RX_SNR', 'TX_DEMOD_MARGIN', 'TX_DR', 'Lost'].map((col, i) => (
                          <Text key={i} style={{ width: 80, fontWeight: 'bold', fontSize: 12 }}>{col}</Text>
                        ))}
                      </View>

                      {/* Lignes de données */}
                      {linkcheckResults.map((res, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#eee', paddingVertical: 4 }}>
                          <Text style={{ width: 50, fontSize: 12 }}>{idx + 1}</Text>
                          <Text style={{ width: 80, fontSize: 12 }}>{res.time.slice(11, 19)}</Text>
                          <Text style={{ width: 80, fontSize: 12 }}>{res.mode}</Text>
                          <Text style={{ width: 80, fontSize: 12 }}>{res.gateways}</Text>
                          <Text style={{ width: 80, fontSize: 12 }}>{res.latitude.toFixed(4)}</Text>
                          <Text style={{ width: 80, fontSize: 12 }}>{res.longitude.toFixed(4)}</Text>
                          <Text style={{ width: 80, fontSize: 12 }}>{res.rx_rssi}</Text>
                          <Text style={{ width: 80, fontSize: 12 }}>{res.rx_snr}</Text>
                          <Text style={{ width: 80, fontSize: 12 }}>{res.tx_demod_margin}</Text>
                          <Text style={{ width: 80, fontSize: 12 }}>{res.tx_dr}</Text>
                          <Text style={{ width: 80, fontSize: 12 }}>{res.lost_packets}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </ScrollView>
              )}
            </>
          )}

        </>
      )}
    </View>
  );
};

export default TestMain;
