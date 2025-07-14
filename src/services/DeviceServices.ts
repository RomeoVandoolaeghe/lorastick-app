import { Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { StorageService } from './storage';
import { getDemoModeValue } from '../common/DemoModeContext';
import { GetDataRateList, getSFfromDR, getDRfromSF, getMinSNRfromSF } from './lorawanspec';

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

/**--------------------------------------------------------------------------------
 * Run a Genlinkcheck to generate random linkcheck results on the stick 
 * Calls onResult with each LinkCheckRecord received.
 * Returns a cleanup function to remove the BLE subscription.
 */
export const runGenLinkCheck = async (
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

/**--------------------------------------------------------------------------------
 * Run a LinkCheck on the device using the 'RUN linkcheck <txPower> <dr>' command.
 * Calls onResult with each LinkCheckRecord received.
 * Returns a cleanup function to remove the BLE subscription.
 */
export const runLinkCheck = async (
  device: Device,
  txPower: number,
  dr: number,
  onResult: (result: any) => void
): Promise<() => void> => {
  if (getDemoModeValue()) {
    // Provide sample data for demo mode (hardcoded for EU868)
    const randomRssi = Math.floor(Math.random() * 41) - 90; // -90 to -50
    const randomSnr = Math.floor(Math.random() * 23) - 10; // -10 to +12
    const sampleResult = {
      time: new Date().toISOString(),
      gateways: 1,
      rx_rssi: randomRssi,
      rx_snr: randomSnr,
      tx_demod_margin: 20, // sample value
      tx_power: txPower,
      tx_dr: dr,
      tx_snr_calculated: -27.5, // sample value for EU868
    };
    onResult(sampleResult);
    return () => {};
  }
  if (!device) throw new Error('No device provided');
  const services = await device.services();
  const allChars = await Promise.all(
    services.map(s => device.characteristicsForService(s.uuid))
  );
  const characteristics = allChars.flat();
  const writeChar = characteristics.find(c => c.isWritableWithoutResponse);
  const notifyChar = characteristics.find(c => c.isNotifiable);
  if (!writeChar || !notifyChar) throw new Error('Caractéristiques non trouvées');

  async function getDeviceRegion(): Promise<string | undefined> {
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
        if (clean.startsWith('ERROR') || clean.startsWith('TIMEOUT')) {
          onResult({ error: clean });
          return;
        }
        // Format: <gateways>,<rssi>,<snr>,<demod>,TXP=<TXPower>,DR=<DataRate>
        // Example: 1,-60,11,21,TXP=22,DR=5
        const parts = clean.split(',');
        if (parts.length < 6) {
          onResult({ error: 'Malformed LINKCHECK response', raw: clean });
          return;
        }
        const gateways = Number(parts[0]);
        const rx_rssi = Number(parts[1]);
        const rx_snr = Number(parts[2]);
        const tx_demod_margin = Number(parts[3]);
        const txPowerStr = parts[4].trim();
        const drStr = parts[5].trim();
        const txPower = txPowerStr.startsWith('TXP=') ? Number(txPowerStr.replace('TXP=', '')) : undefined;
        const dr = drStr.startsWith('DR=') ? Number(drStr.replace('DR=', '')) : undefined;
        // Get region and SF for MinSNR lookup
        const region = await getDeviceRegion();
        const sf = (region && dr !== undefined) ? getSFfromDR(region, dr) : undefined;
        const minSNR = sf ? getMinSNRfromSF(sf) : undefined;
        const tx_snr_calculated = (minSNR !== undefined && tx_demod_margin !== undefined) ? minSNR - tx_demod_margin : undefined;
        const newResult = {
          time: new Date().toISOString(),
          mode: 0,
          gateways,
          latitude: 0, // not available in this response
          longitude: 0, // not available in this response
          rx_rssi,
          rx_snr,
          tx_demod_margin,
          tx_dr: typeof dr === 'number' ? dr : 0,
          tx_power: typeof txPower === 'number' ? txPower : 0,
          lost_packets: 0, // not available in this response
        };
        onResult(newResult);
      }
    }
  );

  await device.writeCharacteristicWithoutResponseForService(
    writeChar.serviceUUID,
    writeChar.uuid,
    Buffer.from(`RUN linkcheck ${txPower} ${dr}\n`, 'utf-8').toString('base64')
  );

  // Return cleanup function
  return () => subscription.remove();
};

export { GetDataRateList };