import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_BLE_STATUS_KEY = 'device_ble_status';
const LORAWAN_SETUP_KEY = 'lorawan_setup';

export type DeviceBLEStatus = 'connected' | 'disconnected';

export const StorageService = {
  // Store device BLE status
  setDeviceBLEStatus: async (status: DeviceBLEStatus): Promise<void> => {
    try {
      await AsyncStorage.setItem(DEVICE_BLE_STATUS_KEY, status);
    } catch (error) {
      console.error('Error storing device BLE status:', error);
    }
  },

  // Get device BLE status
  getDeviceBLEStatus: async (): Promise<DeviceBLEStatus> => {
    try {
      const value = await AsyncStorage.getItem(DEVICE_BLE_STATUS_KEY);
      return (value as DeviceBLEStatus) || 'disconnected';
    } catch (error) {
      console.error('Error retrieving device BLE status:', error);
      return 'disconnected';
    }
  },

  // Check if device is connected
  isDeviceConnected: async (): Promise<boolean> => {
    const status = await StorageService.getDeviceBLEStatus();
    return status === 'connected';
  },

  // Store LoRaWAN setup info
  setLoRaWANSetup: async (setup: object): Promise<void> => {
    try {
      await AsyncStorage.setItem(LORAWAN_SETUP_KEY, JSON.stringify(setup));
    } catch (error) {
      console.error('Error storing LoRaWAN setup:', error);
    }
  },

  // Get LoRaWAN setup info
  getLoRaWANSetup: async (): Promise<object | null> => {
    try {
      const value = await AsyncStorage.getItem(LORAWAN_SETUP_KEY);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error retrieving LoRaWAN setup:', error);
      return null;
    }
  }
}; 