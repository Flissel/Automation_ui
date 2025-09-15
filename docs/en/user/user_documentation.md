# User Documentation - Trusted Login System
> Migration notice: This documentation is being migrated to English-only. Some sections may temporarily contain German text. If you find any issues, please open an issue or PR.

## Overview

The Trusted Login System is an innovative solution for automating login processes and desktop interactions. This documentation targets end users and provides comprehensive guidance on how to use the system.

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Interface](#user-interface)
3. [Workflow Creation](#workflow-creation)
4. [Workflow Execution](#workflow-execution)
5. [Desktop Integration](#desktop-integration)
6. [Security & Privacy](#security--privacy)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)
9. [Support](#support)

## Getting Started

### System Requirements

**Minimum requirements:**
- Windows 10/11 or macOS 10.15+ or Linux Ubuntu 18.04+
- 4 GB RAM
- 2 GB free disk space
- Internet connection
- Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+)

**Recommended requirements:**
- 8 GB RAM or more
- SSD storage
- Stable broadband internet connection

### Installation

#### Step 1: Download the system
1. Visit the official website
2. Download the latest version for your operating system
3. Run the installer

#### Step 2: Initial setup
1. Launch the Trusted Login System
2. Create an account or sign in
3. Follow the setup wizard
4. Configure basic settings

#### Step 3: Desktop permissions
1. Grant the required permissions to the system:
   - **Windows**: Screen capture and input simulation
   - **macOS**: Accessibility and screen recording
   - **Linux**: X11 access and input simulation

### First Login

1. Open your web browser
2. Navigate to `http://localhost:3000`
3. Enter your credentials
4. Click "Sign in"

## User Interface

### Dashboard

The dashboard is your central hub and provides:

- **Workflow overview**: All your created workflows
- **Execution history**: Recent workflow runs
- **System status**: Current status of the desktop service
- **Quick actions**: Frequently used functions

### Navigation

#### Main Menu
- **Dashboard**: Home with overview
- **Workflows**: Workflow management
- **Executions**: History and monitoring
- **Settings**: System configuration
- **Help**: Documentation and support

#### Toolbar
- **New Workflow**: Create a new workflow
- **Run**: Start the selected workflow
- **Stop**: Stop the running execution
- **Refresh**: Reload the view

### Workflow List

The workflow list shows all available workflows with:
- **Name**: Workflow name
- **Status**: Current status (Active/Inactive/Error)
- **Last Run**: Time of the last execution
- **Success Rate**: Percentage of successful runs
- **Actions**: Edit, Run, Delete

## Workflow Creation

### Basics

A workflow is a sequence of actions that runs automatically. Workflows consist of:
- **Steps**: Individual actions
- **Conditions**: Logical branches
- **Variables**: Dynamic values
- **Error handling**: Response to problems

### Create a New Workflow

#### Step 1: Start the workflow wizard
1. Click "New Workflow"
2. Choose a template or "Empty Workflow"
3. Enter a name and description
4. Click "Create"

#### Step 2: Add steps
1. Click "Add Step"
2. Select the action type:
   - **Screenshot**: Capture screen
   - **Click**: Mouse click on element
   - **Input**: Text input
   - **Wait**: Pause
   - **OCR**: Extract text from image
   - **Condition**: Logical branching

#### Step 3: Configure step
Depending on the action type, configure:

**Screenshot step:**
- Select screen area
- Set file name
- Quality settings

**Click step:**
- Define target position
- Click type (Left/Right/Double)
- Wait time after click

**Input step:**
- Enter text or variable
- Typing speed
- Special keys (Enter, Tab, etc.)

**OCR step:**
- Select image source
- Define text area
- Recognition language
- Confidence threshold

### Advanced features

#### Use variables
```
${variable_name}     # Use variable
${screenshot_path}   # Path of the last screenshot
${ocr_text}         # Text recognized from OCR
${current_time}     # Current time
${random_number}    # Random number
```

#### Create conditions
1. Add a "Condition" step
2. Define the condition:
   ```
   ${ocr_text} contains "Login successful"
   ${screenshot_path} exists
   ${variable} equals "Value"
   ```
3. Configure "If true" and "If false" paths

#### Implement loops
1. Use "Loop" steps
2. Define exit conditions
3. Set maximum iterations

### Workflow templates

#### Standard login
```
1. Capture screenshot
2. Find username field (OCR)
3. Click username field
4. Enter username
5. Press Tab
6. Enter password
7. Press Enter
8. Verify success (OCR)
```

#### Fill web form
```
1. Capture screenshot
2. Find first field
3. Enter form data
4. Perform validation
5. Submit
6. Check confirmation
```

#### Data extraction
```
```

## Workflow Execution

### Manueller Start

1. Wählen Sie einen Workflow aus der Liste
2. Klicken Sie auf "Ausführen"
3. Bestätigen Sie die Ausführung
4. Überwachen Sie den Fortschritt

### Geplante Ausführung

#### Zeitplan erstellen
1. Öffnen Sie die Workflow-Einstellungen
2. Aktivieren Sie "Geplante Ausführung"
3. Konfigurieren Sie den Zeitplan:
   - **Einmalig**: Bestimmtes Datum/Zeit
   - **Täglich**: Jeden Tag zur gleichen Zeit
   - **Wöchentlich**: Bestimmte Wochentage
   - **Monatlich**: Bestimmte Tage im Monat
   - **Cron-Ausdruck**: Erweiterte Zeitplanung

#### Beispiel-Zeitpläne
```
# Jeden Tag um 9:00 Uhr
0 9 * * *

# Montag bis Freitag um 8:30 Uhr
30 8 * * 1-5

# Jeden ersten Tag des Monats um 12:00 Uhr
0 12 1 * *

# Alle 30 Minuten
*/30 * * * *
```

### Überwachung

#### Echtzeit-Monitoring
- **Fortschrittsbalken**: Zeigt aktuellen Schritt
- **Live-Log**: Detaillierte Ausführungsinformationen
- **Screenshot-Vorschau**: Aktuelle Bildschirmaufnahme
- **Variablen-Werte**: Aktuelle Variablenwerte

#### Ausführungshistorie
- **Zeitstempel**: Wann wurde ausgeführt
- **Dauer**: Wie lange hat es gedauert
- **Status**: Erfolgreich/Fehlgeschlagen/Abgebrochen
- **Fehlerdetails**: Bei Fehlern detaillierte Informationen
- **Logs**: Vollständige Ausführungsprotokolle

### Fehlerbehandlung

#### Automatische Wiederholung
1. Konfigurieren Sie Retry-Einstellungen:
   - **Anzahl Versuche**: Maximale Wiederholungen
   - **Wartezeit**: Pause zwischen Versuchen
   - **Exponential Backoff**: Zunehmende Wartezeiten

#### Fehler-Benachrichtigungen
- **E-Mail**: Automatische E-Mail bei Fehlern
- **Webhook**: HTTP-Benachrichtigung an externe Systeme
- **Desktop-Benachrichtigung**: Popup-Meldung

## Desktop-Integration

### Screenshot-Funktionen

#### Vollbild-Screenshot
1. Verwenden Sie den "Screenshot"-Schritt
2. Wählen Sie "Vollbild"
3. Konfigurieren Sie Dateiname und Pfad

#### Bereich-Screenshot
1. Wählen Sie "Bereich-Screenshot"
2. Definieren Sie Koordinaten:
   - **X**: Horizontale Position
   - **Y**: Vertikale Position
   - **Breite**: Bereichsbreite
   - **Höhe**: Bereichshöhe

#### Fenster-Screenshot
1. Wählen Sie "Aktives Fenster"
2. Optional: Spezifisches Fenster nach Titel

### Maus-Interaktionen

#### Klick-Aktionen
- **Linksklick**: Standard-Auswahl
- **Rechtsklick**: Kontextmenü öffnen
- **Doppelklick**: Datei/Ordner öffnen
- **Mittelklick**: Neuer Tab (Browser)

#### Drag & Drop
1. Definieren Sie Startposition
2. Definieren Sie Zielposition
3. Konfigurieren Sie Geschwindigkeit

#### Scroll-Aktionen
- **Vertikal scrollen**: Hoch/Runter
- **Horizontal scrollen**: Links/Rechts
- **Scroll-Geschwindigkeit**: Langsam/Normal/Schnell

### Tastatur-Eingaben

#### Text-Eingabe
```
Hallo Welt                    # Einfacher Text
${variable_name}              # Variable
Benutzername: ${username}     # Text mit Variable
```

#### Spezielle Tasten
```
{ENTER}          # Enter-Taste
{TAB}            # Tab-Taste
{ESC}            # Escape-Taste
{CTRL+C}         # Strg+C (Kopieren)
{CTRL+V}         # Strg+V (Einfügen)
{ALT+TAB}        # Alt+Tab (Fenster wechseln)
{F1}             # Funktionstasten
{HOME}           # Pos1-Taste
{END}            # Ende-Taste
{PAGEUP}         # Bild hoch
{PAGEDOWN}       # Bild runter
```

#### Tastenkombinationen
```
{CTRL+SHIFT+N}   # Neues privates Fenster
{CTRL+ALT+DEL}   # Task-Manager (Windows)
{CMD+SPACE}      # Spotlight (macOS)
```

### OCR (Texterkennung)

#### Grundlegende OCR
1. Nehmen Sie einen Screenshot auf
2. Fügen Sie einen "OCR"-Schritt hinzu
3. Wählen Sie das Quellbild
4. Konfigurieren Sie die Sprache

#### Erweiterte OCR-Einstellungen
- **Sprache**: Deutsch, Englisch, etc.
- **Konfidenz**: Mindest-Genauigkeit (0-100%)
- **Whitelist**: Erlaubte Zeichen
- **Blacklist**: Verbotene Zeichen
- **Preprocessing**: Bildverbesserung

#### OCR-Bereiche definieren
```
# Koordinaten-basiert
X: 100, Y: 200, Breite: 300, Höhe: 50

# Relativ zum Screenshot
Links: 10%, Oben: 20%, Breite: 50%, Höhe: 10%
```

### Fenster-Management

#### Fenster finden
```python
# Nach Titel
find_window("Notepad")
find_window("*Chrome*")  # Wildcard

# Nach Klasse
find_window_by_class("Notepad")

# Nach Prozess
find_window_by_process("notepad.exe")
```

#### Fenster-Aktionen
- **Aktivieren**: Fenster in Vordergrund bringen
- **Minimieren**: Fenster minimieren
- **Maximieren**: Fenster maximieren
- **Schließen**: Fenster schließen
- **Verschieben**: Fenster-Position ändern
- **Größe ändern**: Fenster-Größe anpassen

## Sicherheit & Datenschutz

### Datenschutz-Grundsätze

1. **Lokale Verarbeitung**: Alle Daten bleiben auf Ihrem System
2. **Verschlüsselung**: Sensible Daten werden verschlüsselt gespeichert
3. **Minimale Berechtigung**: Nur notwendige Systemzugriffe
4. **Transparenz**: Vollständige Kontrolle über Ihre Daten

### Sichere Passwort-Verwaltung

#### Passwort-Speicherung
- Passwörter werden verschlüsselt gespeichert
- Verwendung von AES-256 Verschlüsselung
- Master-Passwort für zusätzliche Sicherheit

#### Best Practices
1. **Starke Passwörter**: Mindestens 12 Zeichen
2. **Einzigartige Passwörter**: Für jeden Service
3. **Regelmäßige Updates**: Passwörter regelmäßig ändern
4. **Zwei-Faktor-Authentifizierung**: Wo möglich aktivieren

### Berechtigungen

#### Windows-Berechtigungen
- **Bildschirmaufnahme**: Für Screenshots
- **Eingabesimulation**: Für Maus/Tastatur
- **Dateisystem**: Für Workflow-Speicherung

#### macOS-Berechtigungen
- **Bedienungshilfen**: Für UI-Automatisierung
- **Bildschirmaufnahme**: Für Screenshots
- **Dateien und Ordner**: Für Datenzugriff

#### Linux-Berechtigungen
- **X11-Zugriff**: Für Display-Interaktion
- **Input-Geräte**: Für Maus/Tastatur
- **Dateisystem**: Für Workflow-Verwaltung

### Audit & Logging

#### Aktivitätsprotokolle
- Alle Workflow-Ausführungen werden protokolliert
- Zeitstempel und Benutzer-Informationen
- Erfolg/Fehler-Status
- Keine sensiblen Daten in Logs

#### Sicherheitsereignisse
- Fehlgeschlagene Anmeldeversuche
- Ungewöhnliche Aktivitäten
- Systemzugriffe
- Konfigurationsänderungen

## Fehlerbehebung

### Häufige Probleme

#### Problem: Workflow startet nicht
**Mögliche Ursachen:**
- Desktop-Service nicht verfügbar
- Unzureichende Berechtigungen
- Workflow-Konfigurationsfehler

**Lösungsschritte:**
1. Überprüfen Sie den Service-Status im Dashboard
2. Starten Sie den Desktop-Service neu
3. Überprüfen Sie die Workflow-Konfiguration
4. Prüfen Sie die Systemberechtigungen

#### Problem: OCR erkennt keinen Text
**Mögliche Ursachen:**
- Schlechte Bildqualität
- Falsche Sprache eingestellt
- Zu niedriger Konfidenz-Wert

**Lösungsschritte:**
1. Erhöhen Sie die Screenshot-Qualität
2. Überprüfen Sie die OCR-Sprache
3. Senken Sie den Konfidenz-Schwellenwert
4. Verwenden Sie Bildvorverarbeitung

#### Problem: Klicks treffen nicht das Ziel
**Mögliche Ursachen:**
- Bildschirmauflösung geändert
- Fenster-Position verschoben
- Skalierung aktiviert

**Lösungsschritte:**
1. Aktualisieren Sie die Koordinaten
2. Verwenden Sie relative Positionierung
3. Überprüfen Sie die Display-Skalierung
4. Kalibrieren Sie die Maus-Koordinaten

### Diagnose-Tools

#### System-Informationen
1. Gehen Sie zu "Einstellungen" > "System"
2. Klicken Sie auf "Diagnose ausführen"
3. Überprüfen Sie die Ergebnisse

#### Log-Analyse
1. Öffnen Sie "Einstellungen" > "Logs"
2. Filtern Sie nach Zeitraum und Typ
3. Suchen Sie nach Fehlermeldungen
4. Exportieren Sie Logs für Support

#### Verbindungstest
1. Testen Sie die Backend-Verbindung
2. Überprüfen Sie die Desktop-Service-Verbindung
3. Prüfen Sie die Netzwerk-Konnektivität

### Performance-Optimierung

#### Workflow-Optimierung
1. **Wartezeiten reduzieren**: Nur notwendige Pausen
2. **Screenshot-Qualität**: Balance zwischen Qualität und Geschwindigkeit
3. **OCR-Bereiche**: Kleinere Bereiche für bessere Performance
4. **Parallel-Ausführung**: Unabhängige Schritte parallelisieren

#### System-Optimierung
1. **RAM**: Mindestens 8 GB für optimale Performance
2. **CPU**: Moderne Multi-Core-Prozessoren bevorzugt
3. **Speicher**: SSD für bessere I/O-Performance
4. **Netzwerk**: Stabile Verbindung für Cloud-Features

## FAQ

### Allgemeine Fragen

**Q: Ist das System kostenlos?**
A: Das System bietet eine kostenlose Basis-Version mit eingeschränkten Features. Premium-Features sind über Abonnements verfügbar.

**Q: Welche Betriebssysteme werden unterstützt?**
A: Windows 10/11, macOS 10.15+, und Linux (Ubuntu 18.04+) werden vollständig unterstützt.

**Q: Kann ich Workflows mit anderen teilen?**
A: Ja, Workflows können exportiert und mit anderen Benutzern geteilt werden. Sensible Daten werden dabei automatisch entfernt.

**Q: Wie sicher sind meine Daten?**
A: Alle Daten werden lokal gespeichert und verschlüsselt. Das System sendet keine sensiblen Informationen an externe Server.

### Technische Fragen

**Q: Kann ich eigene Skripte integrieren?**
A: Ja, das System unterstützt benutzerdefinierte Python- und JavaScript-Skripte für erweiterte Funktionalität.

**Q: Wie viele Workflows kann ich erstellen?**
A: In der kostenlosen Version sind 10 Workflows möglich. Premium-Versionen haben keine Begrenzung.

**Q: Unterstützt das System mehrere Monitore?**
A: Ja, Multi-Monitor-Setups werden vollständig unterstützt. Sie können spezifische Monitore für Screenshots auswählen.

**Q: Kann ich Workflows zeitgesteuert ausführen?**
A: Ja, das System bietet umfassende Zeitplanungs-Optionen von einfachen Intervallen bis zu komplexen Cron-Ausdrücken.

### Workflow-Fragen

**Q: Wie kann ich Workflows debuggen?**
A: Verwenden Sie den Debug-Modus, der jeden Schritt einzeln ausführt und detaillierte Informationen anzeigt.

**Q: Können Workflows auf Ereignisse reagieren?**
A: Ja, Workflows können durch Dateisystem-Änderungen, Netzwerk-Ereignisse oder externe Webhooks ausgelöst werden.

**Q: Wie handle ich dynamische Inhalte?**
A: Verwenden Sie OCR und Bildvergleich, um auf sich ändernde Inhalte zu reagieren. Implementieren Sie Retry-Logik für robuste Workflows.

## Support

### Hilfe erhalten

#### Dokumentation
- **Online-Hilfe**: Umfassende Dokumentation auf der Website
- **Video-Tutorials**: Schritt-für-Schritt-Anleitungen
- **Beispiel-Workflows**: Vorgefertigte Workflows zum Lernen

#### Community
- **Forum**: Diskussionen mit anderen Benutzern
- **Discord**: Echtzeit-Chat und Support
- **GitHub**: Open-Source-Beiträge und Issues

#### Direkter Support
- **E-Mail**: support@trusted-login-system.com
- **Ticket-System**: Für technische Probleme
- **Live-Chat**: Für Premium-Benutzer

### Feedback & Verbesserungsvorschläge

#### Feature-Requests
1. Besuchen Sie unser Feature-Request-Portal
2. Beschreiben Sie Ihren Vorschlag detailliert
3. Stimmen Sie für bestehende Vorschläge ab
4. Verfolgen Sie die Entwicklung

#### Bug-Reports
1. Sammeln Sie relevante Informationen:
   - Betriebssystem und Version
   - Workflow-Konfiguration
   - Fehlermeldungen und Logs
   - Schritte zur Reproduktion
2. Erstellen Sie einen detaillierten Bug-Report
3. Fügen Sie Screenshots oder Videos hinzu
4. Verfolgen Sie den Bearbeitungsstatus

### Schulungen & Workshops

#### Online-Schulungen
- **Grundlagen-Kurs**: Einführung in die Workflow-Erstellung
- **Fortgeschrittenen-Kurs**: Komplexe Automatisierungen
- **Administrator-Schulung**: System-Administration und Wartung

#### Workshops
- **Workflow-Design**: Best Practices für effiziente Workflows
- **Sicherheit**: Sichere Konfiguration und Datenschutz
- **Integration**: Anbindung an externe Systeme

---

*Diese Dokumentation wird regelmäßig aktualisiert. Letzte Aktualisierung: Januar 2024*

*Für die neueste Version besuchen Sie: https://docs.trusted-login-system.com*