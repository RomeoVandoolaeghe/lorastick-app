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

  // Envoi d'un seul LinkCheck
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

  api.ble.uart.write((uint8_t *)payload.c_str(), payload.length());
  delay(20);

  Serial.println("✅ Envoi terminé");
}

////////////////handleGetFile()////////////////////////////////
void handleGetFile() {
  Serial.println("Commande reçue : envoi du fichier simulé");

  for (int i = 0; i < 100; i++) {
    String line = String(random(1, 5)) + "," + String(14.0 + random(0, 1000000) / 1000000.0, 6) + "," + String(121.0 + random(0, 1000000) / 1000000.0, 6) + "," + String(-1 * random(70, 120)) + "," + String(random(0, 10)) + "," + String(random(0, 32)) + "," + String(random(0, 10)) + "," + String(random(0, 3)) + "\n";

    api.ble.uart.write((uint8_t *)line.c_str(), line.length());
    delay(10);  // Ajustable
  }

  // Marque la fin du fichier
  String eof = "EOF\n";
  api.ble.uart.write((uint8_t *)eof.c_str(), eof.length());

  Serial.println("✅ Fichier simulé envoyé avec succès");
}

/////////////handleLinkCheckWithPower and data rate()////////////////////////////
void handleLinkCheckWithPower(int txPower, int dataRate) {
  Serial.print("BLE cmd: LinkCheck with TXPower ");
  Serial.print(txPower);
  Serial.print(", DataRate ");
  Serial.println(dataRate);

  // Set TX Power
  if (!api.lorawan.txp.set(txPower)) {
    Serial.println("Failed to set TX Power");
    String err = "+LINKCHECK: ERROR SETTING TXPOWER\n";
    api.ble.uart.write((uint8_t *)err.c_str(), err.length());
    return;
  }

  // Set Data Rate
  if (!api.lorawan.dr.set(dataRate)) {
    Serial.println("Failed to set Data Rate");
    String err = "+LINKCHECK: ERROR SETTING DATARATE\n";
    api.ble.uart.write((uint8_t *)err.c_str(), err.length());
    return;
  }

  // Set LinkCheck mode to once
  if (!api.lorawan.linkcheck.set(1)) {
    Serial.println("Failed to set LinkCheck mode");
    String err = "+LINKCHECK: ERROR SETTING LINKCHECK\n";
    api.ble.uart.write((uint8_t *)err.c_str(), err.length());
    return;
  }

  // Send a minimal uplink (dummy byte)
  // uint8_t payload[1] = {0x00};
  // if (!api.lorawan.send(1, payload, 1, false)) {
  //   Serial.println("Failed to send uplink for LinkCheck");
  //   String err = "+LINKCHECK: ERROR SENDING UPLINK\n";
  //   api.ble.uart.write((uint8_t *)err.c_str(), err.length());
  //   return;
  }

  // Wait for LinkCheck event (poll for a short period)
  unsigned long start = millis();
  const unsigned long timeout = 8000; // 8 seconds max
  bool gotLinkCheck = false;
  while (millis() - start < timeout) {
    // Check for LinkCheck event
    if (Serial.available()) {
      String evt = Serial.readStringUntil('\n');
      evt.trim();
      if (evt.startsWith("+EVT:LINKCHECK:")) {
        // Format: +EVT:LINKCHECK:Y0,Y1,Y2,Y3,Y4
        int y0, y1, y2, y3, y4;
        int parsed = sscanf(evt.c_str(), "+EVT:LINKCHECK:%d,%d,%d,%d,%d", &y0, &y1, &y2, &y3, &y4);
        if (parsed == 5 && y0 == 0) {
          // Success
          String payload = "+LINKCHECK: " + String(y2) + "," + String(y3) + "," + String(y4) + "," + String(y1) + ",TXP=" + String(txPower) + ",DR=" + String(dataRate) + "\n";
          api.ble.uart.write((uint8_t *)payload.c_str(), payload.length());
          Serial.println("✅ Real LinkCheck sent");
        } else {
          String err = "+LINKCHECK: ERROR LINKCHECK FAIL\n";
          api.ble.uart.write((uint8_t *)err.c_str(), err.length());
        }
        gotLinkCheck = true;
        break;
      }
    }
    delay(50);
  }
  if (!gotLinkCheck) {
    String err = "+LINKCHECK: TIMEOUT\n";
    api.ble.uart.write((uint8_t *)err.c_str(), err.length());
    Serial.println("❌ LinkCheck timeout");
  }
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

  api.ble.uart.write((uint8_t *)msg.c_str(), msg.length());
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
        if (buf[i] < 16)
          msg += "0";
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
        if (buf[i] < 16)
          msg += "0";
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
        if (buf[i] < 16)
          msg += "0";
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

  // === DR (Data Rate)
  int8_t dr = api.lorawan.dr.get();
  msg += "DR: ";
  msg += String(dr);
  msg += "\n";

  // === Region
  int region = api.lorawan.band.get();
  msg += "Region: ";
  msg += String(region);
  msg += "\n";

  // === Envoi BLE + affichage console
  api.ble.uart.write((uint8_t *)msg.c_str(), msg.length());
  Serial.print(msg);
}

///////////// JoinRequest() command///////////////
void JoinRequest() {
  Serial.println("Tentative de join LoRaWAN (OTAA)...");

  // Vérification si le join est déjà effectué
  if (api.lorawan.njs.get()) {
    Serial.println("Déjà connecté au réseau LoRaWAN.");
    api.ble.uart.write((uint8_t *)"Already Joined\n");
  }

  // sinon on join
  else {
    Serial.println("Envoi de la requête de join...");
    // wait for Join success
    unsigned long startTime = millis();
    const unsigned long timeout = 20000;  // 20 secondes pour le join sinon echec

    while (api.lorawan.njs.get() == 0 && (millis() - startTime < timeout)) {
      api.lorawan.join();  // Envoi de la requête de join
      delay(5000);
    }
    if (api.lorawan.njs.get()) {
      Serial.println("Join réussi !");
      api.ble.uart.write((uint8_t *)"Join Success\n", 14);
    } else {
      Serial.println("Échec du join.");
      api.ble.uart.write((uint8_t *)"Join Failed\n", 13);
    }
  }
}

/////////////GetMode() command///////////////
void GetMode() {
  api.lorawan.nwm.set();
  Serial.println("BLE cmd: GetMode");
  int mode = api.lora.nwm.get();
  Serial.println(mode);
  String response = "MODE=" + String(mode);  // ex: "MODE=1"
  api.ble.uart.write((uint8_t *)response.c_str(), response.length());
}


/////////////////GetP2P() command///////////////
void GetP2P() {
  uint32_t frequency = api.lora.pfreq.get();
  uint32_t spreadingFactor = api.lora.psf.get();
  uint32_t bandwidth = api.lora.pbw.get();
  uint32_t codingRate = api.lora.pcr.get();
  uint16_t preambleLength = api.lora.ppl.get();
  uint8_t power = api.lora.ptp.get();
  bool encryptionEnabled = api.lora.encry.get();
  uint32_t bitrate = api.lora.pbr.get();

  String Frequency = String(frequency);
  String SpreadingFactor = String(spreadingFactor);
  String Bandwidth = String(bandwidth);
  String CodingRate = String(codingRate);
  String PreambleLength = String(preambleLength);
  String Power = String(power);
  String EncryptionEnabled = encryptionEnabled ? "true" : "false";
  String Bitrate = String(bitrate);
  String response = "P2P: " + Frequency + "," + SpreadingFactor + "," + Bandwidth + "," + CodingRate + "," + PreambleLength + "," + Power + "," + EncryptionEnabled + "," + Bitrate + "\n";
  Serial.println("BLE cmd: GetP2P");
  Serial.println(response);
  api.ble.uart.write((uint8_t *)response.c_str(), response.length());
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
      } else if (incoming == "RUN SetLoRaWANMode") {
        GetMode();
      } else if (incoming == "RUN GetP2P"){
        GetP2P();
      } else if (incoming.startsWith("RUN LinkCheck ")) {
        // Parse TXPower and DataRate arguments
        int firstSpace = incoming.indexOf(' ', 14);
        int txPower = 0;
        int dataRate = 0;
        if (firstSpace > 0) {
          String txStr = incoming.substring(14, firstSpace);
          String drStr = incoming.substring(firstSpace + 1);
          txPower = txStr.toInt();
          dataRate = drStr.toInt();
        } else {
          txPower = incoming.substring(14).toInt();
          dataRate = 0; // default if not provided
        }
        handleLinkCheckWithPower(txPower, dataRate);
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
