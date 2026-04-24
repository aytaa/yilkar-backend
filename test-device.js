/**
 * Fake ESP32 device — MQTT bağlantı testi
 * node test-device.js [serial_no]
 */

const mqtt = require('mqtt');

const SERIAL        = process.argv[2] || 'YH5-00001';
const DEVICE_SECRET = process.env.DEVICE_SECRET || 'yilkar_device_secret_2024';
const BROKER_URL    = process.env.MQTT_URL || 'mqtt://localhost:1883';

const TELEMETRY_TOPIC = `yilkar/d2s/monitoring/${SERIAL}`;
const COMMAND_TOPIC   = `yilkar/s2d/main_settings/${SERIAL}`;
const STATUS_TOPIC    = `yilkar/devices/${SERIAL}/status`;

console.log(`\n[DEVICE] Seri No : ${SERIAL}`);
console.log(`[DEVICE] Broker  : ${BROKER_URL}`);
console.log(`[DEVICE] Bağlanıyor...\n`);

const client = mqtt.connect(BROKER_URL, {
  clientId: `esp32_${SERIAL.replace(/[^a-zA-Z0-9]/g, '')}`,
  username: SERIAL,
  password: DEVICE_SECRET,
  clean:    true,
  will: {
    topic:   STATUS_TOPIC,
    payload: 'offline',
    qos:     1,
    retain:  true,
  },
});

client.on('connect', () => {
  console.log('[DEVICE] ✅ Bağlantı kuruldu!\n');

  client.publish(STATUS_TOPIC, 'online', { qos: 1, retain: true });

  client.subscribe(COMMAND_TOPIC, { qos: 1 }, (err) => {
    if (err) console.error('[DEVICE] Subscribe hatası:', err.message);
    else console.log(`[DEVICE] 📡 Dinleniyor: ${COMMAND_TOPIC}`);
  });

  let tick = 0;
  const interval = setInterval(() => {
    tick++;
    const roomTemp  = +(20 + Math.random() * 5).toFixed(1);
    const flameTemp = +(650 + Math.random() * 100).toFixed(0);
    const fanSpeed  = Math.floor(800 + Math.random() * 400);

    const payload = {
      RoomTemp:     roomTemp,
      SetTemp:      22,
      FlameTemp:    +flameTemp,
      BlowTemp:     +(roomTemp + 15).toFixed(1),
      FanSpeed:     fanSpeed,
      CANCommand:   1,
      CanComSwitch: 1,
      FanLSel:      2,
      HeatLSel:     3,
      ErrCodes:     0,
      HeatModes:    1,
      SysVolt:      12.4,
    };

    client.publish(TELEMETRY_TOPIC, JSON.stringify(payload), { qos: 0 });
    console.log(`[DEVICE] 📤 Telemetri #${tick} → oda:${roomTemp}°C alev:${flameTemp}°C fan:${fanSpeed}rpm`);

    if (tick >= 10) {
      console.log('\n[DEVICE] 10 paket gönderildi, bağlantı kapatılıyor...');
      clearInterval(interval);
      client.publish(STATUS_TOPIC, 'offline', { qos: 1, retain: true }, () => {
        client.end();
      });
    }
  }, 3000);
});

client.on('message', (topic, payload) => {
  try {
    const cmd = JSON.parse(payload.toString());
    console.log(`\n[DEVICE] 📥 Komut → power:${cmd.power} set_temp:${cmd.set_temp}°C\n`);
  } catch {
    console.log(`[DEVICE] 📥 Mesaj: ${payload.toString()}`);
  }
});

client.on('error', (err) => {
  console.error(`[DEVICE] ❌ ${err.message}`);
  if (err.message.toLowerCase().includes('not authorized')) {
    console.error('[DEVICE] → Cihaz whitelist\'te değil. Admin panelinden kabul edin.\n');
  }
});

client.on('close', () => {
  console.log('[DEVICE] Bağlantı kapandı.');
  process.exit(0);
});
