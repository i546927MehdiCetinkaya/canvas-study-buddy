import { z } from "zod";
import { CanvasClient } from "../canvasClient.js";
import { Assignment, Course, DeadlineWithUrgency } from "../types.js";
import { getUrgency, daysUntil, formatDate, stripHtml } from "../helpers.js";

export function registerAssignmentTools(server: any, canvas: CanvasClient) {
  // Tool: get-upcoming-deadlines - alle deadlines across alle vakken
  server.tool(
    "get-upcoming-deadlines",
    "Haal aankomende deadlines op across alle vakken, gesorteerd op datum met urgentie-indicatie",
    {
      days: z.number().default(14).describe("Aantal dagen vooruit kijken (standaard 14)")
    },
    async ({ days = 14 }: { days?: number }) => {
      try {
        // Haal alle actieve vakken op
        const courses = await canvas.fetchAllPages<Course>('/api/v1/courses', {
          enrollment_state: 'active',
          state: ['available']
        });

        const now = new Date();
        const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        const allDeadlines: DeadlineWithUrgency[] = [];

        // Haal assignments per vak op (parallel, max 5 tegelijk voor rate limiting)
        const batchSize = 5;
        for (let i = 0; i < courses.length; i += batchSize) {
          const batch = courses.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(course =>
              canvas.fetchAllPages<Assignment>(`/api/v1/courses/${course.id}/assignments`, {
                include: ['submission'],
                order_by: 'due_at',
                bucket: 'upcoming',
                'student_ids[]': 'self'
              }).then(assignments => ({ course, assignments }))
               .catch(() => ({ course, assignments: [] as Assignment[] }))
            )
          );

          for (const { course, assignments } of results) {
            for (const assignment of assignments) {
              if (!assignment.due_at || !assignment.published) continue;
              const dueDate = new Date(assignment.due_at);
              if (dueDate > futureDate) continue;

              const daysLeft = daysUntil(assignment.due_at);
              const { level, emoji } = getUrgency(daysLeft);

              // Alleen tonen als nog niet ingeleverd
              const sub = assignment.submission;
              if (sub && sub.workflow_state !== 'unsubmitted') continue;

              allDeadlines.push({
                assignment,
                courseName: course.name,
                courseId: course.id,
                urgency: level,
                urgencyEmoji: emoji,
                daysUntilDue: daysLeft
              });
            }
          }
        }

        // Sorteer op datum (eerst meest urgent)
        allDeadlines.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

        if (allDeadlines.length === 0) {
          return {
            content: [{ type: "text", text: `\u{2705} Geen openstaande deadlines in de komende ${days} dagen!` }]
          };
        }

        const formatted = allDeadlines.map(d => {
          const daysText = d.daysUntilDue < 0
            ? `${Math.abs(d.daysUntilDue)} dagen te laat!`
            : d.daysUntilDue === 0
              ? 'Vandaag!'
              : d.daysUntilDue === 1
                ? 'Morgen'
                : `${d.daysUntilDue} dagen`;
          return `${d.urgencyEmoji} ${d.assignment.name}\n  Vak: ${d.courseName}\n  Deadline: ${formatDate(d.assignment.due_at)} (${daysText})\n  Punten: ${d.assignment.points_possible || 'Niet bekend'}`;
        }).join('\n\n');

        return {
          content: [{ type: "text", text: `\u{1F4C5} Aankomende deadlines (${allDeadlines.length}):\n\n${formatted}\n\nWat wil je als eerste aanpakken?` }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon deadlines niet ophalen: ${error.message}`);
        }
        throw new Error('Kon deadlines niet ophalen: Onbekende fout');
      }
    }
  );

  // Tool: get-missed-deadlines - te laat of niet ingeleverd
  server.tool(
    "get-missed-deadlines",
    "Haal gemiste deadlines op: opdrachten die te laat of niet ingeleverd zijn",
    {},
    async () => {
      try {
        const courses = await canvas.fetchAllPages<Course>('/api/v1/courses', {
          enrollment_state: 'active',
          state: ['available']
        });

        const missed: Array<{ assignment: Assignment; courseName: string }> = [];

        const batchSize = 5;
        for (let i = 0; i < courses.length; i += batchSize) {
          const batch = courses.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(course =>
              canvas.fetchAllPages<Assignment>(`/api/v1/courses/${course.id}/assignments`, {
                include: ['submission'],
                bucket: 'past',
                'student_ids[]': 'self'
              }).then(assignments => ({ course, assignments }))
               .catch(() => ({ course, assignments: [] as Assignment[] }))
            )
          );

          for (const { course, assignments } of results) {
            for (const assignment of assignments) {
              if (!assignment.published || !assignment.due_at) continue;
              const sub = assignment.submission;
              // Gemist = deadline verstreken en niet/te laat ingeleverd
              if (sub && (sub.missing || sub.late || sub.workflow_state === 'unsubmitted')) {
                missed.push({ assignment, courseName: course.name });
              }
            }
          }
        }

        if (missed.length === 0) {
          return {
            content: [{ type: "text", text: "\u{2705} Geen gemiste deadlines! Goed bezig!" }]
          };
        }

        const formatted = missed.map(m => {
          const sub = m.assignment.submission;
          const status = sub?.late ? 'Te laat ingeleverd' : 'Niet ingeleverd';
          return `\u{1F534} ${m.assignment.name}\n  Vak: ${m.courseName}\n  Deadline was: ${formatDate(m.assignment.due_at)}\n  Status: ${status}`;
        }).join('\n\n');

        return {
          content: [{ type: "text", text: `\u{26A0}\u{FE0F} Gemiste deadlines (${missed.length}):\n\n${formatted}\n\nWat wil je als eerste aanpakken?` }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon gemiste deadlines niet ophalen: ${error.message}`);
        }
        throw new Error('Kon gemiste deadlines niet ophalen: Onbekende fout');
      }
    }
  );

  // Tool: get-submission-status - per vak wat ingeleverd, open, te laat
  server.tool(
    "get-submission-status",
    "Bekijk per vak de submission status: wat is ingeleverd, wat staat open, wat is te laat",
    {
      courseId: z.string().describe("Het ID van het vak")
    },
    async ({ courseId }: { courseId: string }) => {
      try {
        const [course, assignments] = await Promise.all([
          canvas.getCourse(courseId) as Promise<Course>,
          canvas.fetchAllPages<Assignment>(`/api/v1/courses/${courseId}/assignments`, {
            include: ['submission'],
            'student_ids[]': 'self'
          })
        ]);

        const submitted: Assignment[] = [];
        const open: Assignment[] = [];
        const late: Assignment[] = [];
        const graded: Assignment[] = [];

        for (const a of assignments) {
          if (!a.published) continue;
          const sub = a.submission;
          if (!sub || sub.workflow_state === 'unsubmitted') {
            if (a.due_at && new Date(a.due_at) < new Date()) {
              late.push(a);
            } else {
              open.push(a);
            }
          } else if (sub.grade) {
            graded.push(a);
          } else {
            submitted.push(a);
          }
        }

        const parts: string[] = [`\u{1F4CA} Submission status voor ${course.name}:\n`];

        parts.push(`\u{2705} Beoordeeld: ${graded.length}`);
        graded.forEach(a => parts.push(`  - ${a.name}: ${a.submission?.grade} (${a.submission?.score}/${a.points_possible})`));

        parts.push(`\n\u{1F4E4} Ingeleverd (wacht op beoordeling): ${submitted.length}`);
        submitted.forEach(a => parts.push(`  - ${a.name}`));

        parts.push(`\n\u{1F7E1} Open: ${open.length}`);
        open.forEach(a => parts.push(`  - ${a.name} (deadline: ${formatDate(a.due_at)})`));

        parts.push(`\n\u{1F534} Te laat / niet ingeleverd: ${late.length}`);
        late.forEach(a => parts.push(`  - ${a.name} (deadline was: ${formatDate(a.due_at)})`));

        return {
          content: [{ type: "text", text: parts.join('\n') }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon submission status niet ophalen: ${error.message}`);
        }
        throw new Error('Kon submission status niet ophalen: Onbekende fout');
      }
    }
  );

  // Tool: get-assignment-details - volledige opdracht info
  server.tool(
    "get-assignment-details",
    "Haal volledige details op van een opdracht: beschrijving, rubric, deadlines, submission requirements",
    {
      courseId: z.string().describe("Het ID van het vak"),
      assignmentId: z.string().describe("Het ID van de opdracht")
    },
    async ({ courseId, assignmentId }: { courseId: string; assignmentId: string }) => {
      try {
        const assignment = await canvas.getAssignment(courseId, assignmentId, {
          include: ['submission', 'rubric_assessment']
        }) as Assignment;

        const parts: string[] = [];
        parts.push(`\u{1F4DD} ${assignment.name}`);
        parts.push(`Vak ID: ${courseId}`);
        parts.push(`Punten: ${assignment.points_possible || 'Niet bekend'}`);
        parts.push(`Deadline: ${formatDate(assignment.due_at)}`);

        if (assignment.lock_at) parts.push(`Sluit: ${formatDate(assignment.lock_at)}`);
        if (assignment.unlock_at) parts.push(`Opent: ${formatDate(assignment.unlock_at)}`);

        parts.push(`Inlevertype: ${assignment.submission_types?.join(', ') || 'Niet gespecificeerd'}`);
        parts.push(`Beoordelingstype: ${assignment.grading_type || 'Niet gespecificeerd'}`);

        // Beschrijving
        if (assignment.description) {
          parts.push(`\nBeschrijving:\n${stripHtml(assignment.description)}`);
        }

        // Rubric
        if (assignment.rubric && assignment.rubric.length > 0) {
          parts.push('\n\u{1F4CB} Rubric:');
          for (const criterion of assignment.rubric) {
            parts.push(`\n  ${criterion.description} (${criterion.points} punten)`);
            if (criterion.long_description) {
              parts.push(`  ${criterion.long_description}`);
            }
            if (criterion.ratings) {
              for (const rating of criterion.ratings) {
                parts.push(`    - ${rating.description}: ${rating.points} punten`);
              }
            }
          }
        }

        // Submission status
        const sub = assignment.submission;
        if (sub) {
          parts.push(`\nJouw submission:`);
          parts.push(`  Status: ${sub.workflow_state}`);
          if (sub.submitted_at) parts.push(`  Ingeleverd: ${formatDate(sub.submitted_at)}`);
          if (sub.grade) parts.push(`  Cijfer: ${sub.grade} (${sub.score}/${assignment.points_possible})`);
          if (sub.late) parts.push(`  \u{26A0}\u{FE0F} Te laat ingeleverd`);
        }

        parts.push(`\nLink: ${assignment.html_url}`);

        return {
          content: [{ type: "text", text: parts.join('\n') }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon opdracht details niet ophalen: ${error.message}`);
        }
        throw new Error('Kon opdracht details niet ophalen: Onbekende fout');
      }
    }
  );

  // Tool: get-assignment-rubric - rubric van een opdracht
  server.tool(
    "get-assignment-rubric",
    "Haal de rubric criteria op van een opdracht",
    {
      courseId: z.string().describe("Het ID van het vak"),
      assignmentId: z.string().describe("Het ID van de opdracht")
    },
    async ({ courseId, assignmentId }: { courseId: string; assignmentId: string }) => {
      try {
        const assignment = await canvas.getAssignment(courseId, assignmentId) as Assignment;

        if (!assignment.rubric || assignment.rubric.length === 0) {
          return {
            content: [{ type: "text", text: `Geen rubric gevonden voor "${assignment.name}".` }]
          };
        }

        const parts: string[] = [`\u{1F4CB} Rubric voor "${assignment.name}" (${assignment.points_possible} punten):\n`];

        for (const criterion of assignment.rubric) {
          parts.push(`\u{1F539} ${criterion.description} (max ${criterion.points} punten)`);
          if (criterion.long_description) {
            parts.push(`  ${criterion.long_description}`);
          }
          if (criterion.ratings) {
            for (const rating of criterion.ratings) {
              parts.push(`  ${rating.points}pt - ${rating.description}${rating.long_description ? ': ' + rating.long_description : ''}`);
            }
          }
          parts.push('');
        }

        return {
          content: [{ type: "text", text: parts.join('\n') }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon rubric niet ophalen: ${error.message}`);
        }
        throw new Error('Kon rubric niet ophalen: Onbekende fout');
      }
    }
  );
}
