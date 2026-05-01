# Mitwirken

Danke, dass du zum Stream Overlay beitragen möchtest! 🎉

## Dev-Setup

```bash
git clone https://github.com/jalumu/stream-overlay.git
cd stream-overlay
npm install
cp .env.local.example .env.local   # Werte ausfüllen
npm run dev                         # http://localhost:3000
```

## Projektstruktur

```
app/
├── api/                    # Next.js Route Handler (Twitch OAuth, Stream-Info)
├── components/overlay/     # Wiederverwendbare Overlay-Komponenten
│   ├── StreamerbotContext  # WebSocket-Verbindung & globaler State
│   ├── TopBar              # Waybar-style Statusleiste
│   ├── ChatPanel           # Chat-Fenster
│   └── ChatMessage         # Einzelne Chat-Nachricht (Shell-Prompt-Style)
├── overlay/                # OBS Browser-Source Seiten
│   ├── just-chatting/      # Webcam + Chat + TopBar
│   ├── topbar-only/        # Nur die Statusleiste
│   ├── stream-starting/    # Boot-Screen vor dem Stream
│   └── afk/                # AFK-Screen
└── setup/                  # Twitch OAuth Setup-Seite
lib/
└── server-state.ts         # Datei-basierte Token & Stream-State Persistenz
```

## Pull Requests

1. Fork erstellen → Feature-Branch anlegen (`git checkout -b feature/mein-feature`)
2. Änderungen committen (`git commit -m 'feat: kurze Beschreibung'`)
3. Branch pushen (`git push origin feature/mein-feature`)
4. Pull Request öffnen

**Commit-Format:** `fix:`, `feat:`, `docs:`, `refactor:`, `style:`

## Code-Style

- TypeScript strict — keine `any` ohne Kommentar
- Inline-`style` für Farben/Pixel-Werte (Tailwind v4-kompatibel)
- Neue Overlays als eigener Ordner unter `app/overlay/`
- Client-Komponenten (`'use client'`) nur wo nötig

## Issues

Bitte Bugs mit Browser-Console-Output und OBS-Version melden.
Feature-Requests gerne als GitHub Discussion starten.
