# Review Notes for the Author

> **Not for publication.** While analysing the repository for this documentation, a few details stood out. They are listed here so the website pages can stay clean. Each point is an observation from reading the KiCad netlists and the source code – please verify on the bench before changing anything.

[← Back to S65xx overview](index.md)

---

## Firmware

| # | File | Observation | Possible fix |
|:---:|---|---|---|
| F1 | `lib/tpi.s` `TPI_INIT` | `DDRA`/`DDRB` are written with `$00` (inputs) and `$FF` goes to `PRA`/`PRB`. The bank ports therefore stay inputs and the pull-downs keep RAM and ROM bank 0 – `SW_ROMBANK` (`STA TPI1_PRB`) has no effect, so `C200R`/`C205R` cannot reach the BASIC banks. Same pattern in `IDE_INIT`. | Write `$00` to `PRA`/`PRB` first, then `$FF` to `DDRA`/`DDRB`. |
| F2 | `source/main.s` `PREPRAM` | `LDX #<EHBASIC_TABLE_END` loads the low byte of the table **address**, not the table length. The loop ends with `DEX` / `BEQ PREPRAM`, so it exits after the first byte (unless X happens to be 0). The BASIC I/O vectors at `$0805–$080C` are not initialised. | `LDX #EHBASIC_TABLE_END-EHBASIC_TABLE_START-1` … `DEX` / `BPL PREPRAM`. |
| F3 | `lib/macros.s` + `lib/kernel.s` | Macro `cpt` stores the string pointer in `$EC/$ED`; the kernel uses `$EC`/`$ED` as `READ_PTR`/`WRITE_PTR` of the ring buffer. `PRINT_MSG` also reads its pointer from `$EC`. Every message print overwrites the buffer pointers. | Move the string pointer to a free ZP pair (e.g. `$EE/$EF`). |
| F4 | `lib/kernel.s` + `lib/wozmon.s` | The ring buffer (`INPUT_BUF`, `$0200–$02FF`) and WozMon's line buffer (`IN = $0200`) share the same page. Incoming characters and the edited line overwrite each other. | Move one of them to a free RAM page (e.g. behind the kernel area). |
| F5 | `source/main.s` | `INIT_BUFFER` is never called, so `READ_PTR`/`WRITE_PTR` start with random values (and `BUFFER_SIZE` may report garbage). | Call `INIT_BUFFER` (or zero both pointers) before `CLI`. |
| F6 | `source/main.s` | `VIA1_Init` is not called. The ACIA interrupt reaches the TPI only through VIA 1 (CB1 → `/IRQ_0`); with `IER = 0` after reset, receive interrupts never arrive. The ISR also does not clear the VIA's CB1 flag. | Call `VIA1_Init` in `BOOT`; in the ISR read/clear `VIA1_IFR` (or read `PORTB1`). |
| F7 | `lib/acia.s` | `COMx_TRANSMIT` waits for TDRE. On the WDC **W65C51N** the TDRE bit is stuck at 1 (known silicon bug) – if that chip is used, characters are sent too fast. Fine with Rockwell/MOS 6551. | Delay loop or timer-based pacing when a W65C51N is fitted. |
| F8 | `lib/via.s` | The file switches to `.rodata`; the following init code of `via.s`, `tpi.s` and `acia.s` (up to `.segment "KERNEL_RAM"`) ends up in the `RODATA` segment. Works, but is surprising when reading the map file. | Add `.segment "CODE"` before the init routines. |
| F9 | `source/main.s` `ISR` | Assumes COM1 is the only interrupt source (comment says so). Reading `COM1_DATA` unconditionally may store a stale byte when another source fires. | Check ACIA status bit 7 / RDRF and TPI `AIR` before reading. |

---

## Hardware

| # | Card | Observation | Suggestion |
|:---:|---|---|---|
| H1 | CPU, ROM, RAM, Bank_IRQ, Address_Decode, Bus_Card | The board stack-up totals **2.61 mm** (second prepreg = 1.2104 mm, probably a typo for 0.2104 mm). PCI card edges need **1.57 mm**. Other cards use 1.6 mm. | Fix the stack-up and order 1.6 mm with gold fingers + bevel. |
| H2 | CPU (65816 mode) | 74HC245 `DIR` = NAND(NOT R/W, BE). With the CPU on the A side, `DIR` is **low during writes** (B→A) and high during reads – this looks inverted. The '245 is also enabled while `BE` is low. Only relevant in 65816 mode (U2–U4 are DNP in 6502 mode). | Check before populating; `DIR` = R/W inverted (or swap A/B), gate `/OE` with BE. |
| H3 | LPT, MyCPU VGA | The 74HCT574 latch clocks are `NOR(/sel, /WR)`. They rise at the **start** of PHI2 high, when the 65C02's write data is not yet valid (tMDS). The '574 latches on the rising edge. | Use OR instead of NOR (latch at the end of PHI2) or a transparent 74HCT573. |
| H4 | Backplane | The hex-display GALs are clocked on the **rising** CLK edge. Address is valid there, but data is valid only towards the falling edge – the data digits show the previous/undefined bus value. | Clock the data GALs with inverted CLK, if the display should show the transferred byte. |
| H5 | LCD & IRQ | Contrast trimmer RV1 sits between net `D_GND` (LCD D0–D3) and GND, not between +5 V and GND. VEE stays near 0 V – fine for many 5 V displays, but not adjustable. The schematic also has C11/C12 (4.7 µF) that are missing on the PCB. | Check `D_GND`; update PCB from schematic. |
| H6 | LPT | Compared with the IBM-PC pinout, pin 13 (*Select*, printer → host) is driven by the card (`/SEL_OUT`) and pin 17 (*/Select In*, host → printer) is read (`SEL_IN`). | Verify against the printer; swap if needed. |
| H7 | Address/Clock/RTC | DS1501 `A4` is tied to GND. According to the datasheet, the 256-byte NV-SRAM is reached through the extended registers `$10`/`$13` – not reachable this way *(verify)*. | Connect A4 if NV-RAM is wanted (decoder block is 16 bytes – would need 32). |
| H8 | Buffered IDE | PCB not synchronised with the schematic: TPI `/CS` unconnected, many pads without a net (pin 20, inverter inputs, decoder E2 …). Schematic note says "PORT 128@8" but the card decodes `$BF08`. | Update PCB from schematic before ordering. |
| H9 | Serial | Schematic references (U9–U16, J8–J12, JP17–JP20) differ from the PCB (U1–U8, J1–J5, JP1–JP4); C13/C14 (4.7 µF) only exist in the schematic. | Re-annotate and update the PCB. |
| H10 | All with old NMOS parts | 6520, 6525, 6551 and SID are specified for 1–2 MHz depending on grade; the clock card offers up to 8 MHz. | Document the allowed clock per card or use CMOS (W65C21, W65C22, W65C51N). |
| H11 | Backplane | Both regulators have the value "SY317" on an L7805 symbol, one for +5 V, one for +9 V. | Document the exact part (fixed 5 V / 9 V module?) for builders. |
| H12 | Bus naming | `~RDY` and `~BE` are labelled active-low, but on the W65C02S both are active-high inputs (pulled up on the CPU card). | Rename to `RDY`/`BE` in the symbol. |
| H13 | PIA LEDs | Silkscreen of both headers reads "… C2 C2 …" – one of them should be C1. | Cosmetic. |
| H14 | SID | J4 has value "POT_X" but is the audio output (silkscreen "Audio"). | Cosmetic. |

---

## Documentation

| # | Where | Observation |
|:---:|---|---|
| D1 | README I/O map | LPT rows say `BF10–BF12` and `BF13–BF14` (2 bytes each, overlapping VGA at `BF14`). Hardware: LPT 1 = `$BF10–$BF11`, LPT 2 = `$BF12–$BF13`. |
| D2 | `memory.cfg` comment | `ACIA4` listed with size `$0010` instead of `$0004`. |
| D3 | Repository | No license file. The SynPLC project uses CC BY-SA 4.0 – decide on a license before publishing. Note the EhBASIC conditions (non-commercial, "Derived from EhBASIC"). |
| D4 | Repository | No photos, renders or Gerbers. `Hardware.zip` duplicates the `Hardware` folder (25 MB). |
| D5 | README | All hardware items are checked, but there is no information on which cards were built and tested – useful for the website status table. |
