# Plantomation – Notes for Authors

[← Back to Plantomation](../plantomation.md)

This page collects facts, inconsistencies and open questions found while analysing the repository. Use it to keep homepage articles accurate. It is not meant for publication.

---

## 1. Quick Fact Sheet

| Fact | Value | Source |
|---|---|---|
| Author | Marco Müller ("Synthron") | Silkscreen, About page |
| Community | "Freie Maker" Discord | About page |
| PCB reviewer (V1) | theBrutzler | V1 PCB footprint "approved_theBrutzler" |
| V1 schematic date | 2023-11-24, "Version 1.0" | `V1/Hardware/Plantomation.kicad_sch` |
| V2 schematic date | 2023-12-04, "Version 1.0" | `V2/Hardware/Plantomation_V2.kicad_sch` |
| V2 3D work | March 2024 | FreeCAD backup file names |
| V1 PCB | 100 × 80 mm, 2 layers | `Plantomation.kicad_pcb` |
| V2 PCB | 100 × 100 mm, 4 layers | `Plantomation_V2.kicad_pcb` |
| Supply | 12 V, 3 A | V1 schematic text "12V 3A Input" |
| Default AP | `Plantomation-XX-XX-XX` / `Planto1!` / `4.3.2.1` | `server.cpp`, tech note |
| NTP | `pool.ntp.org`, UTC+1, no DST | `main.cpp` |
| Moisture calibration | dry 3400, wet 1600 ADC counts | `config.h` |
| Spill threshold | ADC ≥ 200 | `main.cpp` |
| Serial | 115200 baud | `platformio.ini` |
| License | **none in the repo** | – |

---

## 2. Documentation vs. Code (V1)

The LaTeX tech note and the README describe the *intended* behaviour. The firmware differs in several places. Decide per article whether to describe the concept or the current implementation.

| Topic | Tech note says | Firmware does |
|---|---|---|
| Config file names | `config.json` / `control.json`, `plant1.json` … | `control.json`, `plant1.json` … `plant4.json`, `wifi.json` |
| Log file names | `channel1.log` … `channel4.log`, `event-log.log` | `plant1.log` … `plant4.log`, `events.log` |
| JSON keys | `op-mode`, `pump_time`, `log-level`, `pump_rate`, `passwd` | `op_mode`, `volume`, `log_level`, `pumprate`, `password` |
| Moisture sampling | 6 readings every 10 min, 10 s apart | 10 readings 100 ms apart, every loop iteration |
| Channel handling | every 10 min | every ~100 loop iterations (≈ 8–9 min with 4 moisture channels, ≈ 100 s with none – *computed*) |
| Moisture logging | hourly | every sensor update when log level = 2 |
| NTP | re-sync once per day | only once at boot |
| Boot LED codes | 7 documented combinations, shown for 3 s | not implemented (LEDs are only switched at start-up and while watering) |
| Spill alarm | lockdown until **Boot0** is pressed, LEDs blink at 1 Hz | lockdown clears automatically when the sensor is dry again; no LED blinking |
| Empty reservoir | error after 5 cycles without moisture change | not implemented (`SYS_EMPTY` is only defined) |
| Empty SD card | valid default files are created | no default-file creation found |
| Sensor supply | 5 V | 5 V (matches) |

---

## 3. Code Observations (V1)

Worth checking before writing "how it works" articles that quote exact behaviour:

1. **Time vs. volume swapped.** `pump_channel(channel, amount, ml_secs)`: moisture mode passes `watering_time` (5) with the "ml" flag, so it doses **5 ml**; time mode passes the configured `volume` with the "seconds" flag, so it pumps for **`volume` seconds**.
2. **`handle_channel()` takes `Plant` by value.** Resetting `interval_ready` only changes the copy, so a time-controlled channel keeps watering on every handling cycle after its first timer event.
3. **Wrong log target.** `handle_channel()` always logs watering events with `plant1` data, regardless of channel.
4. **Interval overflow.** `interval_time * 60 * 60 * 1000000` is calculated in 32 bit and overflows for intervals of 2 h and more.
5. **Timer prescaler.** `timerBegin(n, 240, true)` assumes a 240 MHz timer clock; ESP32 timers normally run from the 80 MHz APB clock – *verify* the real interval.
6. **Moisture below the wet point.** ADC values below 1600 produce results above 100 % (no clamping).

---

## 4. Security Notes

Relevant if articles encourage readers to put the device on their home network:

- **Same default AP password** (`Planto1!`) on every device, hard-coded.
- **No authentication** on the web interface; settings change via plain GET requests.
- **OTA without password.**
- With debug level ≥ 1 the **Wi-Fi password is printed** on the serial port.

A short "keep it on a trusted network" hint is advisable.

---

## 5. V2 Inconsistencies

| Topic | Note |
|---|---|
| Module name | README: "ESP32-S3-WROVER" · schematic/BOM: **ESP32-S3-WROOM-1** |
| Mode numbering | V2 HTML: 1 = Time, 2 = Moisture · V1: 1 = Moisture, 2 = Time |
| Temperature/humidity | README: "Ambient Temperature and Humidity Sensor" · PCB: separate analog inputs "Air Temp" and "Humidity" (no digital sensor) |
| README status | All firmware items unchecked; PCB "Finish Design" checked, "Order" unchecked |
| Typo | `config.h` starts with `#pragma one` (should be `#pragma once`) |

---

## 6. Open Questions for the Author

- Which **pump, valves and moisture sensors** are used (model, voltage, flow rate)? Readers will ask.
- What **reservoir and hose** sizes work well?
- Has V1 been running long-term? Any **results** (plants saved, water used, log charts)?
- What do the **"State1/State2" LEDs** on V2 indicate?
- What is the **"Shifter"** header for – extension boards?
- What are **UART1 + DIR** on V2 reserved for?
- What is the purpose of the **optional resistors** next to the auxiliary sensor inputs on V2?
- Which **license** should apply (e.g. CC BY-SA 4.0 like SynPLC, or MIT/GPL for code + CERN-OHL for hardware)?
- Is a **compiled PDF** of the tech note available for download?
- Who is the **friend** who had the original idea – credit by name or stay anonymous?

---

## 7. Media Checklist

- [ ] Photo of the assembled V1 board (top view, with labels visible)
- [ ] Photo of the complete setup: reservoir, pump, valve row on the carrier plate, hoses, pots
- [ ] Close-up of a capacitive moisture sensor in a pot
- [ ] Screenshots: Control, Configuration and About pages (V1); V2 drafts
- [ ] KiCad 3D renders of V1 and V2
- [ ] FreeCAD renders of the carrier plate (V1) and base plate (V2)
- [ ] Chart of moisture over several days from the SD log files
- [ ] Short video: dry sensor → valve opens → pump runs → valve closes
- [ ] Logo: `V1/doc/pictures/logo.png` / `logo_notext.png`

---

## 8. Suggested Article Series

| # | Title | Main sources |
|---|---|---|
| 1 | Plantomation – never forget to water your plants again | [plantomation.md](../plantomation.md) §1–3 |
| 2 | Building the V1 board: ESP32, valves and a pump | [v1.md](v1.md) §1 |
| 3 | Inside the firmware: two cores, JSON configs and a web UI | [v1.md](v1.md) §2, [plantomation.md](../plantomation.md) §7–8, §11 |
| 4 | Setting it up: SD card, Wi-Fi, first plant | [v1.md](v1.md) §3–4 |
| 5 | Printing the mechanics: carrier plate and valve holders | [plantomation.md](../plantomation.md) §10 |
| 6 | Plantomation V2: 12 plants, water and fertilizer | [v2.md](v2.md) |
| 7 | Lessons learned from V1 to V2 | [v2.md](v2.md) §1, this page §2–3 |
