#include "Arduino.h"

String incoming = "";

void setup() {
  Serial.begin(115200);

  delay(1000);
  Serial.println("RAK4631 prêt à recevoir des commandes RUN");

  delay(100);

  api.ble.uart.start(0);
}


//--------------------------------
// Immplemented GetStatus() command
//--------------------------------

void GetStatus() {
  Serial.println("BLE cmd: GetStatus");

  String msg = "";

  // === DevEUI
  {
    uint8_t buf[8];
    uint8_t len = sizeof(buf);
    if (api.lorawan.deui.get(buf, len)) {
      msg += "DevEUI: ";
      for (int i = 0; i < len; i++) {
        if (buf[i] < 16) msg += "0";
        msg += String(buf[i], HEX);
      }
      msg += "\n";
    } else {
      msg += "Erreur DevEUI\n";
    }
  }

  // === AppEUI
  {
    uint8_t buf[8];
    uint8_t len = sizeof(buf);
    if (api.lorawan.appeui.get(buf, len)) {
      msg += "AppEUI: ";
      for (int i = 0; i < len; i++) {
        if (buf[i] < 16) msg += "0";
        msg += String(buf[i], HEX);
      }
      msg += "\n";
    } else {
      msg += "Erreur AppEUI\n";
    }
  }

  // === AppKey
  {
    uint8_t buf[16];
    uint8_t len = sizeof(buf);
    if (api.lorawan.appkey.get(buf, len)) {
      msg += "AppKey: ";
      for (int i = 0; i < len; i++) {
        if (buf[i] < 16) msg += "0";
        msg += String(buf[i], HEX);
      }
      msg += "\n";
    } else {
      msg += "Erreur AppKey\n";
    }
  }

  // === Join Status
  bool joined = api.lorawan.njs.get();
  msg += "Join Status: ";
  msg += (joined ? "JOINED" : "NOT_JOINED");
  msg += "\n";

  // === Envoi BLE + affichage console
  api.ble.uart.write((uint8_t*)msg.c_str(), msg.length());
  Serial.print(msg);
}






void loop() {
  while (api.ble.uart.available()) {
    char c = api.ble.uart.read();
    if (c == '\n') {
      incoming.trim();

      if (incoming == "RUN GetStatus") {
        GetStatus();
      } else {
        Serial.println("Commande inconnue : " + incoming);
      }
      incoming = "";  // Réinitialise la commande
    } else {
      incoming += c;
    }
  }
}
