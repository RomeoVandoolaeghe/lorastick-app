import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Device } from 'react-native-ble-plx';
import { saveCSVToFile, shareCSVFile, LinkCheckRecord } from '../../services/csvUtils';
import { demoSamples } from './TestMainDemosample';
import styles from './TestMain.styles.ts';
import { useDemoMode } from '../../common/DemoModeContext';

interface TestMainUnitProps {
  device: Device | null;
}

const TestMainUnit: React.FC<TestMainUnitProps> = ({ device }) => {
  const [linkcheckResults, setLinkcheckResults] = useState<LinkCheckRecord[]>([]);
  const [selectedDR, setSelectedDR] = useState('0');
  const { demoMode } = useDemoMode();

  // Handler for running the unit test (demo mode only for now)
  const runUnitTest = () => {
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
    // Real device logic would go here
    Alert.alert('Not implemented', 'Real device test not implemented in this self-contained version.');
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
          {linkcheckResults.map((res, idx) => (
            <View key={idx} style={{
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#eee',
              borderRadius: 8,
              padding: 10,
              paddingRight: 48,
              paddingTop: 24,
              backgroundColor: res.lost_packets > 0 ? '#ffeaea' : '#fafbfc',
              position: 'relative',
            }}>
              {/* Badge for Test number only */}
              <View style={{
                position: 'absolute',
                top: 6,
                right: 6,
                backgroundColor: '#007AFF',
                borderRadius: 12,
                minWidth: 32,
                height: 24,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 8,
                zIndex: 1,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 1.41,
                elevation: 2,
              }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>{linkcheckResults.length - idx}</Text>
              </View>
              {/* Uplink Section */}
              <View style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 2 }}>
                  {/* Time on top left */}
                  <Text style={{ fontWeight: 'bold', fontSize: 13, marginRight: 12 }}>{res.time.slice(11, 19)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ width: 120, fontSize: 12 }}>TX_DEMOD_MARGIN: <Text style={{ fontWeight: 'bold' }}>{res.tx_demod_margin}</Text></Text>
                  <Text style={{ width: 100, fontSize: 12 }}>TX_DR: <Text style={{ fontWeight: 'bold' }}>{res.tx_dr}</Text></Text>
                </View>
              </View>
              {/* Downlink Section */}
              <View>
                <Text style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 2 }}>Downlink</Text>
                {res.lost_packets > 0 ? (
                  <Text style={{ color: 'red', fontWeight: 'bold', fontSize: 12 }}>Downlink not received</Text>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* WiFi icon and badge for gateways */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                      <MaterialIcons name="wifi" size={18} color="#007AFF" />
                      <View style={{
                        backgroundColor: '#007AFF',
                        borderRadius: 8,
                        minWidth: 22,
                        height: 18,
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingHorizontal: 6,
                        marginLeft: -8,
                        marginRight: 8,
                        zIndex: 1,
                      }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>{res.gateways}</Text>
                      </View>
                    </View>
                    <Text style={{ width: 100, fontSize: 12 }}>RX_SNR: <Text style={{ fontWeight: 'bold' }}>{res.rx_snr}</Text></Text>
                    <Text style={{ width: 110, fontSize: 12 }}>RX_RSSI: <Text style={{ fontWeight: 'bold' }}>{res.rx_rssi}</Text></Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </>
  );
};

export default TestMainUnit; 