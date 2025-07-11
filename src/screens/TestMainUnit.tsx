import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Device } from 'react-native-ble-plx';
import { LinkCheckRecord } from '../services/csvUtils';

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

      {linkcheckResults.length > 0 && (
        <ScrollView style={{ marginTop: 20 }} contentContainerStyle={{ flexGrow: 1 }}>
          {[...linkcheckResults].slice().reverse().map((res, idx) => (
            <View key={idx} style={{ marginBottom: 16, borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, backgroundColor: '#fafbfc' }}>
              {/* Uplink Section */}
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 2 }}>Uplink</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                  <Text style={{ width: 90, fontSize: 12 }}>Test #: <Text style={{ fontWeight: 'bold' }}>{idx + 1}</Text></Text>
                  <Text style={{ width: 120, fontSize: 12 }}>Time: <Text style={{ fontWeight: 'bold' }}>{res.time.slice(11, 19)}</Text></Text>
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