# SID 8580 Card

> **The Commodore 64 sound chip on the S65 bus.** A MOS 8580 with its two filter capacitors, an audio output and the two paddle inputs.

[← Back to S65xx overview](../index.md)

---

## At a Glance

| | |
|---|---|
| **Function** | 3-voice synthesizer |
| **Chip** | MOS **8580** SID (DIP-28) |
| **Address** | `$BF60–$BF7F` ("PORT 96@32") |
| **Supplies** | +5 V and **+9 V** (from the backplane, pins A49/B49) |
| **Clock** | system `CLK` on the SID's Ø2 input |
| **Filter capacitors** | 2 × 22 nF (CAP1A/B, CAP2A/B – the 8580 value) |
| **Audio** | `AUDIO OUT` with 1 kΩ load, 10 µF coupling capacitor → 2-pin header "Audio" |
| **Inputs** | POT X, POT Y (2-pin headers), `EXT IN` terminated with 1 kΩ |
| **Interrupts** | none |
| **PCB** | ≈ 83 × 68 mm, 4 layers, silkscreen "S65 SID 8580" |

---

## Address Decoding

A 74HC138 decodes A5–A7 with `/IO` (A7 must be 0). Output Y3 (A6 = A5 = 1) selects the SID for the 32-byte block `$BF60–$BF7F`. A0–A4 go to the SID's register select – all 29 SID registers are reachable.

---

## Registers (from `sid.s`)

| Offset | Voice 1 | Offset | Voice 2 | Offset | Voice 3 |
|:---:|---|:---:|---|:---:|---|
| `$00/$01` | frequency lo/hi | `$07/$08` | frequency lo/hi | `$0E/$0F` | frequency lo/hi |
| `$02/$03` | pulse width lo/hi | `$09/$0A` | pulse width lo/hi | `$10/$11` | pulse width lo/hi |
| `$04` | control | `$0B` | control | `$12` | control |
| `$05` | attack/decay | `$0C` | attack/decay | `$13` | attack/decay |
| `$06` | sustain/release | `$0D` | sustain/release | `$14` | sustain/release |

| Offset | Register |
|:---:|---|
| `$15/$16` | filter cutoff lo/hi |
| `$17` | resonance / filter routing |
| `$18` | filter mode / volume |
| `$19/$1A` | POT X / POT Y |
| `$1B` | oscillator 3 / random |
| `$1C` | envelope 3 |

---

## Clock and Pitch

The SID derives all frequencies from its Ø2 clock. In a C64 that clock is ≈ 1 MHz; on the S65 it is whatever the [clock jumper](address-clock-rtc.md#clock-generator) selects. At 1 MHz, C64 frequency tables work almost unchanged; at 2 MHz every note is one octave higher. The SID was designed for a clock of about 1 MHz, so the higher clock settings are not recommended while the SID is plugged in *(check the datasheet of the part used)*.

---

## Components

| Function | Ref. | Part |
|---|---|---|
| SID | U2 | MOS 8580 |
| Address decoder | U1 | 74HC138 |
| Filter capacitors | C4, C5 | 22 nF |
| Audio coupling | C6 | 10 µF |
| Bulk capacitors | C7 (+5 V), C8 (+9 V) | 10 µF |
| Audio / pots | J2 (POT X), J3 (POT Y), J4 (Audio) | 2-pin headers |
| Bus | J1 | PCI card edge |

---

## Files

| Type | Location |
|---|---|
| KiCad project | [`Hardware/modules/SID`](../../Hardware/modules/SID) |
| Register definitions | [`Firmware/cc65/lib/sid.s`](../../Firmware/cc65/lib/sid.s) |
