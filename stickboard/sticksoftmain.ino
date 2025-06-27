#include "Arduino.h"

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

String incoming = "";
bool testTriggered = false;
bool fileRequested = false;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("RAK4631 prêt à recevoir ATC+TestLinkCheck ou ATC+GetFile");

  Serial6.begin(115200, RAK_CUSTOM_MODE);
  delay(100);

  uint8_t pin[] = "123456";
  api.ble.uart.setPIN(pin, 6);
  api.ble.uart.setPermission(RAK_SET_ENC_WITH_MITM);
  api.ble.uart.start(0);
}

void loop() {
  // Lecture des commandes BLE
  while (api.ble.uart.available()) {
    char c = api.ble.uart.read();
    if (c == '\n') {
      if (incoming == "RUN Testlinkcheck") {
        testTriggered = true;
      } else if (incoming == "RUN Getfile") {
        fileRequested = true;
      }
      incoming = "";
    } else {
      incoming += c;
    }
  }

  // === Envoi des 100 LinkChecks ===
  if (testTriggered) {
    testTriggered = false;
    Serial.println("Commande reçue : génération de 100 LinkChecks");

    for (int i = 0; i < 100; i++) {
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

      String payload = "+LINKCHECK: " + String(data.gateways) + "," + String(data.latitude, 6) + "," + String(data.longitude, 6) + "," + String(data.rx_rssi) + "," + String(data.rx_snr) + "," + String(data.demod) + "," + String(data.tx_dr) + "," + String(data.lost_packets) + "\n";

      api.ble.uart.write((uint8_t*)payload.c_str(), payload.length());
      delay(20);
    }

    Serial.println("✅ Envoi terminé");
  }

  // === Envoi du fichier simulé ===
  if (fileRequested) {
    fileRequested = false;
    Serial.println("Commande reçue : envoi du fichier simulé");

    

    for (int i = 0; i < 100; i++) {
      String line = String(random(1, 5)) + "," + String(14.0 + random(0, 1000000) / 1000000.0, 6) + "," + String(121.0 + random(0, 1000000) / 1000000.0, 6) + "," + String(-1 * random(70, 120)) + "," + String(random(0, 10)) + "," + String(random(0, 32)) + "," + String(random(0, 10)) + "," + String(random(0, 3)) + "\n";

      api.ble.uart.write((uint8_t*)line.c_str(), line.length());
      delay(10);  // Ajustable
    }

    // Marque la fin du fichier
    String eof = "EOF\n";
    api.ble.uart.write((uint8_t*)eof.c_str(), eof.length());

    Serial.println("✅ Fichier simulé envoyé avec succès");
  }
}
