import { z } from "zod";
import { CanvasClient } from "../canvasClient.js";

export function registerPrompts(server: any, _canvas: CanvasClient) {
  const today = new Date().toISOString().split('T')[0];

  // Prompt: morning-briefing
  server.prompt(
    "morning-briefing",
    "Dagelijkse briefing: nieuwe aankondigingen, deadlines vandaag en morgen, ongelezen feedback, wat urgent is",
    {},
    () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Geef mijn ochtend briefing voor ${today}. Volg deze stappen:

1. Gebruik get-unread-announcements om nieuwe aankondigingen op te halen.
2. Gebruik get-upcoming-deadlines met days=2 om deadlines van vandaag en morgen te zien.
3. Gebruik get-unread-feedback om nieuwe feedback te checken.

Presenteer dit als een compact overzicht:
- Begin met urgente items (\u{1F534} en \u{1F7E0})
- Dan nieuwe aankondigingen
- Dan nieuwe feedback
- Eindig met een korte aanbeveling wat als eerste aan te pakken

Houd het kort en actionable. Gebruik Nederlandse tekst.
Eindig met: "Wat wil je als eerste aanpakken?"`
        }
      }]
    })
  );

  // Prompt: get-todo
  server.prompt(
    "get-todo",
    "Volledige todo lijst: alles niet ingeleverd, gesorteerd op urgentie",
    {},
    () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Maak mijn volledige todo lijst voor ${today}. Volg deze stappen:

1. Gebruik get-upcoming-deadlines met days=30 om alle aankomende deadlines op te halen.
2. Gebruik get-missed-deadlines om gemiste deadlines op te halen.

Presenteer dit als een gesorteerde todo lijst:
- Sorteer op urgentie: \u{1F534} < 24 uur, \u{1F7E0} < 3 dagen, \u{1F7E1} < 7 dagen, \u{1F7E2} > 7 dagen
- Vermeld bij elke opdracht of er een rubric beschikbaar is
- Gemiste deadlines bovenaan met \u{1F534}
- Geef per item aan hoeveel punten het waard is

Gebruik Nederlandse tekst.
Eindig met: "Wat wil je als eerste aanpakken?"`
        }
      }]
    })
  );

  // Prompt: week-overview
  server.prompt(
    "week-overview",
    "Deze week: alle deadlines, geplande toetsen, nieuwe content",
    {},
    () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Geef een overzicht van deze week (vanaf ${today}). Volg deze stappen:

1. Gebruik get-upcoming-deadlines met days=7 voor alle deadlines deze week.
2. Gebruik get-all-announcements met days=7 voor recente aankondigingen.
3. Gebruik get-recent-updates met days=7 voor nieuwe content.

Presenteer dit als een weekoverzicht:
- Groepeer per dag (maandag t/m vrijdag)
- Toon deadlines met urgentie-emoji
- Toon nieuwe content en aankondigingen
- Geef een inschatting van de werklast per dag (licht/gemiddeld/zwaar)

Gebruik Nederlandse tekst.
Eindig met een aanbeveling voor de verdeling van studietijd.`
        }
      }]
    })
  );

  // Prompt: vak-deep-dive
  server.prompt(
    "vak-deep-dive",
    "Alles van \u{00E9}\u{00E9}n vak: syllabus, modules, opdrachten, cijfers, feedback, aankondigingen",
    {
      vaknaam: z.string().describe("De naam van het vak")
    },
    ({ vaknaam }: { vaknaam: string }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Geef een volledig overzicht van het vak "${vaknaam}". Volg deze stappen:

1. Gebruik get-all-courses om het vak ID te vinden voor "${vaknaam}".
2. Gebruik get-course-overview voor het algemene overzicht.
3. Gebruik get-course-syllabus voor de syllabus.
4. Gebruik get-submission-status voor de opdrachtstatus.
5. Gebruik get-my-grades met het courseId voor de cijfers.
6. Gebruik get-course-announcements voor recente aankondigingen.

Presenteer dit als een compleet vakdossier:
- Vakinformatie en syllabus samenvatting
- Alle modules met hun inhoud
- Openstaande opdrachten met deadlines en urgentie
- Cijfers en beoordelingen
- Recente aankondigingen
- Overall voortgang

Gebruik Nederlandse tekst.
Eindig met: "Wat wil je als eerste aanpakken?"`
        }
      }]
    })
  );

  // Prompt: assignment-briefing
  server.prompt(
    "assignment-briefing",
    "Alles over \u{00E9}\u{00E9}n opdracht: beschrijving, rubric, deadline, requirements",
    {
      opdrachtnaam: z.string().describe("De naam van de opdracht")
    },
    ({ opdrachtnaam }: { opdrachtnaam: string }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Geef een volledige briefing voor de opdracht "${opdrachtnaam}". Volg deze stappen:

1. Gebruik get-all-courses om de vakken te vinden.
2. Zoek de opdracht met search-all-content met query "${opdrachtnaam}".
3. Gebruik get-assignment-details voor de volledige beschrijving.
4. Gebruik get-assignment-rubric als er een rubric is.
5. Gebruik get-assignment-feedback als er al eerder feedback is gegeven op dit vak.

Presenteer dit als een opdracht briefing:
- Volledige beschrijving
- Rubric criteria (als beschikbaar) met tips per criterium
- Deadline en urgentie
- Submission requirements (wat en hoe inleveren)
- Eerder gegeven feedback op vergelijkbare opdrachten
- Aanbeveling hoe te beginnen

Gebruik Nederlandse tekst.
Eindig met: "Wat wil je als eerste aanpakken?"`
        }
      }]
    })
  );

  // Prompt: check-feedback
  server.prompt(
    "check-feedback",
    "Alle recente feedback samengevat: verbeterpunten, sterke punten, patronen",
    {},
    () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Analyseer al mijn recente feedback. Volg deze stappen:

1. Gebruik get-all-feedback met days=60 voor alle feedback.
2. Gebruik get-unread-feedback voor de nieuwste items.

Analyseer de feedback en presenteer:
- Samenvatting per vak
- Terugkerende verbeterpunten (wat komt meerdere keren terug?)
- Sterke punten (wat doe je consistent goed?)
- Concrete tips voor verbetering
- Trend: gaat het de goede kant op?

Gebruik Nederlandse tekst.
Eindig met: "Wat wil je als eerste aanpakken?"`
        }
      }]
    })
  );

  // Prompt: study-gap-analysis
  server.prompt(
    "study-gap-analysis",
    "Vergelijk wat er in Canvas staat met wat je hebt ingeleverd: wat heb je gemist?",
    {},
    () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Doe een gap analyse van mijn studie. Volg deze stappen:

1. Gebruik get-all-courses voor alle vakken.
2. Per vak, gebruik get-study-progress voor de voortgang.
3. Gebruik get-missed-deadlines voor gemiste items.

Analyseer en presenteer:
- Per vak: welke modules zijn nog niet bekeken?
- Welke opdrachten zijn niet ingeleverd?
- Waar is nieuwe content die je nog niet hebt gezien?
- Welke vakken hebben de meeste aandacht nodig?
- Prioriteer de gaps op impact (punten, deadlines)

Gebruik Nederlandse tekst.
Eindig met: "Wat wil je als eerste aanpakken?"`
        }
      }]
    })
  );

  // Prompt: monday-morning
  server.prompt(
    "monday-morning",
    "Weekstart: alles wat deze week speelt, geprioriteerd op urgentie en zwaarte",
    {},
    () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Het is maandagochtend (${today}). Geef mijn weekstart briefing. Volg deze stappen:

1. Gebruik get-upcoming-deadlines met days=7 voor deze week.
2. Gebruik get-unread-announcements voor nieuwe aankondigingen.
3. Gebruik get-unread-feedback voor nieuwe feedback.
4. Gebruik get-missed-deadlines voor achterstallig werk.

Presenteer als weekstart plan:
- Urgente items die direct aandacht nodig hebben
- Dag-per-dag planning voor de week
- Prioriteer op urgentie (\u{1F534}\u{1F7E0}\u{1F7E1}\u{1F7E2}) en puntenwaarde
- Stel een realistisch studieplan voor
- Markeer als iets te veel is voor \u{00E9}\u{00E9}n week

Gebruik Nederlandse tekst.
Eindig met: "Wat wil je als eerste aanpakken?"`
        }
      }]
    })
  );

  // Prompt: deadline-pressure
  server.prompt(
    "deadline-pressure",
    "Deadline druk analyse: hoeveel deadlines, hoe verdeel je je tijd",
    {},
    () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Analyseer mijn deadline druk. Volg deze stappen:

1. Gebruik get-upcoming-deadlines met days=14 voor alle aankomende deadlines.
2. Gebruik get-study-progress voor de voortgang per vak.

Analyseer en presenteer:
- Hoeveel deadlines per dag/week
- Welk vak vraagt de meeste aandacht
- Verdeel beschikbare studietijd over de deadlines
- Waarschuw als er te veel tegelijk is
- Stel prioriteiten voor (wat kan eventueel later?)

Gebruik Nederlandse tekst.
Eindig met een concreet tijdschema suggestie.`
        }
      }]
    })
  );

  // Prompt: end-of-week
  server.prompt(
    "end-of-week",
    "Weekafsluiting: wat heb je gedaan, wat staat nog open, wat absoluut niet kan wachten",
    {},
    () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Het is het einde van de week (${today}). Geef mijn weekafsluiting. Volg deze stappen:

1. Gebruik get-study-progress voor de voortgang deze week.
2. Gebruik get-upcoming-deadlines met days=7 voor volgende week.
3. Gebruik get-missed-deadlines voor wat er deze week is blijven liggen.
4. Gebruik get-all-feedback met days=7 voor feedback deze week.

Presenteer als weekafsluiting:
- Wat is er deze week gedaan/ingeleverd
- Wat staat er nog open
- Wat kan door naar volgende week
- Wat absoluut NIET kan wachten (met reden)
- Preview van volgende week

Gebruik Nederlandse tekst.`
        }
      }]
    })
  );

  // Prompt: health-check
  server.prompt(
    "health-check",
    "Studie gezondheidscheck: achterstand, dalende cijfers, onverwerkte feedback",
    {},
    () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Doe een studie gezondheidscheck. Volg deze stappen:

1. Gebruik get-all-courses voor alle vakken.
2. Per vak, gebruik get-study-progress.
3. Gebruik get-my-grades voor het cijferoverzicht.
4. Gebruik get-missed-deadlines voor achterstand.
5. Gebruik get-unread-feedback voor onverwerkte feedback.

Check en rapporteer:
- \u{1F534} Vakken waar je achterloopt (< 50% voortgang of gemiste deadlines)
- \u{1F7E0} Cijfers die onder verwachting zijn
- \u{1F7E1} Feedback die niet verwerkt lijkt
- \u{1F7E2} Vakken die goed gaan

Per probleemvak:
- Wat is het probleem
- Hoe erg is het
- Wat kun je eraan doen

Gebruik Nederlandse tekst.
Eindig met: "Wat wil je als eerste aanpakken?"`
        }
      }]
    })
  );

  // Prompt: catch-up-plan
  server.prompt(
    "catch-up-plan",
    "Inhaalplan: je loopt achter op een vak, maak een plan om bij te komen",
    {
      vak: z.string().describe("Vaknaam of 'all' voor alle vakken")
    },
    ({ vak }: { vak: string }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Maak een inhaalplan voor ${vak === 'all' ? 'alle vakken waar ik achterloop' : `het vak "${vak}"`}. Volg deze stappen:

1. ${vak === 'all' ? 'Gebruik get-all-courses en get-study-progress per vak.' : `Zoek het vak "${vak}" via get-all-courses.`}
2. Gebruik get-submission-status voor de opdrachtstatus.
3. Gebruik get-missed-deadlines voor gemiste items.
4. Gebruik get-upcoming-deadlines met days=30 voor wat er nog aankomt.

Maak een concreet inhaalplan:
- Wat moet er nog gedaan worden, in volgorde van prioriteit
- Geschatte tijd per taak
- Dag-per-dag planning
- Wat kan eventueel overgeslagen worden
- Totale geschatte inhaaltijd

Wees realistisch maar ambitieus.

Gebruik Nederlandse tekst.
Eindig met: "Wat wil je als eerste aanpakken?"`
        }
      }]
    })
  );
}
