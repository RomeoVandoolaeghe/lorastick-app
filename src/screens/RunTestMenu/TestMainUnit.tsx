import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Router } from 'lucide-react-native';
import { Device } from 'react-native-ble-plx';
import styles from './TestMain.styles.ts';
import { Buffer } from 'buffer';

// services 
import { runUnitTest as runUnitTestService } from '../../services/DeviceServices';
import { useDemoMode } from '../../common/DemoModeContext';
import { saveCSVToFile, shareCSVFile, LinkCheckRecord } from '../../services/csvUtils';
import { demoSamples } from './TestMainDemosample';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';


interface TestMainUnitProps {
  device: Device | null;
}
//----------------------------------------------------------------
const TestMainUnit: React.FC<TestMainUnitProps> = ({ device }) => {
  const [linkcheckResults, setLinkcheckResults] = useState<LinkCheckRecord[]>([]);
  const [selectedDR, setSelectedDR] = useState('0');
  const { demoMode } = useDemoMode();
  const cleanupRef = React.useRef<null | (() => void)>(null);

  React.useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  // Handler for running the unit test
  const runUnitTest = async () => {
    if (demoMode) {
      setLinkcheckResults(prev => {
        const nextIndex = prev.length;
        if (nextIndex < demoSamples.length) {
          return [demoSamples[nextIndex], ...prev];
        } else {
          return [demoSamples[demoSamples.length - 1], ...prev];
        }
      });
      return;
    }
    if (!device) {
      Alert.alert('Erreur', 'Aucun appareil connecté');
      return;
    }
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    try {
      const cleanup = await runUnitTestService(device, (newResult) => {
        setLinkcheckResults(prev => [newResult, ...prev]);
      });
      cleanupRef.current = cleanup;
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Échec');
    }
  };

  // Handler for saving CSV
  const handleSaveCSV = async () => {
    await saveCSVToFile(linkcheckResults);
  };

  // Handler for sharing CSV
  const handleShareCSV = async () => {
    await shareCSVFile(linkcheckResults);
  };

  return (
    <>
      <TouchableOpacity style={styles.runButton} onPress={runUnitTest}>
        <Text style={styles.runButtonText}>Run</Text>
      </TouchableOpacity>

      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.saveButtonWide, { backgroundColor: '#FF3B30', marginRight: 12 }]} onPress={() => setLinkcheckResults([])}>
          <MaterialIcons name="delete" size={24} color="#fff" style={{ alignSelf: 'center' }} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.saveButtonWide, { marginRight: 12 }]} onPress={handleSaveCSV}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButtonWide} onPress={handleShareCSV}>
          <MaterialIcons name="share" size={24} color="#fff" style={{ alignSelf: 'center' }} />
        </TouchableOpacity>
      </View>

      {/* Summary Section */}
      {linkcheckResults.length > 0 && (
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f2f2f7',
          borderRadius: 8,
          padding: 10,
          marginTop: 16,
          marginBottom: 8,
        }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold' }}>
            Downlink lost: {linkcheckResults.filter(r => r.lost_packets > 0).length}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: 'bold' }}>
            Max GW: {Math.max(...linkcheckResults.map(r => r.gateways))}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: 'bold' }}>
            Min GW: {Math.min(...linkcheckResults.map(r => r.gateways))}
          </Text>
        </View>
      )}

      {linkcheckResults.length > 0 && (
        <ScrollView style={{ marginTop: 20 }} contentContainerStyle={{ flexGrow: 1 }}>
          {(() => {
            // Calculate best SNR and RSSI once for all results
            const bestSNR = Math.max(...linkcheckResults.map(r => r.rx_snr));
            const bestRSSI = Math.max(...linkcheckResults.map(r => r.rx_rssi));
            return linkcheckResults.map((res, idx) => (
              <View key={idx} style={{
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#eee',
                borderRadius: 8,
                padding: 10,
                backgroundColor: res.lost_packets > 0 ? '#ffeaea' : '#fafbfc',
                position: 'relative',
              }}>
                {/* Header Row: Badge, Time, DR */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  {/* Badge for Test number */}
                  <View style={{
                    backgroundColor: '#007AFF',
                    borderRadius: 16,
                    minWidth: 36,
                    height: 32,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 10,
                    marginRight: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.2,
                    shadowRadius: 1.41,
                    elevation: 2,
                  }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{linkcheckResults.length - idx}</Text>
                  </View>
                  {/* Timestamp */}
                  <Text style={{ fontWeight: 'bold', fontSize: 18, marginRight: 12 }}>{res.time.slice(11, 19)}</Text>
                  {/* DR */}
                  <Text style={{ fontSize: 18 }}>DR <Text style={{ fontWeight: 'bold' }}>{res.tx_dr}</Text></Text>
                </View>
                {/* Main Row: Four columns */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* 1. SNR and RSSI */}
                  <View style={{ flex: 1, alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 18, marginBottom: 2 }}>
                      SNR <Text style={{ fontWeight: 'bold' }}>{res.rx_snr > 0 ? `+${res.rx_snr}` : res.rx_snr}</Text>dB
                    </Text>
                    <Text style={{ fontSize: 18 }}>RSSI <Text style={{ fontWeight: 'bold' }}>{res.rx_rssi}</Text></Text>
                  </View>
                  {/* 2. Sensor icon (narrower) */}
                  <View style={{ flex: 0.5, alignItems: 'flex-start', justifyContent: 'center' }}>
                    <MaterialIcons name="sensors" size={36} color="#222" />
                  </View>
                  {/* 3. Gateway icon with badge (narrower) */}
                  <View style={{ flex: 0.5, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                    <Router size={32} color="#222" />
                    <View style={{
                      backgroundColor: '#007AFF',
                      borderRadius: 12,
                      minWidth: 28,
                      height: 24,
                      justifyContent: 'center',
                      alignItems: 'center',
                      paddingHorizontal: 8,
                      marginLeft: -10,
                      marginRight: 0,
                      zIndex: 1,
                    }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>{res.gateways}</Text>
                    </View>
                  </View>
                  {/* 4. Best SNR and RSSI */}
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 18, marginBottom: 2 }}>
                      SNR <Text style={{ fontWeight: 'bold' }}>{bestSNR > 0 ? `+${bestSNR}` : bestSNR}</Text>dB
                    </Text>
                    <Text style={{ fontSize: 18 }}>RSSI <Text style={{ fontWeight: 'bold' }}>{bestRSSI}</Text></Text>
                  </View>
                </View>
              </View>
            ));
          })()}
        </ScrollView>
      )}
    </>
  );
};

export default TestMainUnit; 