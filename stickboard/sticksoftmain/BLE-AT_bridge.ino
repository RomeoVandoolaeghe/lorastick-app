//BLE-AT bridge
// This sketch allows the LoraStick to communicate with a BLE device using AT commands.
// It uses the RAKwireless AT commands to manage BLE connections and data transfer.

void setup() {
  Serial.begin(115200);                // Serial monitor at 115200 baud
  Serial6.begin(115200, RAK_AT_MODE);  // Serial6 for AT commands at 115200 baud

  api.ble.advertise.start(30); // Start advertising for 30 seconds for BLE connections
  Serial.println("BLE-AT bridge started. Waiting for BLE connection...");
}


void loop() {
  
}
