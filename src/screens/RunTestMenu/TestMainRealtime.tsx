import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Router } from 'lucide-react-native';
import { Device } from 'react-native-ble-plx';
import styles from './TestMain.styles.ts';
import { Buffer } from 'buffer';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';
import { CartesianChart, Bar, Line, CartesianAxis } from 'victory-native';
import { Dimensions } from 'react-native';
import { useFont } from '@shopify/react-native-skia';
import robotoMedium from '../../../android/app/src/main/assets/fonts/Roboto-Medium.ttf';


// services 
import { runGenLinkCheck as runGenLinkCheckService, runLinkCheck } from '../../services/DeviceServices';
import { useDemoMode } from '../../common/DemoModeContext';
import { saveCSVToFile, shareCSVFile, LinkCheckRecord } from '../../services/csvUtils';
import { demoSamples } from './TestMainDemosample';
import { GetLoRaWANsetup } from '../../services/DeviceServices';
import { GetRakPowerList, PowerEntry } from '../../services/lorawanspec';
import TransSettingAccordion from '../../components/TransSettingAccordion';
const frequencies = [
  { key: '10s', label: '10s', value: 10 },
  { key: '30s', label: '30s', value: 30 },
  { key: '1min', label: '1min', value: 60 },
  { key: '5min', label: '5min', value: 300 }
] as const;
type Frequency = typeof frequencies[number]['key'];

interface TestMainUnitProps {
  device: Device | null;
}
//----------------------------------------------------------------
const TestMainRealtime: React.FC<TestMainUnitProps> = ({ device }) => {
  const [linkcheckResults, setLinkcheckResults] = useState<LinkCheckRecord[]>([]);
  const [dataRateList, setDataRateList] = useState<Array<{ data_rate: string, lora_sf: string, bit_rate: string }>>([]);
  const [selectedDR, setSelectedDR] = useState('0');
  const [selectedFrequency, setSelectedFrequency] = useState<Frequency>('10s');

  const { demoMode } = useDemoMode();
  const cleanupRef = React.useRef<null | (() => void)>(null);
  const [selectedPowerIdx, setSelectedPowerIdx] = useState(0);
  const [powerList, setPowerList] = useState<PowerEntry[]>([]);
  const [region, setRegion] = useState<string>('');
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showSending, setShowSending] = useState(false);
  const font = useFont(robotoMedium, 12);
  const [showRssi, setShowRssi] = useState(true);
  const [showSnr, setShowSnr] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchRegionAndPower = async () => {
      try {
        const setup = await GetLoRaWANsetup(device);
        if (setup && setup.region) {
          let list = GetRakPowerList(setup.region);
          list = list.sort((a, b) => a.value - b.value);
          if (isMounted) {
            setRegion(setup.region);
            setPowerList(list);
            setSelectedPowerIdx(0); // default to first
            // Fetch DR list
            const drList = await import('../../services/DeviceServices').then(m => m.GetDataRateList(setup.region));
            setDataRateList(drList);
            if (setup.dr !== undefined && drList.some(dr => dr.data_rate === setup.dr.toString())) {
              setSelectedDR(setup.dr.toString());
            } else if (drList.length > 0) {
              setSelectedDR(drList[0].data_rate);
            }
          }
        } else {
          if (isMounted) {
            setRegion('');
            setPowerList([]);
            setSelectedPowerIdx(0);
            setDataRateList([]);
            setSelectedDR('0');
          }
        }
      } catch (e) {
        if (isMounted) {
          setRegion('');
          setPowerList([]);
          setSelectedPowerIdx(0);
          setDataRateList([]);
          setSelectedDR('0');
        }
      }
    };
    fetchRegionAndPower();
    return () => { isMounted = false; };
  }, [device]);

  // Add countdown effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let freqObj = frequencies.find(f => f.key === selectedFrequency);
    let startValue = freqObj ? freqObj.value : 0;
    if (isRunning) {
      setCountdown(startValue);
      if (startValue > 0) {
        timer = setInterval(() => {
          setCountdown(prev => {
            if (prev > 1) {
              return prev - 1;
            } else {
              // Restart countdown
              return startValue;
            }
          });
        }, 1000);
      }
    } else {
      setCountdown(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, selectedFrequency]);

  React.useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  // Handler for running the unit test
  const runButtonHandle = async () => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    try {
      const txPower = powerList[selectedPowerIdx]?.value;
      const dr = parseInt(selectedDR, 10);
      if (typeof txPower !== 'number' || isNaN(dr)) {
        Alert.alert('Erreur', 'Paramètres de transmission invalides');
        return;
      }
      setIsRunning(true);
      // Only set up cleanup, do not run LinkCheck here anymore
      const cleanup = await runLinkCheck(device as Device, txPower, dr, (newResult) => {
        setLinkcheckResults(prev => [newResult, ...prev]);
        console.log(newResult);
      });
      cleanupRef.current = cleanup;
    } catch (e: any) {
      setIsRunning(false);
      Alert.alert('Erreur', e.message || 'Échec');
    }
  };

  // New effect: run LinkCheck when countdown hits 1
  useEffect(() => {
    if (!isRunning) return;
    if (countdown === 1) {
      // Show inline message
      setShowSending(true);
      setTimeout(() => setShowSending(false), 1500);
      // Run LinkCheck
      const txPower = powerList[selectedPowerIdx]?.value;
      const dr = parseInt(selectedDR, 10);
      if (typeof txPower !== 'number' || isNaN(dr)) {
        Alert.alert('Erreur', 'Paramètres de transmission invalides');
        return;
      }
      runLinkCheck(device as Device, txPower, dr, (newResult) => {
        setLinkcheckResults(prev => [newResult, ...prev]);
        console.log(newResult);
      });
    }
  }, [countdown, isRunning, device, powerList, selectedPowerIdx, selectedDR]);

  const stopButtonHandle = () => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setIsRunning(false);
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
      {!isRunning && (
        <TransSettingAccordion
          powerList={powerList}
          selectedPowerIdx={selectedPowerIdx}
          setSelectedPowerIdx={setSelectedPowerIdx}
          dataRateList={dataRateList}
          selectedDR={selectedDR}
          setSelectedDR={setSelectedDR}
          loading={false}
        />
      )}
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


      {/* Countdown Timer when running */}
      {isRunning && countdown > 0 && (
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          {showSending ? (
            <Text style={{ fontSize: 20, color: '#FF9500' }}>
              Sending LinkCheck command...
            </Text>
          ) : (
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#007AFF' }}>
              Next Linkcheck in: {countdown}s
            </Text>
          )}
        </View>
      )}
      {/* Run/Stop Button - always visible at the top */}
      {isRunning ? (
        <TouchableOpacity style={[styles.runButton, { backgroundColor: '#FF3B30', marginTop: 16, marginBottom: 8 }]} onPress={stopButtonHandle}>
          <Text style={styles.runButtonText}>Stop</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.runButton, { marginTop: 16, marginBottom: 8 }]} onPress={runButtonHandle}>
          <Text style={styles.runButtonText}>Run</Text>
        </TouchableOpacity>
      )}

      {/* Controls and Summary only when results exist */}
      {linkcheckResults.length > 0 && (
        <>
          {/* Action Row only if isRunning is false */}
          {!isRunning && (
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
          )}
          {/* Summary Section */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f2f2f7',
            borderRadius: 8,
            padding: 10,
            marginTop: 8,
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
          {/* RSSI and SNR Statistics Section */}
          <View style={{
            backgroundColor: '#f2f2f7',
            borderRadius: 8,
            padding: 10,
            marginTop: 0,
            marginBottom: 8,
          }}>
            {/* RSSI Stats */}
            <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 2 }}>
              RSSI (dBm):
              {'  '}Min: {linkcheckResults.length > 0 ? Math.min(...linkcheckResults.map(r => r.rx_rssi)) : '-'}
              {'  '}Avg: {linkcheckResults.length > 0 ? (linkcheckResults.reduce((sum, r) => sum + r.rx_rssi, 0) / linkcheckResults.length).toFixed(1) : '-'}
              {'  '}Max: {linkcheckResults.length > 0 ? Math.max(...linkcheckResults.map(r => r.rx_rssi)) : '-'}
            </Text>
            {/* RSSI Power Ratio */}
            {linkcheckResults.length > 0 && (() => {
              const min = Math.min(...linkcheckResults.map(r => r.rx_rssi));
              const avg = linkcheckResults.reduce((sum, r) => sum + r.rx_rssi, 0) / linkcheckResults.length;
              const max = Math.max(...linkcheckResults.map(r => r.rx_rssi));
              // Power ratio: 10^((min-avg)/10), 10^((max-avg)/10)
              const minRatio = Math.pow(10, (min - avg) / 10);
              const maxRatio = Math.pow(10, (max - avg) / 10);
              const minRatioDisplay = minRatio < 1 ? `1/${Math.floor(1 / minRatio)}` : `${minRatio.toFixed(3)}x`;
              const maxRatioDisplay = maxRatio < 1 ? `1/${(1 / maxRatio).toFixed(2)}` : `${Math.floor(maxRatio)}x`;
              return (
                <Text style={{ fontSize: 13, color: '#555', marginBottom: 2 }}>
                  Power ratio (Min/Avg): {minRatioDisplay}, (Max/Avg): {maxRatioDisplay}
                </Text>
              );
            })()}
            {/* SNR Stats */}
            <Text style={{ fontSize: 14, fontWeight: 'bold' }}>
              SNR (dB):
              {'  '}Min: {linkcheckResults.length > 0 ? Math.min(...linkcheckResults.map(r => r.rx_snr)) : '-'}
              {'  '}Avg: {linkcheckResults.length > 0 ? (linkcheckResults.reduce((sum, r) => sum + r.rx_snr, 0) / linkcheckResults.length).toFixed(1) : '-'}
              {'  '}Max: {linkcheckResults.length > 0 ? Math.max(...linkcheckResults.map(r => r.rx_snr)) : '-'}
            </Text>
            {/* SNR Power Ratio */}
            {linkcheckResults.length > 0 && (() => {
              const min = Math.min(...linkcheckResults.map(r => r.rx_snr));
              const avg = linkcheckResults.reduce((sum, r) => sum + r.rx_snr, 0) / linkcheckResults.length;
              const max = Math.max(...linkcheckResults.map(r => r.rx_snr));
              // Power ratio: 10^((min-avg)/10), 10^((max-avg)/10)
              const minRatio = Math.pow(10, (min - avg) / 10);
              const maxRatio = Math.pow(10, (max - avg) / 10);
              const minRatioDisplay = minRatio < 1 ? `1/${Math.floor(1 / minRatio)}` : `${minRatio.toFixed(3)}x`;
              const maxRatioDisplay = maxRatio < 1 ? `1/${(1 / maxRatio).toFixed(2)}` : `${Math.floor(maxRatio)}x`;
              return (
                <Text style={{ fontSize: 13, color: '#555' }}>
                  Power ratio (Min/Avg): {minRatioDisplay}, (Max/Avg): {maxRatioDisplay}
                </Text>
              );
            })()}
          </View>
        </>
      )}

      {linkcheckResults.length > 0 && (
        <>
          {/* Legend for chart */}
          <View style={styles.chartLegend}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, opacity: showRssi ? 1 : 0.4 }}
              onPress={() => setShowRssi(v => !v)}
            >
              <View style={styles.legendSwatchRssi} />
              <Text style={{ fontSize: 13, color: '#222', marginRight: 8 }}>RSSI in dBM</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', opacity: showSnr ? 1 : 0.4 }}
              onPress={() => setShowSnr(v => !v)}
            >
              <View style={styles.legendSwatchSnr} />
              <Text style={{ fontSize: 13, color: '#222' }}>SNR in dB</Text>
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: 4, width: Dimensions.get('window').width - 16, height: 400 }}>
            <CartesianChart
              data={linkcheckResults.map((r, i) => ({ x: i + 1, rx_rssi: r.rx_rssi, rx_snr: r.rx_snr }))}
              xKey="x"
              yKeys={["rx_rssi", "rx_snr"]}
              padding={10}
              domain={{ y: undefined }}
              yAxis={[
                {
                  yKeys: ['rx_rssi'],
                  tickCount: 6,
                  formatYLabel: (value: number) => `${value}`,
                  font,
                  axisSide: 'left',
                },
                {
                  yKeys: ['rx_snr'],
                  tickValues: [-9, -6, -3, 0, 3, 6, 9],
                  formatYLabel: (value: number) => `${value}`,
                  font,
                  axisSide: 'right',
                  labelColor: '#FF9500',
                  lineColor: '#FF9500',
                }
              ]}
            >
              {({ points, chartBounds }) => (
                <>
                  {showRssi && (
                    <Bar points={points.rx_rssi} chartBounds={chartBounds} color="#007AFF" roundedCorners={{ topLeft: 6, topRight: 6 }} />
                  )}
                  {showSnr && (
                    <Line points={points.rx_snr} color="#FF9500" strokeWidth={2} />
                  )}
                </>
              )}
            </CartesianChart>
          </View>
        </>
      )}
    </>
  );
};

export default TestMainRealtime;