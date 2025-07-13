import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';

export interface PowerEntry {
  id: string;
  value: number;
}

interface DataRateEntry {
  data_rate: string;
  lora_sf: string;
  bit_rate: string;
}

interface TransSettingAccordionProps {
  powerList: PowerEntry[];
  selectedPowerIdx: number;
  setSelectedPowerIdx: (idx: number) => void;
  dataRateList: DataRateEntry[];
  selectedDR: string;
  setSelectedDR: (dr: string) => void;
  loading?: boolean;
}

const TransSettingAccordion: React.FC<TransSettingAccordionProps> = ({
  powerList,
  selectedPowerIdx,
  setSelectedPowerIdx,
  dataRateList,
  selectedDR,
  setSelectedDR,
  loading,
}) => {
  const [accordionOpen, setAccordionOpen] = useState(false);

  return (
    <View style={{ marginBottom: 12, borderRadius: 8, backgroundColor: '#f7f7fa', borderWidth: 1, borderColor: '#eee', overflow: 'hidden' }}>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', padding: 14, justifyContent: 'space-between' }}
        onPress={() => setAccordionOpen(o => !o)}
        disabled={loading}
      >
        {accordionOpen ? (
          <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Transmition settings</Text>
        ) : (
          <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
            Transmit power: {powerList[selectedPowerIdx]?.value} dBm, DR: {selectedDR}
          </Text>
        )}
        <MaterialIcons name={accordionOpen ? 'expand-less' : 'expand-more'} size={28} color="#007AFF" />
      </TouchableOpacity>
      {accordionOpen && powerList.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
            Transmit power : {powerList[selectedPowerIdx]?.value} dBm
          </Text>
          <Slider
            minimumValue={0}
            maximumValue={powerList.length - 1}
            step={1}
            value={selectedPowerIdx}
            onValueChange={v => setSelectedPowerIdx(Math.round(v))}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#ccc"
            thumbTintColor="#007AFF"
            disabled={loading}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 12 }}>
            <Text style={{ fontSize: 12 }}>{powerList[0]?.value} dBm</Text>
            <Text style={{ fontSize: 12 }}>{powerList[powerList.length - 1]?.value} dBm</Text>
          </View>
          {/* DR Picker */}
          {dataRateList.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>Data Rate (DR)</Text>
              <Picker
                selectedValue={selectedDR}
                onValueChange={(itemValue: string) => setSelectedDR(itemValue)}
                mode="dropdown"
                dropdownIconColor="#007AFF"
                style={{ backgroundColor: '#fff', borderRadius: 8 }}
                enabled={!loading}
              >
                {dataRateList.map(dr => (
                  <Picker.Item key={dr.data_rate} label={`DR ${dr.data_rate}`} value={dr.data_rate} color="#000" />
                ))}
              </Picker>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default TransSettingAccordion; 