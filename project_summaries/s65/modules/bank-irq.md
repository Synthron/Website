# Bank & IRQ Card

> **One Commodore chip, two jobs.** A 6525 TPI holds the RAM bank, the ROM bank and the ROM/RAM page – and at the same time works as a 5-input priority interrupt controller for the whole system.

[← Back to S65xx overview](../index.md)

---

## At a Glance

| | |
|---|---|
| **Function** | Bank registers, PAGE select, interrupt controller |
| **Chip** | MOS **6525 TPI** (Tri-Port Interface), DIP-40 |
| **Address** | `$BF00–$BF07` (74HC138 + 74HC00, "PORT 0@8") |
| **Port A** | RAM0–RAM7 (RAM bank) via solder jumpers JP1–JP8 |
| **Port B** | ROM0–ROM7 (ROM bank) via solder jumpers JP9–JP16 |
| **Port C** | interrupt mode: I0–I4 = `/IRQ_0`…`/IRQ_4`, `/IRQ` out, CA = `PAGE_ROM`, CB unused |
| **Reset state** | 3.3 kΩ pull-downs on all bank lines, 1 kΩ on PAGE → bank 0, Flash |
| **PCB** | ≈ 83 × 68 mm, 4 layers, silkscreen "SY65 Banks / IRQ – $BF00-$BF07" |

---

## Registers

The 6525 has eight registers (RS0–RS2 = A0–A2). In interrupt mode (`CR` bit MC = 1) port C changes its meaning:

| Address | Register | Use on the S65 |
|---|---|---|
| `$BF00` | PRA | **RAM bank** (RAM0–RAM7) |
| `$BF01` | PRB | **ROM bank** (ROM0–ROM7) |
| `$BF02` | PRC | interrupt latch (I0–I4) |
| `$BF03` | DDRA | direction port A (`$FF` = drive the bank lines) |
| `$BF04` | DDRB | direction port B |
| `$BF05` | DDRC | interrupt mask register in interrupt mode |
| `$BF06` | CR | mode control: MC (interrupt mode), IP (priority), edge selection, **CA/CB output control** |
| `$BF07` | AIR | active interrupt register |

The firmware writes `CR = $A1`: interrupt mode, no priority, CA and CB driven low → **PAGE = 0 (Flash)**, and enables all five interrupt inputs with mask `$1F` (see [Firmware](../firmware.md)).

---

## Port C in Interrupt Mode

| TPI pin | Signal | Bus line | Source |
|---|---|---|---|
| PC0 / I0 | `/IRQ_0` | B28 | VIA 1 on the [LCD & IRQ card](lcd-irq.md) (collects `/IRQ_0.0–0.7`) |
| PC1 / I1 | `/IRQ_1` | B29 | VIA 2 ([User Ports](vias.md)) |
| PC2 / I2 | `/IRQ_2` | B30 | VIA 3 ([User Ports](vias.md)) |
| PC3 / I3 | `/IRQ_3` | B31 | free |
| PC4 / I4 | `/IRQ_4` | B32 | free |
| PC5 | `/IRQ` | B27 | **to the CPU** |
| PC6 | CA | B34 `PAGE_ROM` | Flash / SRAM select on the [ROM card](rom.md) |
| PC7 | CB | – | not connected |

All IRQ lines and `/IRQ` have 3.3 kΩ pull-ups (RN3).

---

## 65816 Mode

Silkscreen: *"65816-Mode: cut open JP1-JP16 as needed"*. In 65816 mode the [CPU card](cpu.md) can wire the latched bank address onto RAM0–7 and/or ROM0–7. The corresponding solder jumpers on this card are then cut so that the TPI no longer drives those lines.

---

## Components

| Function | Ref. | Part |
|---|---|---|
| TPI | U3 | 6525 |
| Address decoder | U2 | 74HC138 (A3–A5, A7 low, A6 low via U1, `/IO`) |
| Gates | U1 | 74HC00 (A6 inverter, CLK gating for `/CS`) |
| Bank pull-downs | RN1, RN2 | 3.3 kΩ SIP-9 |
| IRQ pull-ups | RN3 | 3.3 kΩ SIP-9 |
| PAGE pull-down | R1 | 1 kΩ |
| Bank line jumpers | JP1–JP16 | solder jumpers, bridged |
| Bus | J2 | PCI card edge |

---

## Files

| Type | Location |
|---|---|
| KiCad project | [`Hardware/modules/Bank_IRQ`](../../Hardware/modules/Bank_IRQ) |
| Driver | [`Firmware/cc65/lib/tpi.s`](../../Firmware/cc65/lib/tpi.s) |
