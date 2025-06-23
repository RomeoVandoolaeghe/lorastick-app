import AsyncStorage from '@react-native-async-storage/async-storage';

const DEMO_MODE_KEY = 'demo_mode';

export type DemoModeStatus = 'enable' | 'disable';

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
  }
}; 