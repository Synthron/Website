# User Ports – VIA 2 & VIA 3

> **Forty general-purpose lines.** Two W65C22 VIAs bring two full 6522 user ports – 16 I/O lines, 4 handshake lines, timers and a shift register each – to 2 × 12 pin headers.

[← Back to S65xx overview](../index.md)

---

## At a Glance

| | |
|---|---|
| **Function** | General-purpose I/O ("User Ports GPIO") |
| **Chips** | 2 × **W65C22S** |
| **Addresses** | VIA 2 `$BF30–$BF3F` ("PORT 48@16"), VIA 3 `$BF40–$BF4F` ("PORT 64@16") |
| **Interrupts** | VIA 2 → `/IRQ_1`, VIA 3 → `/IRQ_2` (TPI inputs I1, I2) |
| **Connectors** | 2 × 2 × 12 pin headers (J2 "Port 1", J3 "Port 2") |
| **Per port** | PA0–PA7, PB0–PB7, CA1, CA2, CB1, CB2, +5 V, GND |
| **PCB** | ≈ 83 × 68 mm, 4 layers, silkscreen "S65 VIA / User-Ports" |

---

## Header Pinout (J2 = VIA 2, J3 = VIA 3)

| Pin | Signal | | Pin | Signal |
|:---:|---|---|:---:|---|
| 1 | +5 V | | 2 | +5 V |
| 3 | PA0 | | 4 | PB0 |
| 5 | PA1 | | 6 | PB1 |
| 7 | PA2 | | 8 | PB2 |
| 9 | PA3 | | 10 | PB3 |
| 11 | PA4 | | 12 | PB4 |
| 13 | PA5 | | 14 | PB5 |
| 15 | PA6 | | 16 | PB6 |
| 17 | PA7 | | 18 | PB7 |
| 19 | CA1 | | 20 | CB1 |
| 21 | CA2 | | 22 | CB2 |
| 23 | GND | | 24 | GND |

So one row carries port A, the other port B – the silkscreen labels each row "GND C2 C1 P7 … P0 5V".

---

## Firmware

`VIA2_Init` and `VIA3_Init` in `via.s` set both ports to input and disable all interrupts (`IER = $7F`). The register names (`PORTB2`, `DDRA2`, `VIA2_PCR`, …) are defined for all three VIAs.

---

## Components

| Function | Ref. | Part |
|---|---|---|
| VIA 2 | U1 | W65C22S |
| VIA 3 | U2 | W65C22S |
| Address decoder | U3 | 74HC138 (Y3 → `$BF30`, Y4 → `$BF40`) |
| Bulk capacitor | C4 | 10 µF |
| Port headers | J2, J3 | 2 × 12 pin headers |
| Bus | J1 | PCI card edge |

---

## Files

| Type | Location |
|---|---|
| KiCad project | [`Hardware/modules/VIAs`](../../Hardware/modules/VIAs) |
| Driver | [`Firmware/cc65/lib/via.s`](../../Firmware/cc65/lib/via.s) |
