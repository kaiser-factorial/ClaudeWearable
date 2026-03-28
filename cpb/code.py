"""
Claude Wearable — Circuit Playground Bluefruit (Phase 2: BLE + Animations)
Receives a 2-byte command over BLE UART and responds with a NeoPixel
animation + speaker earcon.

Button A = toggle voice: first press sends "VS" (start listening),
second press sends "VP" (stop & send to Claude).

Commands (phone → CPB):
    GS — green solid   (yes, confident)
    GP — green pulse   (yes, gentle)
    GC — green chase   (yes, enthusiastic)
    RS — red solid     (no, firm)
    RF — red flicker   (warning / urgent)
    YP — yellow pulse  (uncertain)
    BS — blue solid    (neutral info)

Signals (CPB → phone):
    VS — voice start (button A toggle on)
    VP — voice stop  (button A toggle off)
"""

import array
import math
import random
import time
import board
import digitalio
import neopixel
import audiopwmio
import audiocore
import adafruit_ble
from adafruit_ble.advertising.standard import ProvideServicesAdvertisement
from adafruit_ble.services.nordic import UARTService

# ── Config ─────────────────────────────────────────────────────────────────────

NUM_PIXELS  = 10
SAMPLE_RATE = 8000
FRAME_RATE  = 0.04   # seconds per animation frame (~25fps)

COLORS = {
    "G": (0, 200, 0),
    "R": (200, 0, 0),
    "Y": (200, 140, 0),
    "B": (0, 80, 200),
}

OFF = (0, 0, 0)

# Each response: (color_key, animation, [(freq_hz, duration_s), ...])
RESPONSES = {
    b"GS": ("G", "solid",   [(880, 0.1), (1320, 0.15)]),
    b"GP": ("G", "pulse",   [(880, 0.25)]),
    b"GC": ("G", "chase",   [(880, 0.08), (1100, 0.08), (1320, 0.12)]),
    b"RS": ("R", "solid",   [(440, 0.15), (220, 0.2)]),
    b"RF": ("R", "flicker", [(300, 0.07), (300, 0.07), (300, 0.1)]),
    b"YP": ("Y", "pulse",   [(600, 0.1), (550, 0.12)]),
    b"BS": ("B", "solid",   [(660, 0.2)]),
}

# ── Hardware setup ─────────────────────────────────────────────────────────────

pixels = neopixel.NeoPixel(
    board.NEOPIXEL, NUM_PIXELS,
    brightness=0.3,
    auto_write=False
)
pixels.fill(OFF)
pixels.show()

speaker_enable = digitalio.DigitalInOut(board.SPEAKER_ENABLE)
speaker_enable.direction = digitalio.Direction.OUTPUT
speaker_enable.value = True
audio = audiopwmio.PWMAudioOut(board.SPEAKER)

# Push-to-talk button (Button A on CPB)
button_a = digitalio.DigitalInOut(board.BUTTON_A)
button_a.direction = digitalio.Direction.INPUT
button_a.pull = digitalio.Pull.DOWN
button_a_prev = False  # track previous state for edge detection

# ── Sound ──────────────────────────────────────────────────────────────────────

def play_earcon(notes):
    for freq, dur in notes:
        n = max(2, SAMPLE_RATE // freq)
        wave = array.array("H", [
            int((math.sin(2 * math.pi * i / n) + 1) * 32767)
            for i in range(n)
        ])
        audio.play(audiocore.RawSample(wave, sample_rate=SAMPLE_RATE), loop=True)
        time.sleep(dur)
    audio.stop()

# ── Animation ──────────────────────────────────────────────────────────────────

def update_animation(frame, color, anim):
    if anim == "solid":
        pixels.brightness = 0.3
        pixels.fill(color)

    elif anim == "pulse":
        b = 0.05 + 0.3 * (0.5 + 0.5 * math.sin(frame * 0.15))
        pixels.brightness = b
        pixels.fill(color)

    elif anim == "chase":
        pixels.fill(OFF)
        head = frame % NUM_PIXELS
        pixels.brightness = 0.6
        pixels[head] = color
        pixels[(head - 1) % NUM_PIXELS] = tuple(c // 3 for c in color)
        pixels[(head - 2) % NUM_PIXELS] = tuple(c // 9 for c in color)

    elif anim == "flicker":
        pixels.brightness = 0.25 + random.random() * 0.35
        for i in range(NUM_PIXELS):
            pixels[i] = color if random.random() > 0.35 else tuple(c // 5 for c in color)

    pixels.show()

# ── BLE setup ──────────────────────────────────────────────────────────────────

ble = adafruit_ble.BLERadio()
ble.name = "Claude Wearable"
uart = UARTService()
advertisement = ProvideServicesAdvertisement(uart)

# ── Main loop ──────────────────────────────────────────────────────────────────

while True:
    # Dim blue pixel while advertising
    pixels.fill(OFF)
    pixels[0] = (0, 0, 60)
    pixels.show()

    print("Advertising...")
    ble.start_advertising(advertisement)
    while not ble.connected:
        pass
    ble.stop_advertising()
    print("Connected!")

    # Solid blue = connected, idle
    pixels.fill(OFF)
    pixels[0] = (0, 0, 180)
    pixels.show()

    current_color = COLORS["B"]
    current_anim  = "solid"
    frame = 0
    buf   = b""
    last_frame_time = time.monotonic()
    button_a_prev = False
    listening = False  # toggle state for voice

    while ble.connected:
        # ── Button A: toggle voice ────────────────────────────────────
        button_now = button_a.value
        if button_now and not button_a_prev:
            # Button just pressed → toggle listening
            listening = not listening
            if listening:
                uart.write(b"VS")
                pixels.fill((80, 80, 80))
                pixels.show()
                print("Button A → VS (start)")
            else:
                uart.write(b"VP")
                pixels.fill(OFF)
                pixels[0] = (0, 0, 180)
                pixels.show()
                print("Button A → VP (stop)")
        button_a_prev = button_now

        # White breathing effect while listening
        if listening:
            b = 0.1 + 0.3 * (0.5 + 0.5 * math.sin(frame * 0.2))
            pixels.brightness = b
            pixels.fill((100, 100, 120))
            pixels.show()

        # ── Read incoming bytes from phone ────────────────────────────
        if uart.in_waiting:
            buf += uart.read(uart.in_waiting)

        # Process complete 2-byte commands
        while len(buf) >= 2:
            cmd = buf[:2]
            buf = buf[2:]
            if cmd in RESPONSES:
                color_key, anim, notes = RESPONSES[cmd]
                current_color = COLORS[color_key]
                current_anim  = anim
                frame = 0
                listening = False
                play_earcon(notes)

        # Advance animation frame
        now = time.monotonic()
        if now - last_frame_time >= FRAME_RATE:
            if not listening:
                update_animation(frame, current_color, current_anim)
            frame += 1
            last_frame_time = now

    print("Disconnected.")
    pixels.fill(OFF)
    pixels.show()
