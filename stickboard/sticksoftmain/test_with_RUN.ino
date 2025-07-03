String bleBuffer = "";    // Pour stocker les messages reçus depuis le BLE
String usbResponse = "";  // Pour stocker la réponse venant du port USB
bool waitingForUsbReply = false;

void setup() {
  Serial.begin(115200);                // Port USB
  Serial6.begin(115200, RAK_AT_MODE);  // Port BLE en mode AT

  api.ble.advertise.start(30);  // Pub BLE en continu
  Serial.println("BLE-AT bridge started. Waiting for BLE connection...");
}

void loop() {
  // Lire depuis BLE
  while (Serial6.available()) {
    char c = Serial6.read();

    if (c == '\n' || c == '\r') {
      bleBuffer.trim();

      if (bleBuffer.startsWith("RUN ")) {
        // Interprétation de commande spéciale
        String arg = bleBuffer.substring(4);  // Extrait après "RUN "
        String atCmd = "AT+" + arg + "=?\r\n";
        Serial.println("utilisation d'une commande RUN")
        Serial.println(atCmd);  // Envoie sur port USB
        waitingForUsbReply = true;
        usbResponse = "";
      } else {
        // Transfert brut si c’est une vraie commande AT
        Serial.println(bleBuffer);
        Serial.println("utilisation d'une commande AT")
      }

      bleBuffer = "";
    } else {
      bleBuffer += c;
    }
  }

  // Lire la réponse depuis USB
  while (Serial.available()) {
    char c = Serial.read();
    usbResponse += c;

    // Fin typique de réponse AT : ligne vide ou \n après un OK ou ERROR
    if (c == '\n') {
      // Attendre que tout soit arrivé avant d'envoyer
      if (waitingForUsbReply) {
        Serial6.print(usbResponse);  // Réponse renvoyée vers BLE
        waitingForUsbReply = false;
        usbResponse = "";
      }
    }
  }

  // Transfert BLE ↔ USB pour toutes autres données
  // (si USB tape manuellement une commande AT, on la redirige vers BLE)
  while (Serial.available() && !waitingForUsbReply) {
    char c = Serial.read();
    Serial6.write(c);
  }

  while (Serial6.available() && !waitingForUsbReply) {
    char c = Serial6.read();
    Serial.write(c);
  }
}
