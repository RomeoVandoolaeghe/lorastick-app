import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { Alert } from 'react-native';

export interface LinkCheckRecord {
  time: string;
  mode: number;
  gateways: number;
  latitude: number;
  longitude: number;
  rx_rssi: number;
  rx_snr: number;
  tx_demod_margin: number;
  tx_dr: number;
  lost_packets: number;
}

export const saveCSVToFile = async (linkcheckResults: LinkCheckRecord[]): Promise<string | null> => {
  if (!linkcheckResults.length) {
    Alert.alert('Aucun résultat', 'Aucune donnée à sauvegarder.');
    return null;
  }

  try {
    const headers = [
      '#', 'Time', 'Mode', 'Gateways', 'Latitude', 'Longitude',
      'RX_RSSI', 'RX_SNR', 'TX_DEMOD_MARGIN', 'TX_DR', 'LostPackets'
    ];
    const rows = linkcheckResults.map((res, i) => [
      i + 1, res.time, res.mode, res.gateways, res.latitude,
      res.longitude, res.rx_rssi, res.rx_snr, res.tx_demod_margin, res.tx_dr, res.lost_packets
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const filePath = `${RNFS.DownloadDirectoryPath}/linkcheck_results_${Date.now()}.csv`;

    await RNFS.writeFile(filePath, csvContent, 'utf8');
    Alert.alert('Succès', 'Fichier enregistré dans le dossier Téléchargements.');
    return filePath;
  } catch (e) {
    Alert.alert('Erreur', 'Impossible de sauvegarder le fichier.');
    return null;
  }
};

export const shareCSVFile = async (linkcheckResults: LinkCheckRecord[]) => {
  if (!linkcheckResults.length) {
    Alert.alert('Aucun résultat', 'Aucune donnée à sauvegarder.');
    return null;
  }

  try {
    const headers = [
      '#', 'Time', 'Mode', 'Gateways', 'Latitude', 'Longitude',
      'RX_RSSI', 'RX_SNR', 'TX_DEMOD_MARGIN', 'TX_DR', 'LostPackets'
    ];
    const rows = linkcheckResults.map((res, i) => [
      i + 1, res.time, res.mode, res.gateways, res.latitude,
      res.longitude, res.rx_rssi, res.rx_snr, res.tx_demod_margin, res.tx_dr, res.lost_packets
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const filePath = `${RNFS.CachesDirectoryPath}/linkcheck_temp_${Date.now()}.csv`;

    await RNFS.writeFile(filePath, csvContent, 'utf8');

    await Share.open({
      url: 'file://' + filePath,
      type: 'text/csv',
      title: 'Partager LinkCheck CSV',
      failOnCancel: false,
    });

    // Optionnel : supprimer le fichier après le partage
    // await RNFS.unlink(filePath);

  } catch (error) {
    console.error('Erreur partage CSV :', error);
    Alert.alert('Erreur', 'Impossible de partager le fichier.');
  }
}; 