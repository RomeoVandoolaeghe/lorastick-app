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
//--------------------------------
// Setup serial and BLE
//--------------------------------
void setup() {
  Serial.begin(115200);

  delay(1000);
  Serial.println("RAK4631 prêt à recevoir ATC+TestLinkCheck ou ATC+GetFile");

  delay(100);

  uint8_t pin[] = "123456";
  api.ble.uart.setPIN(pin, 6);
  api.ble.uart.setPermission(RAK_SET_ENC_WITH_MITM);
  api.ble.uart.start(0);
}
//--------------------------------
// Immplemented BLE commands
//--------------------------------





/////////////handleGenlinkCheck()////////////////////////////
void handleGenlinkCheck() {
  Serial.println("BLE cmd: GenLinkCheck, generate 100 LinkChecks sample and send to app");

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
//--------------------------------
// not used ?







////////////////handleGetFile()////////////////////////////////
void handleGetFile() {
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



///////JoinStatus()///////////////////
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



///////////GetStatus()///////////////////////////
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



///////////// JoinRequest() command///////////////
void JoinRequest() {
  Serial.println("Tentative de join LoRaWAN (OTAA)...");

  // Vérification si le join est déjà effectué
  if (api.lorawan.njs.get()) {
    Serial.println("Déjà connecté au réseau LoRaWAN.");
    api.ble.uart.write((uint8_t*)"Already Joined\n");
  }

  //sinon on join
  else {
    Serial.println("Envoi de la requête de join...");
    //wait for Join success
    unsigned long startTime = millis(); 
    const unsigned long timeout = 20000; // 20 secondes pour le join sinon echec

    while (api.lorawan.njs.get() == 0 && (millis() - startTime < timeout)) {
      api.lorawan.join(); // Envoi de la requête de join
      delay(5000);
    }
    if (api.lorawan.njs.get()) {
      Serial.println("Join réussi !");
      api.ble.uart.write((uint8_t*)"Join Success\n", 14);
    } else {
      Serial.println("Échec du join.");
      api.ble.uart.write((uint8_t*)"Join Failed\n", 13);
    }
  }
}





//--------------------------------
// Main loop
//--------------------------------
void loop() {
  // Lecture des commandes BLE
  while (api.ble.uart.available()) {
    char c = api.ble.uart.read();

    if (c == '\n') {
      incoming.trim();  // Nettoie les \r et espaces

      if (incoming == "RUN Genlinkcheck") {
        handleGenlinkCheck();
      } else if (incoming == "RUN Getfile") {
        handleGetFile();
      } else if (incoming == "RUN GetStatus") {
        GetStatus();
      } else if (incoming == "RUN JoinStatus") {
        JoinStatus();
      } else if (incoming == "RUN JoinRequest") {
        JoinRequest();
      }

      else {
        Serial.println("Commande inconnue : " + incoming);
      }

      incoming = "";  // Réinitialisation
    } else {
      incoming += c;
    }
  }
}
