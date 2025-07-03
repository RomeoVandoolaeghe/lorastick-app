void setup() {
  Serial.begin(115200);                // Pour affichage debug sur port USB
  Serial6.begin(115200, RAK_AT_MODE);  // BLE en mode AT

  // Démarrer la publicité BLE pour permettre la connexion
  api.ble.advertise.start(30);  
  Serial.println("BLE-AT bridge started. Waiting for BLE connection...");
}

void loop() {
  // Si des données viennent de BLE (client connecté), on les affiche sur Serial USB
  while (Serial6.available()) {
    char c = Serial6.read();
    Serial.write(c);  // Affiche les données sur l'USB
  }

  // Si des données sont envoyées depuis le port USB, on les renvoie vers BLE (AT)
  while (Serial.available()) {
    char c = Serial.read();
    Serial6.write(c);  // Envoie vers le client BLE
  }
}
