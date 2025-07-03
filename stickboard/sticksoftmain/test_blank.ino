String bleBuffer = "";

void setup() {
  Serial.begin(115200);
  Serial6.begin(115200, RAK_AT_MODE);
  api.ble.advertise.start(30);
  Serial.println("BLE-AT bridge started.");
}

void loop() {

  
}
