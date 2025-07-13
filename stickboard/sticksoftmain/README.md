# sticksoftmain.ino BLE Command Reference

This document describes the BLE commands implemented in `sticksoftmain.ino` for the RAK4631 running RUI3 firmware. Each command is triggered via BLE UART and interacts with the LoRaWAN or P2P stack using the RAK API.

---

## Command List

### 1. RUN Genlinkcheck
**Description:**
- Generates a single simulated LinkCheck sample and sends it to the BLE app.
- The sample includes random values for gateways, latitude, longitude, RSSI, SNR, demod, TX data rate, and lost packets.
- **Returns:**
  - A BLE UART message in the format:
    ```
    +LINKCHECK: <gateways>,<latitude>,<longitude>,<rx_rssi>,<rx_snr>,<demod>,<tx_dr>,<lost_packets>\n
    Example: +LINKCHECK: 3,14.123456,121.654321,-85,7,12,5,1
    ```

### 2. RUN Getfile
**Description:**
- Sends 100 lines of simulated data (similar to LinkCheck samples) over BLE UART, followed by an "EOF" marker.
- **Returns:**
  - 100 lines of CSV-formatted data:
    ```
    <gateways>,<latitude>,<longitude>,<rx_rssi>,<rx_snr>,<demod>,<tx_dr>,<lost_packets>\n
    ...
    EOF\n
    ```

### 3. RUN GetStatus
**Description:**
- Retrieves and returns LoRaWAN device status, including DevEUI, AppEUI, AppKey, join status, **current DR (Data Rate)**, and **region**.
- Uses RAK API:
  - `api.lorawan.deui.get()`
  - `api.lorawan.appeui.get()`
  - `api.lorawan.appkey.get()`
  - `api.lorawan.njs.get()`
  - `api.lorawan.dr.get()` *(Data Rate)*
  - `api.lorawan.band.get()` *(Region)*
- **Returns:**
  - BLE UART message with:
    ```
    DevEUI: <hex>
    AppEUI: <hex>
    AppKey: <hex>
    Join Status: JOINED|NOT_JOINED
    DR: <number>
    Region: <number>
    ```
  - **DR**: The current LoRaWAN Data Rate (see RAK documentation for mapping to modulation parameters).
  - **Region**: The region code as defined by the RAK RUI3 API (see [RAK_LORA_BAND](https://docs.rakwireless.com/product-categories/software-apis-and-libraries/rui3/lorawan#rak_lora_band)).

### 4. RUN JoinStatus
**Description:**
- Checks if the device is joined to a LoRaWAN network.
- Uses RAK API: `api.lorawan.njs.get()`
- **Returns:**
  - BLE UART message:
    - `+STATUS:JOINED\n` or `+STATUS:NOT_JOINED\n`

### 5. RUN JoinRequest
**Description:**
- Attempts to join the LoRaWAN network using OTAA.
- If already joined, returns "Already Joined".
- Otherwise, sends join requests (using `api.lorawan.join()`) until joined or timeout (20s).
- Uses RAK API:
  - `api.lorawan.njs.get()`
  - `api.lorawan.join()`
- **Returns:**
  - BLE UART message:
    - `Join Success\n` if join successful
    - `Join Failed\n` if join fails
    - `Already Joined\n` if already joined

### 6. RUN SetLoRaWANMode
**Description:**
- Sets the device to LoRaWAN mode and returns the current network work mode.
- Uses RAK API:
  - `api.lorawan.nwm.set()` (set to LoRaWAN mode)
  - `api.lora.nwm.get()` (get current mode)
- **Returns:**
  - BLE UART message:
    - `MODE=<mode>` (e.g., `MODE=1` for LoRaWAN)
  - See [RAK_LORA_WORK_MODE](https://docs.rakwireless.com/product-categories/software-apis-and-libraries/rui3/lorawan#rak_lora_work_mode):
    - 0: P2P
    - 1: LoRaWAN
    - 2: FSK

### 7. RUN GetP2P
**Description:**
- Retrieves current LoRa P2P parameters: frequency, spreading factor, bandwidth, coding rate, preamble length, power, encryption, and bitrate.
- Uses RAK API:
  - `api.lora.pfreq.get()`
  - `api.lora.psf.get()`
  - `api.lora.pbw.get()`
  - `api.lora.pcr.get()`
  - `api.lora.ppl.get()`
  - `api.lora.ptp.get()`
  - `api.lora.encry.get()`
  - `api.lora.pbr.get()`
- **Returns:**
  - BLE UART message:
    - `P2P: <frequency>,<spreadingFactor>,<bandwidth>,<codingRate>,<preambleLength>,<power>,<encryptionEnabled>,<bitrate>\n`

### 8. RUN LinkCheck <TXPower> <DataRate>
**Description:**
- Sets the device TX power and data rate to the specified values using the RAK API.
- Triggers a real LoRaWAN LinkCheck MAC command and sends a minimal uplink.
- Waits for the network to respond with a real LinkCheck result, then sends this result to the BLE app.
- Uses RAK API:
  - `api.lorawan.txp.set(<TXPower>)` (set TX power)
  - `api.lorawan.dr.set(<DataRate>)` (set data rate)
  - `api.lorawan.linkcheck.set(1)` (trigger LinkCheck once)
  - `api.lorawan.send(...)` (send minimal uplink)
- **Returns:**
  - BLE UART message in the format:
    ```
    +LINKCHECK: <gateways>,<rssi>,<snr>,<demod>,TXP=<TXPower>,DR=<DataRate>\n
    Example: +LINKCHECK: 1,-60,11,21,TXP=22,DR=5
    ```
    - `<gateways>`: Number of gateways that received the uplink (from LinkCheck response)
    - `<rssi>`: RSSI reported by the network
    - `<snr>`: SNR reported by the network
    - `<demod>`: Demodulation margin (from LinkCheck response)
    - `<TXP>`: The TX power used for the uplink
    - `<DR>`: The data rate used for the uplink
  - If the LinkCheck fails or times out, returns:
    - `+LINKCHECK: ERROR LINKCHECK FAIL\n` or `+LINKCHECK: TIMEOUT\n`
- **Arguments:**
  - `<TXPower>`: Integer value for LoRaWAN TX power in dBm (see [RAK API](https://docs.rakwireless.com/product-categories/software-apis-and-libraries/rui3/lorawan/#set-11)).
  - `<DataRate>`: Integer value for LoRaWAN data rate (see [RAK API](https://docs.rakwireless.com/product-categories/software-apis-and-libraries/rui3/lorawan/#set-12)).

---

## References
- [RAK RUI3 LoRaWAN API Documentation](https://docs.rakwireless.com/product-categories/software-apis-and-libraries/rui3/lorawan)

---

## Notes
- **All commands currently take no parameters.** The command string itself (e.g., `RUN SetLoRaWANMode`) is all that is required.
- All commands are case-sensitive and must be terminated with a newline (`\n`).
- The BLE UART interface must be initialized and connected before sending commands.
- The device must be running RUI3 firmware compatible with the RAK API. 