import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Device } from 'react-native-ble-plx';
import { LinkCheckRecord } from '../services/csvUtils';
import { useState } from 'react';
import { Picker } from '@react-native-picker/picker';

interface TestMainUnitProps {
  device: Device | null;
  linkcheckResults: LinkCheckRecord[];
  setLinkcheckResults: React.Dispatch<React.SetStateAction<LinkCheckRecord[]>>;
  runUnitTest: () => void;
  saveCSVToFile: (results: LinkCheckRecord[]) => void;
  shareCSVFile: (results: LinkCheckRecord[]) => void;
  demoModeEnabled: boolean;
  styles: any;
}

const TestMainUnit: React.FC<TestMainUnitProps> = ({
  device,
  linkcheckResults,
  setLinkcheckResults,
  runUnitTest,
  saveCSVToFile,
  shareCSVFile,
  demoModeEnabled,
  styles,
}) => {
  const [selectedDR, setSelectedDR] = useState('0');

  return (
    <>
      <TouchableOpacity style={styles.runButton} onPress={runUnitTest}>
        <Text style={styles.runButtonText}>Run</Text>
      </TouchableOpacity>

      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.saveButtonWide, { backgroundColor: '#FF3B30', marginRight: 12 }]} onPress={() => setLinkcheckResults([])}>
          <MaterialIcons name="delete" size={24} color="#fff" style={{ alignSelf: 'center' }} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.saveButtonWide, { marginRight: 12 }]} onPress={() => saveCSVToFile(linkcheckResults)}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButtonWide} onPress={() => shareCSVFile(linkcheckResults)}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 13 }}>Uplink</Text>
                  <Text style={{ fontWeight: 'bold', fontSize: 13 }}>{res.time.slice(11, 19)}</Text>
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
                    <Text style={{ width: 90, fontSize: 12 }}>GW: <Text style={{ fontWeight: 'bold' }}>{res.gateways}</Text></Text>
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