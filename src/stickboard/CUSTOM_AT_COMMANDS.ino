#include "Arduino.h"

#include <Adafruit_TinyUSB.h>




void onJoinCallback(bool status);

// === Déclaration de la struct LinkCheckData ===
struct LinkCheckData {
  String time;
  int mode;
  int gateways;
  float latitude;
  float longitude;
  int rx_rssi;
  int rx_snr;
  int demod;
  int tx_dr;
  int lost_packets;
};

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("RAK4631 BLE ATC+JOIN with new API (RUI3)");

  // === Initialiser BLE UART en custom mode ===
  Serial6.begin(115200, RAK_CUSTOM_MODE);
  delay(100);

  uint8_t pin[] = "123456";
  api.ble.uart.setPIN(pin, 6);
  api.ble.uart.setPermission(RAK_SET_ENC_WITH_MITM);
  api.ble.uart.start(0);

  // === Configuration LoRa OTAA ===
  uint8_t devEUI[8] = { 0xAC, 0x1F, 0x09, 0xFF, 0xFE, 0x1C, 0xAF, 0x3F };
  uint8_t nodeAppEUI[8] = { 0xB2, 0x57, 0xE2, 0xBE, 0xDF, 0x09, 0xF9, 0xB1 };
  uint8_t nodeAppKey[16] = { 0x23, 0x89, 0xF6, 0x64, 0x18, 0x23, 0xF0, 0x8D,
                             0x1D, 0xC9, 0x3E, 0x7E, 0x47, 0x02, 0x30, 0xC9 };

  api.lorawan.deui.set(devEUI, 8);
  api.lorawan.appeui.set(nodeAppEUI, 8);
  api.lorawan.appkey.set(nodeAppKey, 16);

  api.lorawan.band.set(5);  // US915
  api.lorawan.deviceClass.set(0);
  api.lorawan.nwkskey.set(NULL, 0);
  api.lorawan.appskey.set(NULL, 0);
}

void sendLinkCheckData() {
  LinkCheckData data;
  data.time = "2025-06-20 14:00:00";
  data.mode = 0;
  data.gateways = random(1, 5);
  data.latitude = 14.0 + random(0, 1000000) / 1000000.0;
  data.longitude = 121.0 + random(0, 1000000) / 1000000.0;
  data.rx_rssi = -1 * random(70, 120);
  data.rx_snr = random(0, 10);
  data.demod = random(0, 32);
  data.tx_dr = random(0, 10);
  data.lost_packets = random(0, 3);

  String payload = String(data.gateways) + "," + String(data.latitude, 6) + "," + String(data.longitude, 6) + "," + String(data.rx_rssi) + "," + String(data.rx_snr) + "," + String(data.demod) + "," + String(data.tx_dr) + "," + String(data.lost_packets);

  int len = payload.length();
  uint8_t buffer[len];
  payload.getBytes(buffer, len + 1);

  bool result = api.lorawan.send(2, buffer, len, false);
  Serial.print("Send result: ");
  Serial.println(result ? "success" : "failure");

  String bleMsg = "+LINKCHECK:" + payload + "\n";
  api.ble.uart.write((uint8_t *)bleMsg.c_str(), bleMsg.length());
  Serial.print(bleMsg);
}

unsigned long lastLinkCheck = 0;

void loop() {
  static String bleBuffer = "";

  while (api.ble.uart.available()) {
    char c = api.ble.uart.read();
    if (c == '\r' || c == '\n') {
      if (bleBuffer.length() > 0) {
        processBLECommand(bleBuffer);
        bleBuffer = "";
      }
    } else {
      bleBuffer += c;
    }
  }

  if (millis() - lastLinkCheck > 10000) {
    sendLinkCheckData();
    lastLinkCheck = millis();
  }
}

int getActiveSubband(uint16_t mask[16]) {
  for (int i = 0; i < 16; i++) {
    if (mask[i] != 0x0000) {
      for (int b = 0; b < 16; b++) {
        if (mask[i] & (1 << b)) {
          return i * 16 + b;
        }
      }
    }
  }
  return -1;
}

void processBLECommand(String cmd) {
  cmd.trim();
  Serial.println("BLE received: " + cmd);

  if (cmd == "ATC+JOIN") {
    api.ble.uart.write((uint8_t *)"\u2192 Joining...\n", 13);
    Serial.println("\u2192 Sending OTAA Join request...");
    api.lorawan.join();
  } else if (cmd == "ATC+GetStatus") {
    uint8_t band = api.lorawan.band.get();
    String bandName;
    switch (band) {
      case 5: bandName = "US915"; break;
      default: bandName = "UNKNOWN"; break;
    }
    String msg = "+STATUS:BAND=" + bandName + "\n";
    api.ble.uart.write((uint8_t *)msg.c_str(), msg.length());
    Serial.print(msg);
  } else if (cmd == "ATC+LinkCheck") {
    sendLinkCheckData();
  } else {
    String msg = "Unknown command: " + cmd + "\n";
    api.ble.uart.write((uint8_t *)msg.c_str(), msg.length());
  }
}

void onJoinCallback(bool status) {
  String msg = status ? "+EVT:JOINED\n" : "+EVT:JOIN_FAILED\n";
  api.ble.uart.write((uint8_t *)msg.c_str(), msg.length());
  Serial.print(msg);
}
