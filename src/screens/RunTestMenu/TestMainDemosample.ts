import { LinkCheckRecord } from '../services/csvUtils';

export const demoSamples: LinkCheckRecord[] = [
  {
    time: new Date(Date.now() - 60000).toISOString(),
    mode: 0,
    gateways: 2,
    latitude: 48.8566,
    longitude: 2.3522,
    rx_rssi: -85,
    rx_snr: 7.2,
    tx_demod_margin: 1,
    tx_dr: 5,
    lost_packets: 0,
  },
  {
    time: new Date(Date.now() - 30000).toISOString(),
    mode: 0,
    gateways: 3,
    latitude: 48.8570,
    longitude: 2.3530,
    rx_rssi: -90,
    rx_snr: 6.8,
    tx_demod_margin: 1,
    tx_dr: 5,
    lost_packets: 1,
  },
  {
    time: new Date().toISOString(),
    mode: 0,
    gateways: 1,
    latitude: 48.8580,
    longitude: 2.3540,
    rx_rssi: -80,
    rx_snr: 8.0,
    tx_demod_margin: 1,
    tx_dr: 5,
    lost_packets: 0,
  },
]; 