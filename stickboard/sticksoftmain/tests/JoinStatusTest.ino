#include "Arduino.h"

String incoming = "";

void setup() {
  Serial.begin(115200);

  delay(1000);
  Serial.println("RAK4631 prêt à recevoir des commandes RUN");

  delay(100);

  uint8_t pin[] = "123456";
  api.ble.uart.setPIN(pin, 6);
  api.ble.uart.setPermission(RAK_SET_ENC_WITH_MITM);
  api.ble.uart.start(0);
}


//--------------------------------
// Immplemented JoinStatus() command
//--------------------------------

void JoinStatus() {
  Serial.println("BLE cmd: JoinStatus");

  bool isJoined = api.lorawan.njs.get();  // vérifie le statut réseau

  String msg;
  if (isJoined) {
    msg = "+STATUS:JOINED\n";
  } else {
    msg = "+STATUS:NOT_JOINED\n";
  }

  api.ble.uart.write((uint8_t*)msg.c_str(), msg.length());
}




void loop() {
  while (api.ble.uart.available()) {
    char c = api.ble.uart.read();
    if (c == '\n') {
      incoming.trim();  // ✨ Supprime les \r, espaces, etc.

      if (incoming == "RUN JoinStatus") {
        JoinStatus();
      } else {
        Serial.println("Commande inconnue : " + incoming);
      }
      incoming = "";  // Réinitialise la commande
    } else {
      incoming += c;
    }
  }
}
