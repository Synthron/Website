# MyCPU VGA Interface

> **Borrowing a graphics card from another homebrew computer.** This card turns three S65 I/O addresses into an 11-bit address bus, an 8-bit data bus and read/write strobes for the graphics unit of the MyCPU project.

[← Back to S65xx overview](../index.md)

---

## At a Glance

| | |
|---|---|
| **Function** | Bridge from the S65 bus to the MyCPU graphics unit ("MyCPU VGA Unit") |
| **Logic** | 3 × 74HCT574, 74AHC541, 74HC00, 74HC02, 2 × 74HC138 |
| **Target connector** | **DIN 41612**, 2 × 32 (rows a + c), male, horizontal |
| **Addresses** | `$BF14` data, `$BF15` address low, `$BF16` address high + control |
| **Target bus** | ADD0–ADDA (11 address bits), DAT0–DAT7, `/RD_VGA`, `/WR_VGA`, `/IOEN2`, `/RES`, +5 V |
| **PCB** | ≈ 83 × 68 mm, 4 layers, silkscreen "S65 MyCPU VGA Unit – $BF14 - $BF16" |

---

## Overview

The **MyCPU** is a homebrew computer project with its own backplane and plug-in cards, among them a graphics unit with VGA output. Its bus is wider than the S65's I/O page, so this card works like a small **I/O processor port**: the S65 writes the target address into two registers, then reads or writes the data register. The read/write strobes for the MyCPU bus are **bits in a register** that the software sets and clears ("bit-banged" bus cycles).

---

## Registers

| Address | Write | Read |
|---|---|---|
| `$BF14` | **DATA** → latch U6 → DAT0–DAT7 (driven only while `/WR_VGA` is low) | **DATA** ← DAT0–DAT7 via 74AHC541 |
| `$BF15` | **ADDR_LO** → ADD0–ADD7 | – |
| `$BF16` | **ADDR_HI / control** (see below) | – |
| `$BF17` | decoded as `/CONTROL`, not used | – |

**`$BF16` bit assignment:**

| Bit | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
|---|---|---|---|---|---|---|---|---|
| Signal | – | `/IOEN2` | `/WR_VGA` | `/RD_VGA` | – | ADDA | ADD9 | ADD8 |

### Typical write cycle *(derived from the circuit)*

1. Write address bits 0–7 to `$BF15`.
2. Write address bits 8–10 to `$BF16` with `/IOEN2`, `/WR_VGA`, `/RD_VGA` high.
3. Write the data byte to `$BF14`.
4. Write `$BF16` again with `/IOEN2` and `/WR_VGA` low → the data latch drives DAT0–DAT7.
5. Write `$BF16` with the strobes high again.

A read cycle sets `/IOEN2` and `/RD_VGA` low and then reads `$BF14`.

---

## DIN 41612 Pinout (used pins)

| Pin | Row a | Row c |
|:---:|---|---|
| 1, 2 | GND | GND |
| 3 | +5 V | +5 V |
| 4 | DAT1 | DAT0 |
| 5 | DAT3 | DAT2 |
| 6 | DAT5 | DAT4 |
| 7 | DAT7 | DAT6 |
| 8 | +5 V | +5 V |
| 10 | – | `/RD_VGA` |
| 11 | – | `/WR_VGA` |
| 12 | ADD1 | ADD0 |
| 13 | ADD3 | ADD2 |
| 14 | ADD5 | ADD4 |
| 15 | ADD7 | ADD6 |
| 16 | ADD9 | ADD8 |
| 17 | – | ADDA |
| 20 | GND | GND |
| 27 | `/IOEN2` | – |
| 29 | – | `/RES` |
| 30 | +5 V | +5 V |
| 31, 32 | GND | GND |

---

## Components

| Function | Ref. | Part |
|---|---|---|
| Address high / control latch | U4 | 74HCT574 |
| Address low latch | U5 | 74HCT574 |
| Data out latch | U6 | 74HCT574 (`/OE` = `/WR_VGA`) |
| Data in buffer | U3 | 74AHC541 |
| Strobe gates | U7, U8 | 74HC00, 74HC02 |
| Address decoders | U1, U2 | 74HC138 |
| MyCPU connector | J2 | DIN 41612 2 × 32 a/c, male, horizontal |
| Bus | J1 | PCI card edge |

---

## Files

| Type | Location |
|---|---|
| KiCad project | [`Hardware/modules/MyCPU_VGA`](../../Hardware/modules/MyCPU_VGA) |
