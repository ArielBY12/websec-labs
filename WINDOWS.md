# Running WebSec Labs on Windows

The labs are web apps (Node + browser), so the cleanest way to run them on
Windows is **Docker** — no compilation, identical to macOS/Linux.

> ⚠️ Intentionally vulnerable code. Run locally only; never expose these ports
> to a network.

## Option A — Docker (recommended)

### 1. Install Docker Desktop
Download **Docker Desktop for Windows** from <https://www.docker.com/products/docker-desktop/>
and install it (use the **WSL 2** backend when prompted). Launch it once and wait
until it says *Engine running*.

### 2. Get the code
In PowerShell:
```powershell
git clone https://github.com/ArielBY12/websec-labs.git
cd websec-labs
```

### 3. Run the dashboard (hub)
```powershell
docker compose up --build
```
Open <http://localhost:3000> — the hub lists every lab. Stop it with `Ctrl+C`.

### 4. Run a lab
Each lab has its own compose file. For Lab 01 (SQL Injection):
```powershell
cd labs\01-sqli
docker compose up --build
```
Open <http://localhost:4001>. The menu links to each stage
(`/stage/1` … `/stage/3`, and `/fixed`).

Stop and clean up:
```powershell
docker compose down
```

Ports are per-lab (see each lab's `lab.json` → `port`). Run one lab at a time, or
several if their ports differ.

## Option B — Node (no Docker)

1. Install **Node.js LTS** from <https://nodejs.org> (includes npm).
2. Run the hub:
   ```powershell
   cd hub
   npm install
   npm start          # → http://localhost:3000
   ```
3. Run a lab:
   ```powershell
   cd labs\01-sqli\app
   npm install
   npm start          # → http://localhost:4001
   ```

## Notes
- A standalone single `.exe` is **not** recommended for this project: it loads
  stages dynamically, ships a `sql.js` WebAssembly asset, and reads its own source
  files for the in-page "view source" panel — all of which fight single-file
  packagers. Docker avoids every one of these issues.
- Everything here is cross-platform; the same commands work on macOS and Linux
  (use `/` instead of `\` in paths).
