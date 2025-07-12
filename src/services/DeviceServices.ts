import { Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { StorageService } from './storage';

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

export const GetLoRaWANsetup = async (device: Device): Promise<object | undefined> => {
  if (!device) return;
  const services = await device.services();
  const allChars = await Promise.all(
    services.map(s => device.characteristicsForService(s.uuid))
  );
  const characteristics = allChars.flat();
  const writeChar = characteristics.find(c => c.isWritableWithoutResponse);
  const notifyChar = characteristics.find(c => c.isNotifiable);
  if (!writeChar || !notifyChar) return;
  return new Promise<object>((resolve, reject) => {
    const subscription = device.monitorCharacteristicForService(
      notifyChar.serviceUUID,
      notifyChar.uuid,
      async (error, characteristic) => {
        if (error || !characteristic?.value) {
          subscription.remove();
          return reject(error);
        }
        const decoded = Buffer.from(characteristic.value, 'base64').toString('utf-8');
        // Example expected: 'GetStatus: ...' or similar
        if (decoded.startsWith('GetStatus')) {
          // Parse the LoRaWAN setup info from the decoded string
          // This parsing logic may need to be adjusted to match actual device response
          const setupInfo = { raw: decoded };
          await StorageService.setLoRaWANSetup(setupInfo);
          subscription.remove();
          resolve(setupInfo);
        }
      }
    );
    device.writeCharacteristicWithoutResponseForService(
      writeChar.serviceUUID,
      writeChar.uuid,
      Buffer.from('RUN GetStatus\n', 'utf-8').toString('base64')
    );
  });
};

// The following are stubs for runUnitTest, startRealtimeMode, stopRealtimeMode
// These should be refactored as hooks or pure functions in your app context, as they depend on state and subscriptions.
// You can move the core BLE logic here and keep state management in the component. 