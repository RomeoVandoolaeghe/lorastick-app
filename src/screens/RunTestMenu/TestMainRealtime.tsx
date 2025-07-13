import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Device } from 'react-native-ble-plx';
import { LinkCheckRecord } from '../services/csvUtils';

interface Frequency {
  key: string;
  label: string;
  value: number;
}

interface TestMainRealtimeProps {
  device: Device | null;
  linkcheckResults: LinkCheckRecord[];
  setLinkcheckResults: React.Dispatch<React.SetStateAction<LinkCheckRecord[]>>;
  isRealtimeRunning: boolean;
  handleRun: () => void;
  saveCSVToFile: (results: LinkCheckRecord[]) => void;
  shareCSVFile: (results: LinkCheckRecord[]) => void;
  selectedFrequency: string;
  setSelectedFrequency: (freq: string) => void;
  frequencies: Frequency[];
  styles: any;
}

const TestMainRealtime: React.FC<TestMainRealtimeProps> = ({
  device,
  linkcheckResults,
  setLinkcheckResults,
  isRealtimeRunning,
  handleRun,
  saveCSVToFile,
  shareCSVFile,
  selectedFrequency,
  setSelectedFrequency,
  frequencies,
  styles,
}) => {
  return (
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

      <TouchableOpacity
        style={isRealtimeRunning ? styles.stopButton : styles.runButton}
        onPress={handleRun}
      >
        <Text style={isRealtimeRunning ? styles.stopButtonText : styles.runButtonText}>
          {isRealtimeRunning ? 'Stop' : 'Run'}
        </Text>
      </TouchableOpacity>

      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.saveButtonWide, { backgroundColor: '#FF3B30', marginRight: 12 }]} onPress={() => setLinkcheckResults([])}>
          <MaterialIcons name="delete" size={24} color="#fff" style={{ alignSelf: 'center' }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButtonWide} onPress={() => saveCSVToFile(linkcheckResults)}>
          <Text style={styles.saveButtonText}>Save as file</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButtonSquare} onPress={() => shareCSVFile(linkcheckResults)}>
          <MaterialIcons name="share" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {linkcheckResults.length > 0 && (
        <ScrollView style={{ marginTop: 20 }} contentContainerStyle={{ flexGrow: 1 }}>
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
  );
};

export default TestMainRealtime; 