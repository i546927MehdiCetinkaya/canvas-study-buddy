# Canvas Study Buddy - Desktop Extension

Handleiding voor het bouwen en installeren van de Claude Desktop Extension (.dxt).

## Bouwen

### Vereisten

1. Node.js 20+
2. npm

### Stappen

```bash
# Installeer dependencies
npm install

# Bouw en verpak in een commando
npm run build-extension
```

Dit maakt een `canvas-study-buddy.dxt` bestand aan.

## Installatie voor gebruikers

1. Download `canvas-study-buddy-x.x.x.dxt` uit de [laatste release](https://github.com/i546927MehdiCetinkaya/canvas-study-buddy/releases)
2. Dubbelklik het .dxt bestand
3. Klik **Install** in Claude Desktop
4. Vul je Canvas API token in via de configuratie UI
5. Vul je Canvas Base URL in (standaard: `https://fhict.instructure.com`)
6. Klaar!

## Configuratie

### Canvas API Token
- Ga naar Canvas > Account > Instellingen > Nieuwe toegangstoken
- Kopieer het token en plak het in de configuratie
- Het token wordt veilig opgeslagen in de OS keychain

### Canvas Base URL
Voorbeelden per instelling:
- Fontys: `https://fhict.instructure.com`
- HvA: `https://canvas.hva.nl`
- TU/e: `https://canvas.tue.nl`
- UvA: `https://canvas.uva.nl`

## Extensie structuur

```
canvas-study-buddy.dxt (ZIP archief)
├── manifest.json          # Extensie metadata en configuratie
├── dist/                  # Gecompileerde JavaScript
│   ├── index.js          # Entry point
│   ├── canvasClient.js   # Canvas API client
│   ├── helpers.js        # Helper functies
│   └── tools/            # Alle tools
├── node_modules/         # Gebundelde dependencies
├── package.json
└── icon.png
```

## Automatische releases

Bij elke nieuwe tag (`v*`) wordt automatisch via GitHub Actions:
1. Het project gebouwd
2. De .dxt extensie verpakt
3. Toegevoegd aan een GitHub Release als download

Maak een release:
```bash
git tag v1.0.0
git push origin v1.0.0
```

## Troubleshooting

**"Kan niet verbinden met Canvas"**
- Controleer of de Base URL correct is
- Controleer of het API token geldig is
- Controleer je internetverbinding

**"Tools verschijnen niet"**
- Controleer of de extensie is ingeschakeld in Claude Desktop
- Herstart Claude Desktop

**"Permission denied"**
- Het API token heeft mogelijk niet de juiste rechten
- Maak een nieuw token aan met volledige rechten
