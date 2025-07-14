import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA', padding: 16 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 18, textAlign: 'center', color: '#222' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
    marginBottom: 2,
  },
  backButton: { marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  headerSelected: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    lineHeight: 28,
    marginBottom: 0,
  },
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
  runButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    marginHorizontal: 24,
    marginTop: 4,
    alignItems: 'center',
    elevation: 2,
  },
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
    marginBottom: 6,
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
  unitSubtitle: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
    textAlign: 'left',
    marginLeft: 40, // aligns with LinkCheck label after back arrow
    marginTop: 0,
    marginBottom: 0,
    letterSpacing: 0.5,
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
    marginTop: 4,
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
  // Chart legend styles for RSSI/SNR
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    marginLeft: 8,
  },
  legendSwatchRssi: {
    width: 18,
    height: 8,
    backgroundColor: '#007AFF', // RSSI bar color
    borderRadius: 2,
    marginRight: 4,
  },
  legendSwatchSnr: {
    width: 18,
    height: 4,
    backgroundColor: '#FF9500', // SNR line color
    borderRadius: 2,
    marginRight: 4,
  },
  modeZone: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 16,
    paddingRight: 16,
    marginHorizontal: 6,
    alignItems: 'center',
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 140,
    justifyContent: 'flex-start',
  },
  modeZoneTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    textAlign: 'center',
  },
  modeZoneDesc: {
    fontSize: 17,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
});

export default styles; 