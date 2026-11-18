# Article Guide – 65C02 Homebrew Computer

[← Back to overview](index.md)

Working notes for writing homepage articles from the material in this folder. Each article idea lists a hook, the key content, the source page and the matching images.

---

## 1. Suggested article series

| # | Title (suggestion) | Hook | Key content | Source | Images |
|:---:|---|---|---|---|---|
| 1 | **Building my own 8-bit computer – project overview** | From the "MyCPU" rebuild and a box of donated 65xx chips to a 200 × 200 mm single-board computer | Motivation, requirements, feature list, memory map, photos | [index](index.md) | Board photo, `Blockschaltbild.png`, `layout_overview.png` |
| 2 | **Address decoding with plain logic chips** | 4 logic ICs and a few diodes instead of a GAL | Boolean equations, 74HC30 trick, 74HC154 page split, diode OR, 23 ns vs. 500 ns | [hardware §3](hardware.md#3-address-decoding) | Decoder schematic (sheet 1 of `schematic_v2.pdf`) |
| 3 | **528 kB RAM on an 8-bit CPU – bank switching with a VIA** | Every task could get its own zero page and stack | 32 × 16 kB banks via VIA1, why zero page/stack are banked, the init order problem | [hardware §4](hardware.md#4-memory-and-ram-banking), [software §4](software.md#4-6502-concepts-in-60-seconds) | Memory-map silkscreen close-up |
| 4 | **One clock, three ways: crystal, 555 and a button** | Single-stepping a CPU by hand | Clock jumper, Ben Eater 555 circuits, scope shots, why the static 65C02 allows it | [hardware §5](hardware.md#5-clock-generation) | `prellen.jpg`, `astable_*.jpg`, `1mhz.jpg` |
| 5 | **A logic analyzer built into the computer** | A cheap BluePill board shows every bus cycle | Port from Arduino Mega, voltage dividers, the reset sequence trace, limits at 1 MHz | [hardware §11](hardware.md#11-integrated-logic-analyzer), [bring-up §3](bring-up.md#3-cpu-test--free-running-nops-and-the-bluepill-usb-pins) | Analyzer close-up, terminal screenshot |
| 6 | **A VIA as interrupt controller** | 16 interrupt sources on a CPU with one IRQ pin | Diode OR to CA1/CB1, port read-back, ISR flow chart, WDC vs. Rockwell IRQ outputs | [hardware §7](hardware.md#7-interrupt-architecture) | `irq.png`, `irq-routine.png` |
| 7 | **Seven bugs and how I found them** | "Errors are not only possible but expected" | The full bring-up story with analyzer traces and patch wires | [bring-up](bring-up.md) | Patch-wire close-ups, analyzer tables |
| 8 | **The RAM that remembered the wrong byte** (deep dive of bug 4) | `RTI` returns to `$0000` instead of `$8000` | Fake-interrupt test, analyzer trace, R/W vs. clock timing, NAND gating | [bring-up §7.2](bring-up.md#72-return-to-a-random-address) | Trace table, glued-on IC photo |
| 9 | **Talking RS-232 like it's 1985** | The "babbling idiot" | 6551 setup, CTS trap, 9600 Bd measurement, MAX232 levels, null-modem adapters | [hardware §9](hardware.md#9-serial-ports-rs-232), [bring-up §8](bring-up.md#8-serial-ports) | `dso_uart_*.png`, adapter photo |
| 10 | **Programming the 65C02 with cc65** | From `.s` file to EEPROM in one command | Toolchain, build script, linker config tricks (`define=yes`, `$DB` fill), libraries | [software](software.md) | Terminal screenshot, TL866A photo |
| 11 | **Hello World on a character LCD in 4-bit mode** | " 6502 is alive! " | HD44780 4-bit init, busy flag, cursor positions, 4 × 40 preparation | [hardware §8](hardware.md#8-lcd), [software §9](software.md#9-code-snippets-for-articles) | LCD photo |
| 12 | **What the board cost and what I'd do differently** | 225.56 € and a list of lessons | Cost table, timeline plan vs. actual, lessons learned, ideas for revision 2 | [index §9–10](index.md#9-cost-and-timeline), [bring-up §11](bring-up.md#11-lessons-learned) | – |

**Possible later articles:** first expansion card (GPU via FPGA or SID sound card), VIA3 timer as NMI system tick, multitasking with banked zero page/stack, C programs with cc65.

---

## 2. Key numbers (fact sheet)

| Fact | Value |
|---|---|
| CPU | WDC W65C02S, 8-bit, 1 MHz |
| ROM | 32 kB AT28C256 EEPROM |
| RAM | 512 kB banked (32 × 16 kB) + 16 128 B shared ≈ 528 kB |
| I/O chips | 1 PIA, 3 VIAs, 2 ACIAs |
| Interrupt sources | 8 buttons + 2 ACIAs + 6 slot IRQs = 16 via VIA2, plus NMI via VIA3/button |
| Expansion | 7 slots, 16 or 32 registers each |
| LEDs | 42 (26 bus + 16 user) |
| Buttons | 11 (8 user, reset, NMI, single step) |
| Clock range | ≈ 5.5 Hz – 776 Hz (555), 1 MHz (oscillator), single step |
| Serial | 2 × RS-232, 9600 Bd tested |
| Decoder delay | max. 23 ns (budget 500 ns) |
| PCB | 200 × 200 mm, 4 layers |
| Cost | 225.56 € |
| Project duration | Sept. 2021 – May 2022 *(year inferred from the 2022 thesis date)* |
| Bugs found in bring-up | 6 hardware/config issues + 1 system observation |

---

## 3. Check before publishing

These points differ between sources or could not be verified. Decide which version to use.

| Topic | Documentation | Schematic / code | Suggestion |
|---|---|---|---|
| LED resistors | 1 kΩ | 2.2 kΩ (schematic and BOM) | Use 2.2 kΩ |
| 555 type | NE555 | LM555D | "555 timer" |
| ACIA type | R6551 / CDP65C51 | W65C51N footprint | Name the chips actually fitted. Mention the W65C51N TDRE bug for rebuilders |
| Final demo, buttons | One LED per button (`LED_Single`) | `LED_Full` (all buttons mirrored) | Describe what the flashed ROM does |
| Final demo, echo | Only ACIA2 echoes | Both ACIAs echo | Same |
| DSUB-9 pin 5 | – | Not connected in the board netlist (GND only via shell) | Check on the real board before publishing a pinout |
| Reset button | – | S1 assumed reset (POR sheet) | Check on the board |
| PCB version | – | Schematic "6502 Computer V2", silkscreen "Version 1.0" | Explain: V1 = breadboard, V2 schematic = PCB 1.0 *(inferred)* |
| License | – | No license file | Choose one (e.g. CC BY-SA 4.0 for docs, MIT/CERN-OHL for code/hardware) |
| Third-party images | `nullmodem.png` (BMET wiki) | – | Redraw or credit properly |
| Datasheets | in `Datenblätter/` | – | Link to manufacturers, do not re-host |
| Personal names | Supervisor and school on the title page | – | Ask before naming people/companies (e.g. the former employer of the colleague who donated ICs) |

---

## 4. Photos and media still needed

- Bare PCB (top and bottom), assembled board, board in the 3D-printed holder
- Close-ups: patch wires (decoder, ACIA CS0), glued-on NAND IC, BluePill with removed socket pins
- Bus LEDs in single-step mode (GIF or short video)
- LCD showing "6502 is alive!"
- Terminal session: typing on the PC → text on the LCD
- Logic analyzer output in a terminal
- The two null-modem adapters
- 3D render of the Eagle layout (optional)

---

## 5. Style notes

- Audience: hobbyists and retro fans with basic electronics knowledge. Explain 6502 terms (zero page, stack, vectors) once, then link to [software §4](software.md#4-6502-concepts-in-60-seconds).
- Use the analyzer traces as "proof" elements. They are unique to this project and show the debugging process clearly.
- Keep the honest tone of the thesis: bugs are part of the story, not something to hide.
- Credit Ben Eater for the clock circuits, LCD routines and analyzer idea in every article that uses them.
- Hex notation: use `$` (6502 convention) consistently on the website.

---

## 6. Short glossary

| Term | Meaning |
|---|---|
| PIA | Peripheral Interface Adapter (6520): 2 × 8-bit parallel ports |
| VIA | Versatile Interface Adapter (6522): 2 × 8-bit ports, timers, shift register, interrupt logic |
| ACIA | Asynchronous Communication Interface Adapter (6551): UART with baud-rate generator |
| ZIF | Zero insertion force socket |
| POR | Power-on reset |
| DDR | Data direction register |
| IFR / IER | Interrupt flag / interrupt enable register of the VIA |
| ISR | Interrupt service routine |
| NMI | Non-maskable interrupt |
| Bank switching | Mapping different physical RAM blocks into the same address window |
| Chip select | Active-low enable signal that tells one chip "this address is yours" |
