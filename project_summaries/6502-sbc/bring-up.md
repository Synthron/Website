# Bring-up and Debugging – 65C02 Homebrew Computer

[← Back to overview](index.md)

*"Since this project is a prototype, errors are not only possible but expected. What matters is learning from them."* – from the thesis

This page tells the commissioning story in order: what was tested, what failed, how the fault was found and how it was fixed. Source: chapter "Testen der Platine" and the summary of the thesis documentation.

---

## Contents

1. [Bring-up strategy](#1-bring-up-strategy)
2. [First power-up checks](#2-first-power-up-checks)
3. [CPU test – free-running NOPs and the BluePill USB pins](#3-cpu-test--free-running-nops-and-the-bluepill-usb-pins)
4. [ROM and RAM test](#4-rom-and-ram-test)
5. [PIA test – the swapped address lines](#5-pia-test--the-swapped-address-lines)
6. [VIAs, buttons, banked RAM and LCD](#6-vias-buttons-banked-ram-and-lcd)
7. [Interrupts and the RAM write timing bug](#7-interrupts-and-the-ram-write-timing-bug)
8. [Serial ports](#8-serial-ports)
9. [Long-run test and the logic analyzer side effect](#9-long-run-test-and-the-logic-analyzer-side-effect)
10. [What is still untested](#10-what-is-still-untested)
11. [Lessons learned](#11-lessons-learned)
12. [Bug summary](#12-bug-summary)

---

## 1. Bring-up strategy

```mermaid
flowchart LR
    A[Bare PCB<br/>shorts check] --> B[Clocks<br/>scope] --> C[Logic analyzer] --> D[CPU<br/>NOP test] --> E[ROM] --> F[Shared RAM] --> G[PIA + LEDs] --> H[VIAs + buttons] --> I[Banked RAM] --> J[LCD] --> K[Interrupts] --> L[ACIA TX] --> M[ACIA RX] --> N[MAX232] --> O[Long-run test] --> P[Final demo]
```

- All 65xx chips, ROM and shared RAM are **socketed**. They were inserted **one at a time**.
- Hardware tests and software tests went **hand in hand**: every new chip got its own small test program.
- Main tools: **on-board logic analyzer**, oscilloscope (Hantek DSO4254B), multimeter (Mastech MS8261), USB-TTL adapter (FT232RL) and USB-RS-232 adapter.

---

## 2. First power-up checks

1. **Shorts:** with a multimeter, Vcc against GND and all address and data lines against each other. No shorts. (The PCB maker had already done a flying-probe test.)
2. **Clocks:** all three sources measured with the scope.
   - Monostable: the button bounces, the 555 output stays clean → single step works.
   - Astable: ≈ 5.5 Hz at 49 % duty cycle up to ≈ 776 Hz at 65 %.
   - 1 MHz oscillator: stable. Edge ringing was caused by the scope ground at the USB socket.
3. **Logic analyzer:** BluePill programmed, output checked at ≈ 10 Hz and 1 kHz. Random bus values, but correctly formatted.

---

## 3. CPU test – free-running NOPs and the BluePill USB pins

**Setup:** CPU in its socket, ROM socket empty. Pull resistors at the ZIF socket put **`$EA`** on the data bus – the opcode for **NOP**. The VIA1 bank lines PB0–PB4 were tied to 0 V at the socket so the stack could not change banks. Every read now returns NOP, so the CPU simply counts through the address space.

**Problem:** as soon as the CPU was inserted, the logic analyzer stopped sending data.

**Debugging:**

- BluePill removed → the address LEDs showed the CPU counting up as expected. **The CPU worked.**
- BluePill back in → still no serial output, but the CPU kept counting. So the problem was between the BluePill and the PC.
- A look at the BluePill pinout: address lines **A7 and A8 were routed to PA11 and PA12** – 5 V-tolerant pins, but also the **USB D− / D+ lines**. The bus was talking over the USB connection.

**Fix:** the contacts for PA11/PA12 were removed from the BluePill socket. No 5 V-tolerant pins were left, so two other pins were connected through the same 10 k / 10 k voltage dividers. The firmware now uses PC14/PC15.

**Verification** – the analyzer shows the textbook 65C02 reset sequence:

| Address | Data | R/W | Meaning |
|:---:|:---:|:---:|---|
| `FFFF` | `EA` | R | reset cycles … |
| `EAFB` | `EA` | R | |
| `015D` | `EA` | R | dummy stack accesses |
| `015C` | `EA` | R | |
| `015B` | `EA` | R | |
| `FFFC` | `EA` | R | reset vector low byte |
| `FFFD` | `EA` | R | reset vector high byte |
| `EAEA` | `EA` | R | jump to `$EAEA` → NOP |
| `EAEB` | `EA` | R | next NOP … |

The reset vector reads `$EAEA` because every byte is `$EA`.

---

## 4. ROM and RAM test

- **ROM:** filled completely with `$EA`. Same trace as above, but now the ROM chip select and R/W logic are tested too. ✅
- **Shared RAM:** first real program – write `$55`/`$AA` to `$4000`/`$4001` and read them back. The analyzer shows the write cycles (`4000 55 W`, `4001 AA W`) and the read cycles with the same data. ✅

---

## 5. PIA test – the swapped address lines

**Test:** rotate the pattern `$49` through both PIA LED ports.

**Problem:** the LEDs stayed dark.

**Debugging:**

- Analyzer: the CPU wrote to the right addresses `$7F00–$7F03` with the right data. **Software OK.**
- Clock stopped, multimeter on the PIA chip select: it **stayed high** while `$7F0x` was on the bus.
- At the 74HC154: $\overline{IO}$ was low (enabled) – but **the wrong output** was active.
- Schematic: **A4–A7 were connected to the 74HC154 in the wrong order.**

**Options:** fix it in software (change the addresses in the linker config) or in hardware. The author chose **hardware**: traces cut with a scalpel on the bottom side, new connections with wire-wrap wire between the vias, continuity and shorts checked, exposed copper sealed with a permanent marker against corrosion.

**Verification:** the LEDs showed the rotating pattern. ✅

---

## 6. VIAs, buttons, banked RAM and LCD

- **VIA + buttons:** button polling with the 65C02 `BBR` instructions, one LED pattern per button. **All three 65C22 chips** (2 × Rockwell 2002, 1 × WDC 2018) were tested in the button socket. All passed. ✅
- **Banked RAM:** VIA1 port B initialised first (otherwise floating bank lines would switch the stack). Write `$55` to bank 0 and `$AA` to bank 1 at the same address, switch back and forth, show both values on the LEDs. Bank switching works. ✅
- **LCD:** Ben Eater's LCD library adapted to **4-bit mode** with the HD44780 datasheet (4-bit init, high nibble first). After some bug fixes the LCD showed **"Hello, World!" / "6502 is alive!"**. ✅

---

## 7. Interrupts and the RAM write timing bug

The interrupt test turned out to contain **two bugs on top of each other**.

### 7.1 IRQ line stuck low

**Test:** button interrupts through VIA2 (CB1). Each button ISR sets a LED pattern. The main loop is empty.

**Problem:** the first interrupt worked (button 1 → LED 1), then the CPU seemed to hang.

**Debugging:** the CPU IRQ line was 5 V after reset but **stayed at 0 V** after the first interrupt. The VIA flag should clear when port B is read. The VIA2 socket held the **WDC** 65C22, chosen because its datasheet describes a **push-pull IRQ output** instead of open drain.

**Fix:** a **pull-up resistor** soldered between Vcc and the CPU IRQ pin, and a **Rockwell** 65C22 in the VIA2 socket. Now every button interrupt worked – but a new fault appeared.

### 7.2 Return to a random address

**Problem:** after an interrupt the CPU no longer returned to the main loop. It jumped to a seemingly random RAM address, ran garbage and crashed. Subroutines (`JSR`/`RTS`) had worked before.

**Debugging:** a "fake interrupt" program pushes a return address `$8000` and the status register, then executes `RTI`. Expected: restart at `$8000`. The analyzer showed:

| Line | Address | Data | R/W | Meaning |
|:---:|:---:|:---:|:---:|---|
| 5 | `01FF` | `80` | W | push high byte `$80` |
| 10 | `01FE` | `00` | W | push low byte `$00` |
| 13 | `01FD` | `32` | W | push status |
| 17 | `01FD` | `32` | R | pull status ✅ |
| 18 | `01FE` | `00` | R | pull low byte ✅ |
| 19 | `01FF` | **`00`** | R | pull high byte ❌ (should be `$80`) |
| 20 | `0000` | `00` | R | CPU continues at `$0000` |

The RAM returned the **low byte again instead of the high byte**. A bus collision was ruled out, so it had to be **timing**.

**Root cause:** the RAM `/WE` pins were connected **directly to the CPU R/W line**. R/W goes low early in the cycle, while the clock is still low and **the data bus is not valid yet**. The RAM could latch wrong data. (Sources: Garth Wilson's 6502 Primer, Tietze/Schenk, the RAM datasheets.)

**Fix:** gate the write enable with the clock, so `/WE` is only low while **CLK is high and R/W is low**:

$$
\overline{RAM\_WE} = \overline{\overline{R/W} \land CLK}
$$

That is two NAND gates (one as inverter). No free NAND gate was left on the board, so an **extra logic IC was glued onto the PCB** and wired with insulated silver wire. The shared RAM was separated from R/W by scraping the trace, the SMD banked RAM by lifting its pin. After the patch the fake-interrupt test returned correctly to `$8000`. ✅

---

## 8. Serial ports

### 8.1 Missing chip select

A schematic review before the test showed that **CS0 of both ACIAs was never tied high**. The 6551 has two chip selects (CS0 active high, /CS1 active low). Without CS0 the chip can never be selected. Fixed with wire-wrap wire on the bottom side.

### 8.2 Transmit only – the "babbling idiot"

**Test:** init 9600 Bd, 8N1, no parity, no handshake, then send "Hello World!" forever. Monitored with a USB-TTL adapter (FT232RL) on the TTL header.

**Problem:** nothing on TxD (checked with the scope).

**Cause:** the 6551 **only transmits while /CTS is low** (datasheet p. 4). **Fix:** jumper RTS → CTS and enable the receiver in the command register. Now the text arrived.

**Baud rate check:** one bit measured as **104.2 µs** → $\frac{1}{104.2\,\mu s} \approx 9597$ bit/s. Close enough to 9600.

### 8.3 Receive with interrupt

Receive interrupt enabled. The ISR reads the byte and **echoes** it. Test: press "H" on the PC. The scope shows the byte arriving on RxD and leaving again on TxD shortly after. ✅

### 8.4 MAX232 and null-modem adapters

With the MAX232 drivers inserted, the signals are inverted and swing about **±9 V** (the USB adapter: ±10 V). The PC adapter has the same pinout as the board, so the author built **two null-modem adapters** in metal DSUB housings. Communication worked. ✅ ACIA2 then passed all the same tests without any further debugging.

---

## 9. Long-run test and the logic analyzer side effect

**Test:** ≈ 10 000 characters of lorem ipsum sent to the board in one go.

**Problem:** at irregular intervals the connection broke and the CPU hung.

**First suspicion:** shorts on the bottom side, because the board was lying on an ESD mat. The author designed a **PCB holder in FreeCAD** and 3D-printed it in PLA. The problem stayed.

**Solution by accident:** for this test the CPU ran at 1 MHz, which is too fast for the logic analyzer, so the BluePill was pulled out. **Without the BluePill the transfer ran without a single error.**

**Theory (not confirmed by measurement):** the input capacitance of the BluePill pins and dividers distorts the bus signals at 1 MHz. The CPU might then read a wrong return address from the stack after an interrupt and jump into an invalid area.

Consequence: the logic analyzer is a **slow-clock debugging tool**. For full-speed operation it is removed.

---

## 10. What is still untested

- **VIA3 / user port:** no function assigned yet. The chip itself passed in the VIA2 socket. The VIA3 socket holds the WDC part, so the IRQ behaviour from [7.1](#71-irq-line-stuck-low) may matter there.
- **Expansion slots:** no cards built yet. The chip selects come from the decoder that all other tests have validated, and the slots only carry busses, clock, R/W, reset and IRQ.

---

## 11. Lessons learned

From the author's own error review:

| Cause | Examples | Would have been caught by |
|---|---|---|
| Carelessness in the schematic | Swapped A4–A7, BluePill on USB pins, RAM `/WE` without clock gating | A **design review** by a second person |
| Missing check | ACIA CS0 unconnected | An **ERC/DRC run** on the schematic |
| Datasheets read too quickly | RAM write timing, 6551 CTS requirement, IRQ output types of different 65C22 makers | Reading the timing diagrams and pin descriptions completely |
| Mixing chip vendors | WDC vs. Rockwell 65C22 IRQ outputs | A pull-up on IRQ costs nothing and there was room on the board |

The positive side: every fault was **analyzed systematically and fixed quickly**, and the on-board logic analyzer paid for itself several times. The author's reflection: the CPU's operation was quickly understood, assembly turned out to be easy to follow, and it was fascinating to see how loops and conditions of high-level languages look at machine-code level.

---

## 12. Bug summary

| # | Area | Symptom | Root cause | Fix | Type |
|:---:|---|---|---|---|---|
| 1 | Logic analyzer | No USB output with CPU running | A7/A8 on PA11/PA12 = USB lines | Socket pins removed, dividers to other pins | Patch |
| 2 | I/O decoding | PIA not selected | A4–A7 to 74HC154 in wrong order | Traces cut, wire-wrap wire | Patch |
| 3 | Interrupts | IRQ stays low after first interrupt | WDC 65C22 IRQ output vs. expected open-drain behaviour | Rockwell VIA in IRQ socket + pull-up | Patch |
| 4 | RAM | Wrong byte read from stack after `RTI` | `/WE` = R/W without clock gating | NAND gating with CLK, glued-on IC | Patch |
| 5 | ACIA | Chip never selected | CS0 not connected | Wire-wrap wire | Patch |
| 6 | ACIA | No transmission | /CTS must be low | Jumper RTS → CTS | Config |
| 7 | System | Random crashes at 1 MHz under load | Logic analyzer loading the bus (theory) | Remove BluePill at full speed | Procedure |
