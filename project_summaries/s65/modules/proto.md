# Prototyping Card

> **Every bus signal on a labelled pad – and a slot on top.** The prototyping card is a breakout, an extender and an experimenting area in one.

[← Back to S65xx overview](../index.md)

---

## At a Glance

| | |
|---|---|
| **Function** | Bus breakout, prototyping area, bus extender |
| **Connectors** | PCI card edge (J1) **and** a PCI slot TE 5145154-4 (J2), wired 1:1 |
| **Breakout** | all bus signals labelled on both sides of the board, test loops (beaded wire loops) |
| **PCB** | ≈ 83 × 68 mm, **2 layers**, silkscreen "S65 Prototyping Board" |

---

## Overview

The card plugs into the backplane like any other card, but it also carries a **slot of its own**. A second card can be plugged on top, which lifts it out of the card cage *(use inferred)*: its components become reachable for the scope probe while it keeps running in the system.

The silkscreen repeats the complete bus pinout in the order of the edge connector, both for side A and side B, plus separate blocks for the RAM and ROM bank lines:

```
Side B: 9V GND 5V M/X GND CLK GND R/W RES GND ML VP GND 5V GND PAGE NMI IRQ4 IRQ3 IRQ2 IRQ1 IRQ0 IRQ GND
        HRAM LRAM GND 5V GND D6 D4 GND D2 D0 GND 5V GND A14 A12 GND A10 A8 GND A6 A4 GND A2 A0 GND
Side A: 9V GND 5V GND EMU GND GND BE RDY GND VDA VPA GND 5V GND IRQ07 … IRQ00 GND ROM IO GND
        5V GND D7 D5 GND D3 D1 GND 5V GND A15 A13 GND A11 A9 GND A7 A5 GND A3 A1 GND
Banks:  GND RAM7 RAM6 RAM5 RAM4 GND RAM3 RAM2 RAM1 RAM0 GND  /  GND ROM7 … ROM0 GND
```

*(`EMU` = 65816 emulation pin `E`, `VDA`/`VPA` = `Ø2`/`SYNC` for the 65C02.)*

---

## Typical Uses

- First tests of a new peripheral before drawing a dedicated card.
- Logic analyser hook-up for the whole bus.
- Bus extender for measurements on another card.

---

## Files

| Type | Location |
|---|---|
| KiCad project | [`Hardware/modules/Proto`](../../Hardware/modules/Proto) |
