# VR Ship Viewer

WebXR Multi-User VR-Anwendung zum virtuellen Begehen eines 3D-Schiffsmodells (26m x 5m) im Browser oder mit einer Meta Quest 3. Mehrere Nutzer sehen sich gegenseitig als Avatare in Echtzeit.

**Live:** https://vr.bhv.ipv64.net

## Contributors

| Name | Rolle |
|---|---|
| [ElwinEhlers](https://github.com/ElwinEhlers) | Projektidee, Server-Setup, 3D-Modell |
| [Claude Sonnet 4.6](https://claude.ai) (Anthropic) | Architektur, Code, Dokumentation |

---

## Architektur

```
Browser / Meta Quest 3
       |
       | HTTPS + WebSocket
       v
Nginx Proxy Manager  (SSL-Terminierung, Domain vr.bhv.ipv64.net)
       |
       | http://localhost:3000
       v
Node.js / Express (server.js, Port 3000)
   |         |
   |         +-- Socket.io (WebSocket-Backend für Multi-User)
   |              |
   |              +-- Networked-A-Frame Adapter (NAF)
   |
   +-- /public/index.html  (A-Frame 1.5 WebXR-Szene)
       /public/schiff.glb  (3D-Modell, per SCP hochgeladen)
```

**Verwendete Technologien:**

| Komponente | Version | Zweck |
|---|---|---|
| A-Frame | 1.5.0 | WebXR/VR im Browser |
| aframe-extras | 7.2.0 | WASD movement-controls |
| Networked-A-Frame (NAF) | 0.12.x | Multi-User Synchronisierung |
| Socket.io | 4.6.1 | WebSocket-Transport für NAF |
| Express | 4.x | Statischer Dateiserver |
| Node.js | >= 18 | Laufzeitumgebung |
| Systemd | — | Prozess-Management (Autostart) |
| Nginx Proxy Manager | — | SSL + Reverse Proxy |

---

## Voraussetzungen

- Debian/Ubuntu Linux Server
- Node.js >= 18 (`node --version`)
- Nginx Proxy Manager läuft und routet eine Domain

---

## Installation

```bash
# 1. Repository klonen
git clone https://github.com/ElwinEhlers/vr-ship-viewer.git /home/docker/vr
cd /home/docker/vr

# 2. Abhängigkeiten installieren
npm install

# 3. Systemd Service einrichten
sudo cp vrserver.service /etc/systemd/system/vrserver.service
sudo systemctl daemon-reload
sudo systemctl enable vrserver
sudo systemctl start vrserver

# 4. Status prüfen
sudo systemctl status vrserver

# 5. HTTP-Erreichbarkeit testen (sollte 200 zurückgeben)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

---

## 3D-Modell hochladen

Das Schiffsmodell (`schiff.glb`) wird nicht im Repository gespeichert und muss manuell übertragen werden:

```bash
# Von Windows/Mac auf den Server (SCP)
scp schiff.glb root@116.203.177.100:/home/docker/vr/public/schiff.glb
```

Falls das Modell noch als OBJ vorliegt, zuerst konvertieren:

```bash
npm install -g obj2gltf
obj2gltf -i LobsterTail.obj -o schiff.glb
```

Nach dem Upload wird das Modell sofort in der Szene sichtbar (kein Server-Neustart nötig).

---

## Nginx Proxy Manager Konfiguration

| Einstellung | Wert |
|---|---|
| Domain | `vr.bhv.ipv64.net` |
| Forward Hostname/IP | `localhost` |
| Forward Port | `3000` |
| Websockets Support | **ON** (Pflicht für Multi-User) |
| SSL | Let's Encrypt (aktivieren) |

---

## Server-Konfiguration

**Port:** 3000
**Statische Dateien:** `./public/`
**WebSocket-Adapter:** Socket.io (NAF-kompatibel)
**Raum:** `schiff` (hardcoded in index.html)
**Max. Nutzer pro Raum:** 50 (danach automatisches Room-Instancing)

---

## Multi-User

Alle Nutzer, die die URL gleichzeitig öffnen, landen im selben Raum `schiff` und sehen sich gegenseitig als rote Kugel-Avatare. Die Synchronisierung läuft über Networked-A-Frame (NAF) mit Socket.io als Transport.

- Position und Rotation jedes Nutzers werden in Echtzeit übertragen
- Bei Disconnect verschwindet der Avatar automatisch
- Ab 50 gleichzeitigen Nutzern wird automatisch ein zweiter Raum (`schiff--2`) geöffnet

---

## Steuerung

| Eingabe | Aktion |
|---|---|
| WASD | Laufen |
| Maus ziehen | Schauen (Pointer Lock) |
| VR-Button (rechts unten) | Immersive VR-Modus starten |
| Meta Quest 3 Controller | Automatisch erkannt |

---

## Meta Quest 3

1. Meta Browser öffnen
2. URL eingeben: `https://vr.bhv.ipv64.net`
3. Seite lädt normal im Browser
4. VR-Button (rechts unten) antippen → Immersive Mode startet
5. Controller-Bewegung wird automatisch für Navigation genutzt

---

## Entwicklung & Debugging

```bash
# Server-Logs live verfolgen
sudo journalctl -u vrserver -f

# Server manuell neu starten
sudo systemctl restart vrserver

# Direkt testen (ohne Systemd)
node server.js

# HTTP-Antwort prüfen
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

---

## Dateistruktur

```
/home/docker/vr/
├── server.js              # Express + Socket.io + NAF-Serverlogik
├── package.json           # Dependencies
├── vrserver.service       # Systemd Service-Unit
├── .gitignore
├── README.md
└── public/
    ├── index.html         # A-Frame WebXR-Szene
    └── schiff.glb         # 3D-Modell (nicht im Repo, per SCP übertragen)
```
