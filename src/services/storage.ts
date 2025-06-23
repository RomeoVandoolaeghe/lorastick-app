import AsyncStorage from '@react-native-async-storage/async-storage';

const DEMO_MODE_KEY = 'demo_mode';
const DEVICE_BLE_STATUS_KEY = 'device_ble_status';

export type DemoModeStatus = 'enable' | 'disable';
export type DeviceBLEStatus = 'connected' | 'disconnected';

export const StorageService = {
  // Store demo mode setting
  setDemoMode: async (status: DemoModeStatus): Promise<void> => {
    try {
      await AsyncStorage.setItem(DEMO_MODE_KEY, status);
    } catch (error) {
      console.error('Error storing demo mode setting:', error);
    }
  },

  // Get demo mode setting
  getDemoMode: async (): Promise<DemoModeStatus> => {
    try {
      const value = await AsyncStorage.getItem(DEMO_MODE_KEY);
      return (value as DemoModeStatus) || 'disable';
    } catch (error) {
      console.error('Error retrieving demo mode setting:', error);
      return 'disable';
    }
  },

  // Check if demo mode is enabled
  isDemoModeEnabled: async (): Promise<boolean> => {
    const status = await StorageService.getDemoMode();
    return status === 'enable';
  },

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
  }
}; 