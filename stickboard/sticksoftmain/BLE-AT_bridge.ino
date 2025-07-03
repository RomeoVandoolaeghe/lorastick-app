void setup() {
  Serial.begin(115200);                // Pour affichage debug sur port USB
  Serial6.begin(115200, RAK_AT_MODE);  // BLE en mode AT

  // Démarrer la publicité BLE pour permettre la connexion
  api.ble.advertise.start(30);
  Serial.println("BLE-AT bridge started. Waiting for BLE connection...");
}

void loop() {

}
