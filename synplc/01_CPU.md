# CPU Module (V2) – sub-page source

**Role:** heart of the SynPLC. Mandatory in every system, exactly one per system. Connects to all I/O modules, processes all data, supplies power. No address (one-of-a-kind module).

## Hardware

| Item | Detail |
|---|---|
| MCU | **STM32F412RE** (ARM Cortex-M4F with FPU, 512 kB flash, 256 kB RAM; 12 MHz HSE crystal, PLL → 100 MHz per firmware: M=6, N=100, P=2; 32.768 kHz LSE crystal for RTC; 0.22 F/5 V backup supercap on the schematic) |
| Board | 100 mm × 77 mm main board (same outline as the I/O modules) |
| Power in | **24 V DC** via screw terminal (J4 "24V_In"), ESD/TVS protected, polyfuse, diode, ferrite |
| DC/DC | **THN 10-2411WIR** (Traco Power, isolated 10 W converter) → **5 V, 10 W** to bus connector (powers all modules) |
| 3.3 V | AP1117-33 LDO from 5 V |
| Bus | **RS485** (MAX485E, 3.3 V, 120 Ω termination option) and **CAN** (SN65HVD232), 2×5-pin ribbon connector; jumpers select bus |
| USB | USB-B connector, TVS-protected (CDSOT23), V_USB solder jumper; firmware has USB CDC (serial monitor) |
| Wi-Fi/Web | **ESP-01 socket** (level shifted with BSS138 MOSFETs) → read-only web interface (as of now) |
| Storage | **SD card** (SDIO) for Structured Text (WIP) and log files; FatFS present in code but disabled |
| Other | I²C connector, SPI connector, SWD header, 5 status LEDs, test points |
| Variants | `CPU_V2` main board and **`CPU_PiggyBack`** (separate add-on board with PCF8574 I/O expanders, TLP291-4 optocouplers, 24 V inputs/outputs, P6SMB36CA protection, 2-pole terminals) – a CPU with additional on-board 24 V I/O. The piggy-back has its own printable case. |
| Older prototype | `software/CPU/F103` (STM32F103) is the obsolete CPU prototype; do not feature it |

### Status LEDs (firmware behaviour)
- **BOOT** – on during initialisation.
- **RUN** – on while main loop runs.
- **HEARTBEAT** – 1 Hz.
- **ERROR** – blinks 2 Hz for 5 s after a communication error (non-fatal).
- **FLASH** – on while transmitting on RS485 (planned: also CAN / program update from external source).

## Software

- Project: `software/CPU/F412` (CubeMX `CPU.ioc`, PlatformIO env `genericSTM32F412RE`, ST-Link upload with auto reset script).
- Peripherals initialised: CAN1, USART1 (RS485 master), USART2, timers TIM1–5/8/9/12 (TIM1 = µs delay), I²C1, SPI2, USB device (CDC). RTC/SDIO/FatFS available but not enabled.
- **Master library** `synplc_cpu`: ping, read/write 8/16-bit registers, convenience calls for DI/DO/AI/AO, error-status read, timeout 100 ms, checksum validation, LED integration.
- Current `main.c` is a **test program** (cycles analog output values 0…10000 over four channels of an AO module at address 0). A general-purpose PLC runtime (cyclic scan, program loading) is **not yet implemented**; Structured Text is postponed.
- Interrupts: CAN1 RX0 at highest priority. (The project's internal AI notes claim "no FPU"; the STM32F412 does have one, so this is not a restriction.)
- The firmware is present in the repository (`software/CPU/F412`), it is just an early test/library stage.

## Key facts for the page
- Supplies the entire system (5 V / 10 W) from 24 V.
- Interfaces: RS485, CAN, USB serial, ESP-01 web interface, SD card.
- Planned: redundancy, ST program execution, richer web UI, CAN protocol.
