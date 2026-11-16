# PIA LED Card

> **Sixteen LEDs for the first "Hello World".** A 6520 PIA drives two rows of eight LEDs – and offers both ports on pin headers for experiments.

[← Back to S65xx overview](../index.md)

---

## At a Glance

| | |
|---|---|
| **Function** | Status LEDs and two 8-bit ports |
| **Chip** | MOS **6520** PIA |
| **Address** | `$BF1C–$BF1F` ("PORT 28@4") |
| **LEDs** | 16 (A.0–A.7, B.0–B.7), each through 10 kΩ to GND |
| **Connectors** | 2 × 1 × 12 headers "PIA Port A" / "PIA Port B" |
| **Interrupts** | not connected |
| **PCB** | ≈ 83 × 68 mm, 4 layers, silkscreen "S65 PIA LEDs – $BF1C-$BF1F" |

---

## Address Decoding Trick

The 74HC138 only decodes the 16-byte block `$BF10–$BF1F` (Y1 → `/CS2`). The 6520's two extra chip selects narrow it down: **CS0 = A2** and **CS1 = A3** must both be high → only `$BF1C–$BF1F` select the PIA. That leaves `$BF10–$BF1B` free for the [LPT](lpt.md) and [MyCPU VGA](mycpu-vga.md) cards.

---

## Registers

| Address | Register (CRx bit 2 = 0 / 1) |
|---|---|
| `$BF1C` | DDRA / Port A |
| `$BF1D` | Control register A |
| `$BF1E` | DDRB / Port B |
| `$BF1F` | Control register B |

`PIA_INIT` in `pia.s` selects the DDRs, sets all 16 lines to output and switches back to the port registers – a typical first test is writing a counter to `$BF1C`.

---

## Header Pinout (J2 = Port A, J3 = Port B)

| Pin | 1 | 2–9 | 10 | 11 | 12 |
|---|---|---|---|---|---|
| Signal | +5 V | P0–P7 | C1 (CA1/CB1) | C2 (CA2/CB2) | GND |

The LEDs hang directly on the port lines, so they also show the state of inputs driven from the header.

---

## Components

| Function | Ref. | Part |
|---|---|---|
| PIA | U1 | 6520 (DIP-40) |
| Address decoder | U2 | 74HC138 |
| LEDs | D1–D16 | LEDs at the card edge (custom edge footprint) |
| LED resistors | R1–R16 | 10 kΩ |
| Headers | J2, J3 | 1 × 12 pin headers |
| Bus | J1 | PCI card edge |

---

## Files

| Type | Location |
|---|---|
| KiCad project | [`Hardware/modules/PIA_LED`](../../Hardware/modules/PIA_LED) |
| Driver | [`Firmware/cc65/lib/pia.s`](../../Firmware/cc65/lib/pia.s) |
