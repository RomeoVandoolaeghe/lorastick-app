import RakTransmitPower from '../assets/RakTransmitPower.json';
import dataRateJsonRaw from '../assets/LoRaWANDataRatesbyRegion.json';
import LoRaMinSNR from '../assets/LoRaMinSNR.json';

export type PowerEntry = {
  id: string;
  value: number;
};

// --- RakTransmitPower ---
export function GetRakPowerList(region: string): PowerEntry[] {
  const regionData = (RakTransmitPower as Record<string, Record<string, number>>)[region];
  if (!regionData) return [];
  return Object.entries(regionData).map(([id, value]) => ({ id, value }));
}

// --- LoRaWANDataRatesbyRegion ---
const dataRateJson: Record<string, Array<{ data_rate: string, lora_sf: string, bit_rate: string }>> = dataRateJsonRaw;

/**
 * Get the list of possible data rates for a given region from the LoRaWANDataRatesbyRegion.json file.
 * @param region The region string (e.g., 'EU868', 'US915', etc.)
 * @returns Array of data rate objects: { data_rate: string, lora_sf: string, bit_rate: string }
 */
export const GetDataRateList = async (region: string): Promise<Array<{ data_rate: string, lora_sf: string, bit_rate: string }>> => {
  if (!region) return [];
  const normRegion = region.trim().toUpperCase();
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

// --- LoRaMinSNR ---
/**
 * Helper to get MinSNR for a given SF (number or string)
 */
export function getMinSNRfromSF(sf: string | number): number | undefined {
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