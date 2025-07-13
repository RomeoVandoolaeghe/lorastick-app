import { Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { StorageService } from './storage';
import { getDemoModeValue } from '../common/DemoModeContext';
import dataRateJsonRaw from '../assets/LoRaWANDataRatesbyRegion.json';
import LoRaMinSNR from '../assets/LoRaMinSNR.json';

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
//------------------------------------------------------------------
// RUN 
export const GetLoRaWANsetup = async (device: Device | null): Promise<{ devEUI: string; appEUI: string; appKey: string; joinStatus: string; dr: number; region: string; SF: string } | undefined> => {
  if (getDemoModeValue()) {
    const demoObj = {
      devEUI: '70B3D57ED0001234',
      appEUI: '70B3D57ED0005678',
      appKey: '8D7F6E5D4C3B2A190817161514131211',
      joinStatus: 'JOINED',
      dr: 2,
      region: 'EU868',
      SF: '', // will be set below
    };
    // Set SF based on DR and region
    demoObj.SF = getSFfromDR(demoObj.region, demoObj.dr) || '';
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
  return new Promise<{ devEUI: string; appEUI: string; appKey: string; joinStatus: string; dr: number; region: string; SF: string }>((resolve, reject) => {
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
        // Set SF based on DR and region
        info.SF = getSFfromDR(info.region, info.dr) || '';
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

/**
 * Get the Spreading Factor (SF) string (e.g., 'SF8') for a given region and data rate (DR).
 * @param region The region string (e.g., 'EU868', 'US915', etc.)
 * @param dr The data rate (number or string)
 * @returns The SF string (e.g., 'SF8'), or undefined if not found
 */
export function getSFfromDR(region: string, dr: number | string): string | undefined {
  if (!region || dr === undefined || dr === null) return undefined;
  const normRegion = region.trim().toUpperCase();
  const drList = dataRateJson[normRegion];
  if (!drList) return undefined;
  const drEntry = drList.find(entry => entry.data_rate === dr.toString());
  if (!drEntry) return undefined;
  // lora_sf is like 'SF8 / 125 kHz', so extract 'SF8'
  return drEntry.lora_sf.split(' ')[0];
}

/**
 * Get the Data Rate (DR) number for a given region and Spreading Factor (SF) string (e.g., 'SF8').
 * @param region The region string (e.g., 'EU868', 'US915', etc.)
 * @param sf The SF string (e.g., 'SF8')
 * @returns The DR number (as string), or undefined if not found
 */
export function getDRfromSF(region: string, sf: string): string | undefined {
  if (!region || !sf) return undefined;
  const normRegion = region.trim().toUpperCase();
  const drList = dataRateJson[normRegion];
  if (!drList) return undefined;
  const drEntry = drList.find(entry => entry.lora_sf.split(' ')[0] === sf);
  if (!drEntry) return undefined;
  return drEntry.data_rate;
}

/**
 * Helper to get MinSNR for a given SF (number or string)
 */
function getMinSNRfromSF(sf: string | number): number | undefined {
  // SF may be 'SF8' or 8
  let sfNum: number | undefined = undefined;
  if (typeof sf === 'string') {
    if (sf.startsWith('SF')) {
      sfNum = parseInt(sf.replace('SF', ''), 10);
    } else {
      sfNum = parseInt(sf, 10);
    }
  } else {
    sfNum = sf;
  }
  const entry = (LoRaMinSNR as Array<{ SF: number; MinSNR: number }>).find(e => e.SF === sfNum);
  return entry ? entry.MinSNR : undefined;
}

/**
 * Run a LinkCheck unit test on the device. Calls onResult with each LinkCheckRecord received.
 * Returns a cleanup function to remove the BLE subscription.
 */
export const runUnitTest = async (
  device: Device,
  onResult: (result: any) => void
): Promise<() => void> => {
  if (!device) throw new Error('No device provided');
  const services = await device.services();
  const allChars = await Promise.all(
    services.map(s => device.characteristicsForService(s.uuid))
  );
  const characteristics = allChars.flat();
  const writeChar = characteristics.find(c => c.isWritableWithoutResponse);
  const notifyChar = characteristics.find(c => c.isNotifiable);
  if (!writeChar || !notifyChar) throw new Error('Caractéristiques non trouvées');

  // Helper to get region from device or context
  // You may need to adjust this to get the correct region for your device
  async function getDeviceRegion(): Promise<string | undefined> {
    // Try to get from storage (as in GetLoRaWANsetup)
    const setupRaw = await (StorageService.getLoRaWANSetup?.() ?? undefined);
    const setup: { region?: string } | undefined = (setupRaw && typeof setupRaw === 'object') ? setupRaw as { region?: string } : undefined;
    return setup?.region;
  }

  const subscription = device.monitorCharacteristicForService(
    notifyChar.serviceUUID,
    notifyChar.uuid,
    async (error, characteristic) => {
      if (error || !characteristic?.value) return;
      const decoded = Buffer.from(characteristic.value, 'base64').toString('utf-8');
      if (decoded.startsWith('+LINKCHECK:')) {
        const clean = decoded.trim().replace('+LINKCHECK: ', '');
        const [gateways, latitude, longitude, rx_rssi, rx_snr, tx_demod_margin, tx_dr, lost_packets] = clean.split(',').map(Number);
        // Get region and SF for MinSNR lookup
        const region = await getDeviceRegion();
        const sf = region ? getSFfromDR(region, tx_dr) : undefined;
        const minSNR = sf ? getMinSNRfromSF(sf) : undefined;
        const tx_snr_calculated = (minSNR !== undefined && tx_demod_margin !== undefined) ? minSNR - tx_demod_margin : undefined;
        const newResult = {
          time: new Date().toISOString(),
          mode: 0,
          gateways,
          latitude,
          longitude,
          rx_rssi,
          rx_snr,
          tx_demod_margin,
          tx_dr,
          lost_packets,
          tx_snr_calculated,
        };
        onResult(newResult);
      }
    }
  );

  await device.writeCharacteristicWithoutResponseForService(
    writeChar.serviceUUID,
    writeChar.uuid,
    Buffer.from('RUN Genlinkcheck\n', 'utf-8').toString('base64')
  );

  // Return cleanup function
  return () => subscription.remove();
};

// The following are stubs for runUnitTest, startRealtimeMode, stopRealtimeMode
// These should be refactored as hooks or pure functions in your app context, as they depend on state and subscriptions.
// You can move the core BLE logic here and keep state management in the component. 