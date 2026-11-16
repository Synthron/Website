# Simple IDE Card (Direct IDE)

> **IDE with two chips.** The IDE task-file registers appear directly in the S65 I/O page – 8 bit wide, no buffers, no latches.

[← Back to S65xx overview](../index.md)

---

## At a Glance

| | |
|---|---|
| **Function** | 8-bit IDE/ATA interface ("Direct IDE") |
| **Logic** | 74HC138 (address), 74AHC2G00 (read/write strobes) |
| **Address** | `$BF80–$BF87` ("PORT 128@8") |
| **Data width** | 8 bit (DD0–DD7). DD8–DD15 not connected |
| **Registers** | IDE command block (`/CS0`) only, `/CS1` held inactive |
| **Connectors** | 40-pin 2.54 mm IDC + 44-pin 2.0 mm header |
| **Activity LED** | from `/DASP`, 330 Ω |
| **PCB** | ≈ 83 × 68 mm, 4 layers, silkscreen "S65 Simple-IDE – $BF80 - $BF87" |

---

## How It Works

| IDE signal | S65 signal |
|---|---|
| DD0–DD7 | D0–D7 (direct) |
| DA0–DA2 | A0–A2 |
| `/CS0` | `/PORT_128` (74HC138 Y0, `$BF80–$BF87`) |
| `/CS1` | +5 V (inactive) |
| `/DIOR` | `/RD` = NAND(CLK, R/W) |
| `/DIOW` | `/WR` = NAND(CLK, `/RD`) |
| `/RESET` | `/RES` |
| pin 20 (key), 38 | +5 V *(pin 20 supplies power to DOM modules)* |

The eight IDE task-file registers map 1:1 to `$BF80–$BF87`:

| Address | Read | Write |
|---|---|---|
| `$BF80` | Data | Data |
| `$BF81` | Error | Features |
| `$BF82` | Sector count | Sector count |
| `$BF83` | LBA 0–7 | LBA 0–7 |
| `$BF84` | LBA 8–15 | LBA 8–15 |
| `$BF85` | LBA 16–23 | LBA 16–23 |
| `$BF86` | Drive/head (LBA 24–27) | Drive/head |
| `$BF87` | Status | Command |

Because only DD0–DD7 are connected, the drive must be switched to **8-bit transfer mode** (ATA *SET FEATURES*, feature `$01`). CompactFlash cards and many DOMs support this; most classic hard disks do not – for those use the [buffered 16-bit IDE card](ide.md).

The alternate-status/device-control registers (`/CS1`) are not reachable; software resets use the `/RESET` line instead *(inferred)*.

---

## Components

| Function | Ref. | Part |
|---|---|---|
| Address decoder | U1 | 74HC138 |
| Strobe gates | U2 | 74AHC2G00 (TSSOP-8) |
| IDE connectors | J1, J2 | 2 × 20 IDC 2.54 mm, 2 × 22 2.0 mm |
| Activity LED | D1, R1 | LED 0805, 330 Ω |
| Bus | J3 | PCI card edge |

---

## Files

| Type | Location |
|---|---|
| KiCad project | [`Hardware/modules/IDE-Simple`](../../Hardware/modules/IDE-Simple) |
