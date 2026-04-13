# Canvas Study Buddy

Jouw persoonlijke studiebegeleider voor Canvas LMS. Een MCP server voor Claude Desktop die alles weet over je studie en slimme verbanden legt tussen je vakken, deadlines, cijfers en feedback.

Geforkt van [r-huijts/canvas-mcp](https://github.com/r-huijts/canvas-mcp) en omgebouwd van docent-gerichte tools naar een volwaardige student Study Buddy.

## Voordat je begint: Canvas API Token aanmaken

Dit heb je nodig voor elke installatiemethode:

1. Ga naar [Canvas](https://fhict.instructure.com) > **Account** > **Instellingen**
2. Scroll naar **"Goedgekeurde integraties"**
3. Klik op **"+ Nieuwe toegangstoken"**
4. Geef het een naam (bijv. "Study Buddy") en klik **Genereer token**
5. **Kopieer het token** - je kunt het maar 1x zien!

## Installatie (One-Click met Claude Desktop Extension)

De makkelijkste manier - geen terminal nodig:

1. Download `canvas-study-buddy-x.x.x.dxt` uit de [laatste release](https://github.com/i546927MehdiCetinkaya/canvas-study-buddy/releases)
2. Dubbelklik het `.dxt` bestand
3. Klik **Install** in Claude Desktop
4. Vul je **Canvas API Token** in (zie hierboven)
5. Laat de **Base URL** op `https://fhict.instructure.com` staan (Fontys)
6. Klaar! Open Claude Desktop en vraag bijv. *"Wat zijn mijn deadlines?"*

## Installatie (Handmatig)

### Vereisten
- [Node.js 20+](https://nodejs.org/)
- Een Canvas API token (zie hierboven)

### Stap 1: Clone en bouw

```bash
git clone https://github.com/i546927MehdiCetinkaya/canvas-study-buddy.git
cd canvas-study-buddy
npm install
npm run build
```

### Stap 2: Configureer je token

```bash
cp .env.example .env
```

Open `.env` en vervang `your_canvas_api_token_here` met je echte token:

```env
CANVAS_API_TOKEN=jouw_echte_token_hier
CANVAS_BASE_URL=https://fhict.instructure.com
```

### Stap 3: Koppel aan Claude Desktop

Open Claude Desktop instellingen en voeg deze MCP server toe aan `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "canvas-study-buddy": {
      "command": "node",
      "args": ["/volledig/pad/naar/canvas-study-buddy/dist/index.js"],
      "env": {
        "CANVAS_API_TOKEN": "jouw_echte_token_hier",
        "CANVAS_BASE_URL": "https://fhict.instructure.com"
      }
    }
  }
}
```

> **Tip:** Vervang `/volledig/pad/naar/` met het daadwerkelijke pad waar je de repo hebt gecloned.

### Stap 4: Test

Herstart Claude Desktop en vraag: *"Wat zijn mijn vakken?"*

## Tools (28)

### Cursussen & Structuur
| Tool | Beschrijving |
|------|-------------|
| `get-all-courses` | Alle vakken inclusief afgeronde, met metadata |
| `get-course-overview` | Compleet vakoverzicht in een call |
| `get-course-syllabus` | Syllabus inhoud van een vak |
| `get-course-files` | Bestanden, filterbaar op type (pdf, docx, etc) |
| `get-course-people` | Docenten en medestudenten |

### Opdrachten & Deadlines
| Tool | Beschrijving |
|------|-------------|
| `get-upcoming-deadlines` | Deadlines across alle vakken, gesorteerd op urgentie |
| `get-missed-deadlines` | Gemiste of te late deadlines |
| `get-submission-status` | Per vak: wat ingeleverd, open, te laat |
| `get-assignment-details` | Volledige opdracht met rubric en requirements |
| `get-assignment-rubric` | Rubric criteria van een opdracht |

### Cijfers & Feedback
| Tool | Beschrijving |
|------|-------------|
| `get-my-grades` | Cijfers per vak met individuele scores |
| `get-assignment-feedback` | Feedback van docent op een opdracht |
| `get-all-feedback` | Alle feedback across alle vakken |
| `get-unread-feedback` | Alleen nieuwe, onverwerkte feedback |
| `get-rubric-scores` | Per criterium scores met visuele balk |

### Content & Pagina's
| Tool | Beschrijving |
|------|-------------|
| `get-page-content` | Pagina inhoud ophalen |
| `search-all-content` | Zoeken door alles: pagina's, modules, opdrachten, bestanden |
| `get-module-content` | Alle content van een module inclusief pagina-inhoud |
| `get-recent-updates` | Wat is er recent aangepast op Canvas |

### Aankondigingen & Communicatie
| Tool | Beschrijving |
|------|-------------|
| `get-course-announcements` | Aankondigingen per vak |
| `get-all-announcements` | Alle aankondigingen across alle vakken |
| `get-unread-announcements` | Alleen ongelezen aankondigingen |
| `get-inbox-messages` | Canvas inbox berichten |
| `get-discussion-posts` | Discussie posts van een vak |

### Planning & Voortgang
| Tool | Beschrijving |
|------|-------------|
| `get-study-progress` | Voortgang per vak met visuele balk |
| `get-course-calendar` | Kalender events en deadlines |
| `get-quiz-results` | Resultaten van gemaakte quizzen |
| `get-learning-outcomes` | Leerdoelen per vak |

## Slimme Prompts (12)

### Dagelijks gebruik
| Prompt | Beschrijving |
|--------|-------------|
| `morning-briefing` | Dagelijkse start: aankondigingen, deadlines, feedback |
| `get-todo` | Volledige todo lijst gesorteerd op urgentie |
| `week-overview` | Weekoverzicht met planning en werklast |

### Studie hulp
| Prompt | Beschrijving |
|--------|-------------|
| `vak-deep-dive` | Alles van een vak: syllabus, modules, opdrachten, cijfers |
| `assignment-briefing` | Alles over een opdracht: rubric, deadline, tips |
| `check-feedback` | Feedback analyse: patronen, verbeterpunten, sterke punten |
| `study-gap-analysis` | Wat heb je gemist? Modules, opdrachten, content |

### Planning
| Prompt | Beschrijving |
|--------|-------------|
| `monday-morning` | Weekstart planning met prioriteiten |
| `deadline-pressure` | Deadline druk analyse met tijdverdeling |
| `end-of-week` | Weekafsluiting: gedaan, open, volgende week |

### Proactief
| Prompt | Beschrijving |
|--------|-------------|
| `health-check` | Studie gezondheidscheck: achterstand, dalende cijfers |
| `catch-up-plan` | Inhaalplan voor een vak of alle vakken |

## Urgentie systeem

Deadlines worden automatisch gemarkeerd met urgentie:

- :red_circle: **Kritiek**: deadline < 24 uur of gemist
- :orange_circle: **Urgent**: deadline < 3 dagen
- :yellow_circle: **Let op**: deadline < 7 dagen
- :green_circle: **Ok**: deadline > 7 dagen

## Voorbeeldvragen

Stel deze vragen aan Claude met de Study Buddy actief:

- "Wat zijn mijn deadlines deze week?"
- "Geef me een overzicht van het vak Cyber Security"
- "Welke feedback heb ik recent gekregen?"
- "Waar loop ik achter?"
- "Maak een inhaalplan voor Software Engineering"
- "Wat moet ik vandaag doen?"
- "Zoek naar 'machine learning' in al mijn vakken"
- "Hoe sta ik ervoor met mijn cijfers?"

## Roadmap

### Multi-School Support
De huidige versie is geconfigureerd voor Fontys (`fhict.instructure.com`). Toekomstige versie ondersteunt meerdere Nederlandse instellingen via een `SCHOOL` env variabele:

```env
SCHOOL=fontys
# of
CANVAS_BASE_URL=https://custom.instructure.com
```

Geplande presets:
| School | URL |
|--------|-----|
| Fontys | `fhict.instructure.com` |
| HvA | `canvas.hva.nl` |
| TU/e | `canvas.tue.nl` |
| UvA | `canvas.uva.nl` |
| VU | `canvas.vu.nl` |
| HU | `canvas.hu.nl` |
| Saxion | `saxion.instructure.com` |

### Calendar Export (.ics)
Alle deadlines exporteren als `.ics` bestand voor Google Calendar, Apple Calendar en Outlook:

```
export-to-calendar --days 30 --onlyOpen
```

Genereert een downloadbaar `canvas-deadlines.ics` bestand met alle deadlines als kalender events.

## Ontwikkeling

```bash
# Development mode
npm run dev

# Build
npm run build

# Extensie bouwen
npm run build-extension
```

## Licentie

MIT - Zie [LICENSE](LICENSE)

## Credits

Gebaseerd op [canvas-mcp](https://github.com/r-huijts/canvas-mcp) door R.Huijts.
