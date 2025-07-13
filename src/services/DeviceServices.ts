import { Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { StorageService } from './storage';
import { getDemoModeValue } from '../common/DemoModeContext';
import dataRateJsonRaw from '../assets/LoRaWANDataRatesbyRegion.json';

const dataRateJson: Record<string, Array<{ data_rate: string, lora_sf: string, bit_rate: string }>> = dataRateJsonRaw;

export const checkLoraMode = async (device: Device): Promise<string | undefined> => {
  if (!device) return;
  const services = await device.services();
  const allChars = await Promise.all(
    services.map(s => device.characteristicsForService(s.uuid))
  );
  const characteristics = allChars.flat();
  const writeChar = characteristics.find(c => c.isWritableWithoutResponse);
  const notifyChar = characteristics.find(c => c.isNotifiable);
  if (!writeChar || !notifyChar) return;
  return new Promise<string>((resolve, reject) => {
    const subscription = device.monitorCharacteristicForService(
      notifyChar.serviceUUID,
      notifyChar.uuid,
      (error, characteristic) => {
        if (error || !characteristic?.value) {
          subscription.remove();
          return reject(error);
        }
        const decoded = Buffer.from(characteristic.value, 'base64').toString('utf-8');
        if (decoded.startsWith('MODE=')) {
          const mode = decoded.split('=')[1].trim();
          subscription.remove();
          resolve(mode);
        }
      }
    );
    device.writeCharacteristicWithoutResponseForService(
      writeChar.serviceUUID,
      writeChar.uuid,
      Buffer.from('RUN Mode\n', 'utf-8').toString('base64')
    );
  });
};

export const GetLoRaWANsetup = async (device: Device | null): Promise<{ devEUI: string; appEUI: string; appKey: string; joinStatus: string; dr: number; region: string } | undefined> => {
  if (getDemoModeValue()) {
    const demoObj = {
      devEUI: '70B3D57ED0001234',
      appEUI: '70B3D57ED0005678',
      appKey: '8D7F6E5D4C3B2A190817161514131211',
      joinStatus: 'JOINED',
      dr: 2,
      region: 'EU868',
    };
    await StorageService.setLoRaWANSetup(demoObj);
    return demoObj;
  }
  if (!device) return;
  const services = await device.services();
  const allChars = await Promise.all(
    services.map(s => device.characteristicsForService(s.uuid))
  );
  const characteristics = allChars.flat();
  const writeChar = characteristics.find(c => c.isWritableWithoutResponse);
  const notifyChar = characteristics.find(c => c.isNotifiable);
  if (!writeChar || !notifyChar) return;
  return new Promise<{ devEUI: string; appEUI: string; appKey: string; joinStatus: string; dr: number; region: string }>((resolve, reject) => {
    const subscription = device.monitorCharacteristicForService(
      notifyChar.serviceUUID,
      notifyChar.uuid,
      async (error, characteristic) => {
        if (error || !characteristic?.value) {
          subscription.remove();
          return reject(error);
        }
        const decoded = Buffer.from(characteristic.value, 'base64').toString('utf-8');
        // Parse fields from decoded string
        const info: any = {};
        const lines = decoded.split('\n');
        lines.forEach(line => {
          if (line.startsWith('DevEUI:')) info.devEUI = line.replace('DevEUI:', '').trim();
          if (line.startsWith('AppEUI:')) info.appEUI = line.replace('AppEUI:', '').trim();
          if (line.startsWith('AppKey:')) info.appKey = line.replace('AppKey:', '').trim();
          if (line.startsWith('Join Status:')) info.joinStatus = line.replace('Join Status:', '').trim();
          if (line.startsWith('DR:')) info.dr = parseInt(line.replace('DR:', '').trim(), 10);
          if (line.startsWith('Region:')) info.region = line.replace('Region:', '').trim();
        });
        await StorageService.setLoRaWANSetup(info);
        subscription.remove();
        resolve(info);
      }
    );
    device.writeCharacteristicWithoutResponseForService(
      writeChar.serviceUUID,
      writeChar.uuid,
      Buffer.from('RUN GetStatus\n', 'utf-8').toString('base64')
    );
  });
};

/**
 * Get the list of possible data rates for a given region from the LoRaWANDataRatesbyRegion.json file.
 * @param region The region string (e.g., 'EU868', 'US915', etc.)
 * @returns Array of data rate objects: { data_rate: string, lora_sf: string, bit_rate: string }
 */
export const GetDataRateList = async (region: string): Promise<Array<{ data_rate: string, lora_sf: string, bit_rate: string }>> => {
  if (!region) return [];
  const normRegion = region.trim().toUpperCase();
  // Try exact match, fallback to empty array
  return dataRateJson[normRegion] || [];
};

// The following are stubs for runUnitTest, startRealtimeMode, stopRealtimeMode
// These should be refactored as hooks or pure functions in your app context, as they depend on state and subscriptions.
// You can move the core BLE logic here and keep state management in the component. 