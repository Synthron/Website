# SynPLC – Master Page (source summary for the website)

> **Purpose of this file set:** condensed, fact-checked source material for writing the website. Master page = this file. Sub-pages = one file per V2 module (`01_CPU.md` … `06_XT4.md`).
> **Scope:** only the **V2 module generation** (STM32-based). V1 (ATmega328P/Arduino proof-of-concept) is discontinued and intentionally not described, except for one sentence of history.
> **Status of project:** *Work in progress.* Hardware for DO and DI is tested; AO, AI, XT are not yet fully tested; the CPU V2 is laid out and reviewed but not yet ordered (see README). Don't promise features marked "planned".

## Suggested website structure

```
SynPLC (master page)            <- this file
 ├─ CPU          -> 01_CPU.md
 ├─ DI8          -> 02_DI8.md
 ├─ DO8          -> 03_DO8.md
 ├─ AO4          -> 04_AO4.md
 ├─ AI4          -> 05_AI4.md
 └─ XT4          -> 06_XT4.md   (triac / phase-fired control)
```

## 1. What is SynPLC?

- **Open-source, modular PLC built from microcontrollers**, aimed at **home automation** (LOGO!-style). Digital and analog I/O plus special modules (e.g. phase-fired control of AC loads).
- **Origin:** idea that a LOGO!-type PLC could be built from Arduinos. After a few attempts it evolved into the current STM32-based system. V1 (ATmega328P, Arduino framework) was a proof of concept with high costs and hard-to-source parts → discontinued and replaced by V2.
- **License:** all resources and documents: **Creative Commons CC-BY-SA 4.0**.
- Docs are in the repo (`doc/tech-note.tex`), hardware in KiCad (`hardware/pcbs`), 3D-printable cases (FreeCAD/STL/3MF in `hardware/case`), firmware in PlatformIO/STM32CubeMX projects (`software/*`).

## 2. System architecture

- **One CPU module (master)** + any number of **I/O slave modules** connected by a **ribbon-cable bus**.
- The bus connector carries **5 V, GND and the communication lines**. Use **twisted-pair ribbon cable** for stable communication.
- The CPU's on-board DC/DC converter makes **5 V (10 W)** from a **24 V DC** input and feeds all modules via the bus connector.
- **Two bus systems** exist on every module: **RS485** and **CAN**. A module can do both in hardware but **not simultaneously** – selected with **jumpers** on the boards. Both use a custom, easily portable protocol.
- Currently **RS485 is the implemented protocol**; the **CAN protocol is not yet defined/programmed** (README to-do). CAN peripherals are initialised in firmware (CPU: CAN1, 500 kbit/s per the project notes; unused by application code yet).
- Only one CPU, no redundancy yet ("in later revisions there will be measures for redundancy").

### Common module hardware (all slave modules)

| Item | Detail |
|---|---|
| Board format | Uniform **100 mm × 77 mm**, 1.6 mm PCB (verified from KiCad board outlines of DI8, DO8, AI, AO, XT and CPU V2) |
| MCU | **STM32F103C8T6** (LQFP-48), 8 MHz crystal, PLL ×9 → 72 MHz (firmware clock config: HSE, PLL MUL9, APB1 /2) |
| RS485 transceiver | **MAX485E** (3.3 V supplied) |
| CAN transceiver | **SN65HVD232** |
| Local supply | **AP1117-33** 3.3 V LDO |
| Address | **5-bit DIP switch** (SW_DIP ×5) read at start-up on PA0–PA4 |
| Bus connectors | 2×5 pin headers (J3/J4 style, in/out ribbon) + 2×3 jumper/selection header, 1×4 programming header (SWD) |
| Field connectors | Screw-terminal blocks TBL009-500-02GY-2GY (5.0 mm, 2-pole) |
| Protection | SM6T36A / P6SMB36CA TVS diodes, ferrite beads, polyfuses on field side |
| Firmware | STM32CubeMX-generated HAL + shared `synplc` lib (`lib/synplc/synplc.c/.h`), RS485 via USART3, interrupt-driven receive, µs delay via TIM1 |
| RS485 direction pin | PB12 (high = transmit) |

> Hardware project folder names have older-looking revision numbers (`AI_V1`, `DI8_V1.1`, `DO8_V1.2`, `XT_V1`, `XP_V1`, `AO_V2`, `CPU_V2`). These are **PCB revisions within the V2 (STM32) generation**; the technical note (chapter "Modules V2") lists CPU, DO8, DI, AO, AI, XT as the V2 modules. Don't call them "V1" on the website. (`XP_V1` = triac module in testing, see XT page.)

### Module identifier / address scheme

8-bit slave address = **3-bit module type (upper bits) + 5-bit DIP address (0–31)**.

| Type bits | Constant in firmware | Module |
|---|---|---|
| 000 | `DEV_DI  0x00` | Digital Input |
| 001 | `DEV_DO  0x20` | Digital Output |
| 010 | `DEV_AI  0x40` | Analog Input |
| 011 | `DEV_AO  0x60` | Analog Output |
| 100 | `DEV_PWM 0x80` | PWM module (planned) |
| 101 | `DEV_XT  0xA0` | Thyristor / triac module |
| 110 | `DEV_XR  0xC0` | Relay module (planned) |
| 111 | – | reserved |

Example: DO8 with DIP = 3 → address `0x23`. Up to 32 modules per type. The CPU has no address.

## 3. RS485 protocol (master → slave, request/response)

- **Baud rate:** documentation says **250 kBaud** (≈3000 frames/s minimum at max 10 bytes per frame). Actual CubeMX configuration per module (verified in the `.ioc` files): **DI 250 kBaud, DO 250 kBaud, AO 1 MBaud**; the CPU F412 test firmware also uses 1 MBaud on USART1. → The bus speed is still being tuned; use 250 kBaud as the documented value and mention that the protocol was also run at 1 MBaud.
- **CAN bit rate as configured in CubeMX (not yet used by application code):** AO 1 Mbit/s (prescaler 2, BS1 15 TQ, BS2 2 TQ), AI ≈ 750 kbit/s, DI/DO prescaler 24 (≈ 500 kbit/s is an estimate, not verified). These differing values are just placeholders until the CAN protocol is defined – do not advertise them.
- **Start byte:** `0x5A`.

### Request frame (CPU → slave)

| Byte | Content |
|---|---|
| 1 | Start byte `0x5A` |
| 2 | Slave address (type bits + DIP address) |
| 3 | Instruction (high nibble) + register (low nibble) |
| 4 | Data (only for writes; LSB for 16 bit) |
| 5 | Data (only 16-bit writes; MSB) |
| last | Checksum |

**Instructions (high nibble of byte 3):**

| Code | Meaning |
|---|---|
| `0x0_` | Ping / bus scan ("is the slave there?"), no data |
| `0x1_` | Read 8-bit register |
| `0x2_` | Write 8-bit register |
| `0x5_` | Read 16-bit register |
| `0x6_` | Write 16-bit register |

**Checksum:** `0xC5 ⊕ byte1 ⊕ byte2 ⊕ byte3 (⊕ byte4 ⊕ byte5)`. Receiver check: XOR of *all* received bytes including checksum must equal `0xC5`.

### Response frame (slave → CPU)

| Write / ping | Read |
|---|---|
| `ACK/NACK byte`, `checksum` | `ACK byte`, `data (LSB if 16 bit)`, `[MSB]`, `checksum` |

- **ACK/NACK byte** = two nibbles. Firmware: **ACK = `0xC0`**, **NACK = `0x30` | error nibble**. Response checksum = XOR of the response bytes with `0xC5` (a plain ACK is therefore `C0 05`).
- **Error nibble (firmware bit flags):** `0x1` register invalid, `0x2` instruction invalid, `0x4` processing error (read error register), `0x8` checksum error (resend).
  *(The tech note lists a different numeric table (0x1, 0x2, 0xC, 0xD, 0xF) and ACK/NACK nibble values; the firmware in the repo is the working reference. Mention only "ACK/NACK + 4-bit error code" on the website unless this is reconciled.)*

### Register map used by the firmware (shared lib)

| Reg | Name | Width | Used by |
|---|---|---|---|
| `0x0` | `REG_IN` – input register | 8 bit | DI (and DO) |
| `0x1` | `REG_OUT` – output register | 8 bit | DO |
| `0x2` | `REG_FB` – feedback register | 8 bit | DO |
| `0x4`–`0x7` | `REG_CH1`…`REG_CH4` | 16 bit | AO, AI, XT |
| `0xF` | `REG_ERR` – error register | 8 bit | all |

> The tech note (chapter on protocol) lists the registers differently for DO/DI: "output register 0001, input register 0010, error register 1111" – i.e. DI inputs on register 2. The **firmware** reads DI inputs on register **0x0** (reg `0x2` returns "register invalid" on DI) and uses `0x2` as the DO *feedback* register. Use the firmware map on the website unless the author decides to change it.

## 4. Module overview table

| Module | Page | Function | MCU | Status (README) |
|---|---|---|---|---|
| CPU | [01_CPU.md](01_CPU.md) | Master, power supply, bus, USB, web (ESP-01), SD | STM32F412RE | Layout + review done, not ordered; firmware = test/library stage |
| DI8 | [02_DI8.md](02_DI8.md) | 8× 24 V digital input, 2 isolated groups | STM32F103C8 | Hardware tested ✔, firmware basic RS485 done |
| DO8 | [03_DO8.md](03_DO8.md) | 8× 24 V / 0.5 A digital output, isolated, read-back | STM32F103C8 | Hardware tested ✔, firmware RS485 done |
| AO4 | [04_AO4.md](04_AO4.md) | 4× 0–10 V / 0–20 mA analog output | STM32F103C8 | Not yet tested; firmware write path done |
| AI4 | [05_AI4.md](05_AI4.md) | 4× 0–10 V / 0–20 mA analog input | STM32F103C8 | Not yet tested; firmware skeleton only |
| XT4 | [06_XT4.md](06_XT4.md) | 4 triacs, 2 mains domains, phase-fired control | STM32F103C8 | Hardware built, validation pending; no firmware yet |
| XP1 *(prototype)* | [07_XP1.md](07_XP1.md) | PWM open-drain driver prototype (basis of the planned PWM module) | none (I²C-driven PCA9635) | Prototype, in testing |

Planned (not yet existing – only mention as "roadmap"): Relay module, PWM module, **Thermocouple module** (listed in the tech note summary), redundancy features, CAN protocol, Structured Text support (postponed), web interface becoming more than read-only.

## 5. Mechanical / enclosure

- Parametric FreeCAD enclosure (`hardware/case/Gehaeuse.FCStd`), exported STLs for: base plates with 4 or 5 slits (also a "digital" variant), front plates with 4 or 8 LED windows, a CPU front, cover with logo (optionally with NFC), clip, and a dedicated **CPU piggy-back case** (`CPU_Case_PiggyBack*.3mf`).
- The enclosure family is meant to build a rack of CPU + several I/O modules with matching front panels (4-LED front for analog modules, 8-LED front for digital modules). Do not state case dimensions – not documented; the PCB is 100 × 77 mm.
- Source: `Gehaeuse.FCStd` (FreeCAD) plus STL exports and a `.step` logo model.

## 6. Software / toolchain (for a "Developers" section)

- **Framework:** STM32Cube HAL, generated with STM32CubeMX (`*.ioc`), converted/built with **PlatformIO** (+ `stm32pio`). Edit only inside `USER CODE` blocks.
- **Slave firmware flow:** init GPIO/CAN/CRC/USART3/TIM1 → read DIP address → `init_485(addr)` → RS485 byte-wise interrupt state machine (`read_start → read_addr_inst → read_dat_cs → write_answ`) → module-specific main loop.
- **CPU library** (`synplc_cpu.c/.h`): `synplc_cpu_ping`, `read_reg8/16`, `write_reg8/16`, plus helpers `synplc_read_digital_input`, `synplc_write_digital_output`, `synplc_read_analog_input`, `synplc_write_analog_output`, `synplc_read_error_status`; default timeout 100 ms; library error codes: none / timeout / NACK / checksum / invalid response.
- **Simulation:** LTspice files for analog in/out in `hardware/simulations`.

## 7. Known open points (don't present as finished)

- CAN protocol undefined; RS485 lib to be made more efficient, more parametrized, with failsafe when no answer.
- Software for AI/XT/CPU generalisation missing; structured-text import postponed.
- Documentation discrepancies: baud rate (250 k vs 1 M test setting), error code table, V1/V2 naming of folders.
