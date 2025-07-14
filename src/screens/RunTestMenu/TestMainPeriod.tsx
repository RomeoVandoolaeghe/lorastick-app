import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';

interface TestMainPeriodProps {
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  periods: string[];
  selectedFrequency: string;
  frequencySeconds: { [key: string]: number };
  periodSeconds: { [key: string]: number };
  handleRun: () => void;
  styles: any;
}

const TestMainPeriod: React.FC<TestMainPeriodProps> = ({
  selectedPeriod,
  setSelectedPeriod,
  periods,
  selectedFrequency,
  frequencySeconds,
  periodSeconds,
  handleRun,
  styles,
}) => {
  const totalTests = Math.floor(
    periodSeconds[selectedPeriod] / frequencySeconds[selectedFrequency]
  );

  const handlePressRun = () => {
    Alert.alert('Info', `Mode périodique : ${totalTests} tests seront exécutés.`);
    handleRun(); // appel de la fonction d'origine
  };

  return (
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
        Total tests: {totalTests}
      </Text>

      <TouchableOpacity
        style={styles.runButton}
        onPress={handlePressRun}
      >
        <Text style={styles.runButtonText}>Run</Text>
      </TouchableOpacity>
    </>
  );
};

export default TestMainPeriod;
