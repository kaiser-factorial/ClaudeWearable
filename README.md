# Claude Wearable

A wearable device that lets you interact with Claude AI through voice, and receive physical responses via LEDs, sound, haptics, and mechanical movement.

**Speak a question → Claude processes it → the wearable responds physically.**

```
[Voice Input] ──► [Phone / Laptop Bridge] ──► [Claude API] ──► [Physical Response]
                                                              LEDs · Sound · Servo · Haptics
```

---

## What It Does

Hold a button, ask Claude a question out loud, and the wearable responds:

| Response | Visual | Sound | Meaning |
|---|---|---|---|
| `GS` | 🟢 Green solid | Two ascending beeps | Yes, confident |
| `GP` | 🟢 Green pulse | Single soft tone | Yes, gentle |
| `GC` | 🟢 Green chase | Three-note rise | Yes, enthusiastic |
| `RS` | 🔴 Red solid | Two descending beeps | No, firm |
| `RF` | 🔴 Red flicker | Three rapid beeps | Warning / urgent |
| `YP` | 🟡 Yellow pulse | Warble | Uncertain / maybe |
| `BS` | 🔵 Blue glow | Single mid tone | Neutral info |

---

## Hardware

| Component | Purpose |
|---|---|
| [Adafruit Circuit Playground Bluefruit](https://www.adafruit.com/product/4333) | NeoPixel LEDs, speaker, BLE |
| SG90 micro servo | Reveal panel clamshell mechanism |
| LiPo battery | Wireless power for CPB |
| ESP32 DevKit *(Phase 3)* | Wireless audio input via WiFi |
| INMP441 I2S mic *(Phase 3)* | Voice capture on ESP32 |
| Vibration motors *(Phase 3)* | Haptic feedback |

---

## Getting Started

### Option A — Phone App *(recommended)*

The phone app replaces the laptop entirely — your phone handles the mic, speech-to-text, Claude API, and BLE.

**Requirements:**
- Node.js 18+
- Xcode (iOS) or Android Studio (Android)

```bash
cd phone-app
npm install
npx expo run:ios    # or run:android
```

1. Open the app → tap ⚙️ → enter your [Anthropic API key](https://console.anthropic.com)
2. Power on your CPB
3. Tap **Scan** — the app connects automatically
4. Hold the button, speak, release
5. Watch the NeoPixels respond

### Option B — Laptop Bridge

```bash
# Install dependencies (requires Python 3.10+ and ffmpeg)
brew install ffmpeg
pip3 install -r requirements.txt

# Set your API key
export ANTHROPIC_API_KEY="sk-ant-..."

# Run
python3 bridge.py
```

Press Enter to speak, or type a question directly.

---

## Project Structure

```
ClaudeWearable/
├── bridge.py              # Laptop bridge (Whisper + Claude API + BLE)
├── requirements.txt       # Python dependencies
├── cpb/
│   ├── code.py            # CPB firmware — BLE + LEDs + speaker
│   └── code_reveal.py     # CPB firmware — adds servo reveal panel
├── phone-app/             # React Native / Expo phone app
│   └── src/
│       ├── ble/           # BLE scanning + Nordic UART commands
│       ├── api/           # Claude API integration
│       ├── audio/         # Push-to-talk voice listener
│       ├── storage/       # Secure API key storage
│       └── screens/       # Home + Settings UI
└── docs/
    ├── overview.md        # Architecture and roadmap
    ├── hardware.md        # Wiring diagrams and component reference
    ├── phone-app.md       # Phone app deep dive
    ├── setup.md           # Full setup instructions
    └── session-log.md     # Dev log
```

---

## CPB Firmware Setup

1. Flash [CircuitPython 10.x](https://circuitpython.org/board/circuitplayground_bluefruit) onto the CPB
2. Copy `neopixel.mpy` and the `adafruit_ble/` folder from the [Adafruit bundle](https://github.com/adafruit/Adafruit_CircuitPython_Bundle/releases/latest) into `CIRCUITPY/lib/`
3. Copy `cpb/code.py` to `CIRCUITPY/code.py`
4. The CPB will advertise as `"Claude Wearable"` over BLE

See [`docs/hardware.md`](docs/hardware.md) for full wiring details.

---

## Roadmap

| Phase | Status | Description |
|---|---|---|
| 1 — USB Serial | ✅ Done | Laptop mic → Whisper → Claude → serial → CPB |
| 2 — BLE + Audio | ✅ Done | Wireless BLE, 7 response states, earcons |
| 3 — Enclosure + ESP32 | 🔄 In progress | 3D printed case, servo reveal panel, wireless mic |
| 4 — Wireless Audio | ⬜ Planned | ESP32 mic replaces laptop mic |
| 5 — Haptics | ⬜ Planned | Vibration motor feedback patterns |
| 6 — Camera Input | ⬜ Planned | Visual input to Claude via ESP32-CAM |
| 7 — Full Standalone | ⬜ Planned | Everything runs through the phone, no laptop |

---

## Docs

- [Project Overview](docs/overview.md)
- [Hardware Reference](docs/hardware.md)
- [Phone App](docs/phone-app.md)
- [Setup Guide](docs/setup.md)
- [Dev Log](docs/session-log.md)
