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

// Props pour le composant TestMain
interface TestMainProps {
  selected: MenuTab;
  onTabChange: (tab: MenuTab) => void;
  device: Device | null;
  demoMode?: boolean;
}


// Interface pour les données de LinkCheck
interface LinkCheckData {
  time: string;
  mode: number;
  gateways: number;
  latitude: number;
  longitude: number;
  rx_rssi: number;
  rx_snr: number;
  demod: number;
  tx_dr: number;
  lost_packets: number;
}

// Méthodes de test disponibles
const testMethods = [
  { key: 'LinkCheck', icon: 'network-check', label: 'LinkCheck' },
  { key: 'P2P', icon: 'sync-alt', label: 'P2P' },
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
  const [linkcheckResults, setLinkcheckResults] = useState<LinkCheckData[]>([]);
  const [isRealtimeRunning, setIsRealtimeRunning] = useState(false);
  const realtimeSubscriptionRef = useRef<ReturnType<Device['monitorCharacteristicForService']> | null>(null);
  const realtimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const unitSubscriptionRef = useRef<ReturnType<Device['monitorCharacteristicForService']> | null>(null);

  // Fonction pour exécuter le test unitaire LinkCheck
  const runUnitTest = async () => {
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
            const [gateways, latitude, longitude, rx_rssi, rx_snr, demod, tx_dr, lost_packets] = clean.split(',').map(Number);

            const newResult: LinkCheckData = {
              time: new Date().toISOString(), // ou récupérée du device si fournie
              mode: 0,
              gateways,
              latitude,
              longitude,
              rx_rssi,
              rx_snr,
              demod,
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
          const [gateways, latitude, longitude, rx_rssi, rx_snr, demod, tx_dr, lost_packets] = clean.split(',').map(Number);

          const newResult: LinkCheckData = {
            time: new Date().toISOString(), // ou récupérée du device si fournie
            mode: 0,
            gateways,
            latitude,
            longitude,
            rx_rssi,
            rx_snr,
            demod,
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




  // Fonction pour exporter les résultats LinkCheck en CSV
  const saveCSVToFile = async (linkcheckResults: LinkCheckData[]): Promise<string | null> => {
    if (!linkcheckResults.length) {
      Alert.alert('Aucun résultat', 'Aucune donnée à sauvegarder.');
      return null;
    }

    try {
      const headers = [
        'LinkCheck', 'Time', 'Mode', 'Gateways', 'Latitude', 'Longitude',
        'RX_RSSI', 'RX_SNR', 'Demod', 'TX_DR', 'LostPackets'
      ];
      const rows = linkcheckResults.map((res, i) => [
        `LinkCheck ${i + 1}`, res.time, res.mode, res.gateways, res.latitude,
        res.longitude, res.rx_rssi, res.rx_snr, res.demod, res.tx_dr, res.lost_packets
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const filePath = `${RNFS.DownloadDirectoryPath}/linkcheck_results_${Date.now()}.csv`;

      await RNFS.writeFile(filePath, csvContent, 'utf8');
      Alert.alert('Succès', 'Fichier enregistré dans le dossier Téléchargements.');
      return filePath;
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de sauvegarder le fichier.');
      return null;
    }
  };

  const shareCSVFile = async (linkcheckResults: LinkCheckData[]) => {
    if (!linkcheckResults.length) {
      Alert.alert('Aucun résultat', 'Aucune donnée à sauvegarder.');
      return null;
    }

    try {
      const headers = [
        'LinkCheck', 'Time', 'Mode', 'Gateways', 'Latitude', 'Longitude',
        'RX_RSSI', 'RX_SNR', 'Demod', 'TX_DR', 'LostPackets'
      ];
      const rows = linkcheckResults.map((res, i) => [
        `LinkCheck ${i + 1}`, res.time, res.mode, res.gateways, res.latitude,
        res.longitude, res.rx_rssi, res.rx_snr, res.demod, res.tx_dr, res.lost_packets
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      // 🔄 Créer un fichier temporaire dans le dossier cache
      const filePath = `${RNFS.CachesDirectoryPath}/linkcheck_temp_${Date.now()}.csv`;

      await RNFS.writeFile(filePath, csvContent, 'utf8');

      // 📤 Partager le fichier sans l’enregistrer dans le dossier Téléchargements
      await Share.open({
        url: 'file://' + filePath,
        type: 'text/csv',
        title: 'Partager LinkCheck CSV',
        failOnCancel: false,
      });

      // Optionnel : supprimer le fichier après le partage
      // await RNFS.unlink(filePath);

    } catch (error) {
      console.error('Erreur partage CSV :', error);
      Alert.alert('Erreur', 'Impossible de partager le fichier.');
    }
  };



  const getModeLabel = () => {
    if (testMode === 'unit') return 'Unit Test';
    if (testMode === 'realtime') return 'RealTime Test';
    if (testMode === 'periodic') return 'Periodic Test';
    return '';
  };



  return (
    <View style={styles.container}>
      {selectedMethod ? (
        <View style={styles.headerContainer}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => {
                setSelectedMethod(null);
                setTestMode(null);
                setLinkcheckResults([]); // 👈 Vider les résultats au retour
              }}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={28} color="#007AFF" />
            </TouchableOpacity>


            <View style={styles.headerTextGroup}>
              <Text style={styles.headerSelected}>{getMethodLabel(selectedMethod)}</Text>
              <Text style={styles.subHeader}>{getModeLabel()}</Text>
            </View>
          </View>
        </View>

      ) : (
        <Text style={styles.header}>Select method</Text>
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
        <View style={styles.selectionCard}>
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

              {/* ✅ Bouton Run affiché pour tous les modes */}
              <TouchableOpacity
                style={isRealtimeRunning ? styles.stopButton : styles.runButton}
                onPress={handleRun}
              >
                <Text style={isRealtimeRunning ? styles.stopButtonText : styles.runButtonText}>
                  {isRealtimeRunning ? 'Stop' : 'Run'}
                </Text>
              </TouchableOpacity>
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
            </>
          )}

          {(testMode === 'realtime' || testMode === 'unit') && (
            <>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.saveButtonWide} onPress={() => saveCSVToFile(linkcheckResults)}>
                  <Text style={styles.saveButtonText}>Save as file</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.shareButtonSquare} onPress={() => shareCSVFile(linkcheckResults)}>
                  <MaterialIcons name="share" size={24} color="#fff" />
                </TouchableOpacity>
              </View>



            </>
          )}


          {linkcheckResults.length > 0 && (
            <ScrollView style={{ marginTop: 20, maxHeight: 300 }}>
              <ScrollView horizontal>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
                    Résultats LinkCheck :
                  </Text>

                  {/* En-têtes de colonnes */}
                  <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#ccc', paddingBottom: 4 }}>
                    <Text style={{ width: 100, fontWeight: 'bold', fontSize: 12 }}>LinkCheck</Text>
                    {['Time', 'Mode', 'Gw', 'Lat', 'Lng', 'RX_RSSI', 'RX_SNR', 'Demod', 'TX_DR', 'Lost'].map((col, i) => (
                      <Text key={i} style={{ width: 80, fontWeight: 'bold', fontSize: 12 }}>{col}</Text>
                    ))}
                  </View>

                  {/* Lignes de données */}
                  {linkcheckResults.map((res, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#eee', paddingVertical: 4 }}>
                      <Text style={{ width: 100, fontSize: 12 }}>{`LinkCheck ${idx + 1}`}</Text>
                      <Text style={{ width: 80, fontSize: 12 }}>{res.time.slice(11, 19)}</Text>
                      <Text style={{ width: 80, fontSize: 12 }}>{res.mode}</Text>
                      <Text style={{ width: 80, fontSize: 12 }}>{res.gateways}</Text>
                      <Text style={{ width: 80, fontSize: 12 }}>{res.latitude.toFixed(4)}</Text>
                      <Text style={{ width: 80, fontSize: 12 }}>{res.longitude.toFixed(4)}</Text>
                      <Text style={{ width: 80, fontSize: 12 }}>{res.rx_rssi}</Text>
                      <Text style={{ width: 80, fontSize: 12 }}>{res.rx_snr}</Text>
                      <Text style={{ width: 80, fontSize: 12 }}>{res.demod}</Text>
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
  methodCardText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  selectionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 18, marginVertical: -20, elevation: 5, borderWidth: 1, borderColor: '#E0E0E0' },
  bigSwitchRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 18 },
  bigSwitchButton: { flex: 1, paddingVertical: 12, marginHorizontal: 8, borderRadius: 8, backgroundColor: '#F0F0F0', alignItems: 'center' },
  bigSwitchText: { fontSize: 18, color: '#007AFF', fontWeight: '600' },
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
  verticalButtonGroup: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12, // fonctionne avec React Native 0.71+, sinon utilise marginBottom dans chaque bouton
  },

  verticalButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginVertical: 6,
    width: '80%',
    alignItems: 'center',
  },

  verticalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContainer: {
    marginBottom: 18,
  },

  subHeaderText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 36, // pour aligner avec le titre (après flèche)
    marginTop: 4,
  },
  headerTextGroup: {
    flexDirection: 'column',
    justifyContent: 'center',
  },

  subHeader: {
    fontSize: 15,
    color: '#666',
    marginTop: 0, // pas de marge inutile
  },
  shareButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginHorizontal: 24,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginTop: 12,
  },

  saveButtonWide: {
    flex: 1,
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 2,
  },

  shareButtonSquare: {
    width: 52,
    height: 52,
    backgroundColor: '#34C759',
    borderRadius: 8,
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },








});

export default TestMain;
