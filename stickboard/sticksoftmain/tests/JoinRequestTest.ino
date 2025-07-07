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
// Immplemented JoinRequest() command
//--------------------------------

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




void loop() {
  while (api.ble.uart.available()) {
    char c = api.ble.uart.read();
    if (c == '\n') {
      incoming.trim();  // ✨ Supprime les \r, espaces, etc.

      if (incoming == "RUN JoinRequest") {
        JoinRequest();
      } else {
        Serial.println("Commande inconnue : " + incoming);
      }
      incoming = "";  // Réinitialise la commande
    } else {
      incoming += c;
    }
  }
}
