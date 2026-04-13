# Changelog

Alle noemenswaardige wijzigingen in dit project worden hier gedocumenteerd.

## [1.0.0] - 2026-04-13

### Toegevoegd
- **28 student-gerichte tools** voor het ophalen van Canvas data
- **12 slimme prompts/workflows** voor dagelijks studiegebruik
- Urgentie systeem met visuele indicatoren
- Nederlandse output en comments

### Tools

#### Cursussen & Structuur
- `get-all-courses` - Alle vakken inclusief afgeronde
- `get-course-overview` - Compleet vakoverzicht in een call
- `get-course-syllabus` - Syllabus inhoud
- `get-course-files` - Bestanden, filterbaar op type
- `get-course-people` - Docenten en medestudenten

#### Opdrachten & Deadlines
- `get-upcoming-deadlines` - Deadlines across alle vakken
- `get-missed-deadlines` - Gemiste deadlines
- `get-submission-status` - Inleverstatus per vak
- `get-assignment-details` - Volledige opdracht info met rubric
- `get-assignment-rubric` - Rubric criteria

#### Cijfers & Feedback
- `get-my-grades` - Cijfers per vak
- `get-assignment-feedback` - Docent feedback op een opdracht
- `get-all-feedback` - Alle feedback chronologisch
- `get-unread-feedback` - Nieuwe feedback
- `get-rubric-scores` - Per criterium scores

#### Content & Pagina's
- `get-page-content` - Pagina inhoud
- `search-all-content` - Zoeken door alles
- `get-module-content` - Module inhoud inclusief pagina's
- `get-recent-updates` - Recente wijzigingen

#### Aankondigingen & Communicatie
- `get-course-announcements` - Per vak
- `get-all-announcements` - Alle vakken
- `get-unread-announcements` - Ongelezen
- `get-inbox-messages` - Canvas inbox
- `get-discussion-posts` - Discussies

#### Planning & Voortgang
- `get-study-progress` - Voortgang per vak
- `get-course-calendar` - Kalender events
- `get-quiz-results` - Quiz resultaten
- `get-learning-outcomes` - Leerdoelen

### Prompts
- `morning-briefing` - Dagelijkse start
- `get-todo` - Volledige todo lijst
- `week-overview` - Weekoverzicht
- `vak-deep-dive` - Diepgaand vakoverzicht
- `assignment-briefing` - Opdracht briefing
- `check-feedback` - Feedback analyse
- `study-gap-analysis` - Gap analyse
- `monday-morning` - Weekstart planning
- `deadline-pressure` - Deadline druk analyse
- `end-of-week` - Weekafsluiting
- `health-check` - Studie gezondheidscheck
- `catch-up-plan` - Inhaalplan

### Gebaseerd op
- Geforkt van [r-huijts/canvas-mcp](https://github.com/r-huijts/canvas-mcp)
- Omgebouwd van docent-gerichte tools naar student-gerichte Study Buddy
