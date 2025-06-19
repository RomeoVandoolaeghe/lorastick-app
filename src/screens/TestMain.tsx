import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Switch } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { MenuTab } from '../common/BottomMenu';

interface TestMainProps {
  selected: MenuTab;
  onTabChange: (tab: MenuTab) => void;
}

const testMethods = [
  { key: 'LinkCheck', icon: 'network-check', label: 'LinkCheck' },
  { key: 'P2P', icon: 'sync-alt', label: 'P2P' },
  { key: 'Device Mode', icon: 'settings-input-antenna', label: 'Device Mode' },
] as const;
type TestMethod = typeof testMethods[number]['key'];
const periods = ['1h', '4h', '24h'] as const;
type Period = typeof periods[number];

const frequencies = [
  { key: '10s', label: '10s', value: 10 },
  { key: '30s', label: '30s', value: 30 },
  { key: '1min', label: '1min', value: 60 },
] as const;
type Frequency = typeof frequencies[number]['key'];

const periodSeconds: Record<Period, number> = { '1h': 3600, '4h': 14400, '24h': 86400 };
const frequencySeconds: Record<Frequency, number> = { '10s': 10, '30s': 30, '1min': 60 };

const TestMain: React.FC<TestMainProps> = () => {
  const [selectedMethod, setSelectedMethod] = useState<TestMethod | null>(null);
  const [isPeriodic, setIsPeriodic] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('1h');
  const [selectedFrequency, setSelectedFrequency] = useState<Frequency>('10s');

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Select method</Text>
      <View style={styles.cardRow}>
        {testMethods.map((method) => (
          <TouchableOpacity
            key={method.key}
            style={[
              styles.methodCard,
              selectedMethod === method.key ? styles.methodCardSelected : null,
            ]}
            onPress={() => setSelectedMethod(method.key)}
            activeOpacity={0.85}
          >
            <MaterialIcons
              name={method.icon}
              size={32}
              color={selectedMethod === method.key ? '#fff' : '#007AFF'}
              style={styles.methodIcon}
            />
            <Text
              style={[
                styles.methodCardText,
                selectedMethod === method.key ? styles.methodCardTextSelected : null,
              ]}
            >
              {method.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {selectedMethod && (
        <>
          <View style={styles.selectionCard}>
            <View style={styles.bigSwitchRow}>
              <TouchableOpacity
                style={[styles.bigSwitchButton, !isPeriodic && styles.bigSwitchButtonActive]}
                onPress={() => setIsPeriodic(false)}
                activeOpacity={0.85}
              >
                <Text style={[styles.bigSwitchText, !isPeriodic && styles.bigSwitchTextActive]}>Unit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bigSwitchButton, isPeriodic && styles.bigSwitchButtonActive]}
                onPress={() => setIsPeriodic(true)}
                activeOpacity={0.85}
              >
                <Text style={[styles.bigSwitchText, isPeriodic && styles.bigSwitchTextActive]}>Periodic</Text>
              </TouchableOpacity>
            </View>
            {isPeriodic && (
              <>
                <View style={styles.frequencyRow}>
                  {frequencies.map((freq) => (
                    <TouchableOpacity
                      key={freq.key}
                      style={[
                        styles.frequencyButton,
                        selectedFrequency === freq.key && styles.frequencyButtonSelected,
                      ]}
                      onPress={() => setSelectedFrequency(freq.key)}
                      activeOpacity={0.85}
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
                <View style={styles.periodRow}>
                  {periods.map((period) => (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.periodButton,
                        selectedPeriod === period && styles.periodButtonSelected,
                      ]}
                      onPress={() => setSelectedPeriod(period)}
                      activeOpacity={0.85}
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
                  {(() => {
                    const numTests = Math.floor(periodSeconds[selectedPeriod] / frequencySeconds[selectedFrequency]);
                    return `Total tests: ${numTests}`;
                  })()}
                </Text>
              </>
            )}
          </View>
          <TouchableOpacity style={styles.runButton} onPress={() => {/* TODO: Implement run test */}} activeOpacity={0.85}>
            <Text style={styles.runButtonText}>Run</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafd',
    padding: 24,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#007AFF',
    letterSpacing: 0.5,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  methodCard: {
    flex: 0,
    width: 150,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 22,
    marginHorizontal: 6,
    shadowColor: '#007AFF',
    shadowOpacity: 0.10,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodCardSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    shadowOpacity: 0.18,
  },
  methodIcon: {
    marginBottom: 8,
  },
  methodCardText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  methodCardTextSelected: {
    color: '#fff',
  },
  selectionCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    shadowColor: '#007AFF',
    shadowOpacity: 0.10,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    alignItems: 'center',
  },
  bigSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 4,
  },
  bigSwitchButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 100,
    alignItems: 'center',
  },
  bigSwitchButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bigSwitchText: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  bigSwitchTextActive: {
    color: '#fff',
  },
  frequencyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  frequencyButton: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  frequencyButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  frequencyButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 16,
  },
  frequencyButtonTextSelected: {
    color: '#fff',
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 22,
  },
  periodButton: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  periodButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  periodButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 16,
  },
  periodButtonTextSelected: {
    color: '#fff',
  },
  testCountText: {
    marginTop: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  runButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 60,
    alignItems: 'center',
    marginTop: 24,
    alignSelf: 'center',
    shadowColor: '#007AFF',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  runButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 0.5,
  },
});

export default TestMain; 