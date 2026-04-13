import { z } from "zod";
import { CanvasClient } from "../canvasClient.js";
import { Assignment, CalendarEvent, Course, Module } from "../types.js";
import { formatDate, formatShortDate, getUrgency, daysUntil } from "../helpers.js";

export function registerPlanningTools(server: any, canvas: CanvasClient) {
  // Tool: get-study-progress - voortgang per vak
  server.tool(
    "get-study-progress",
    "Bekijk jouw studievoortgang per vak: hoeveel modules bekeken, opdrachten gedaan, cijfer status",
    {
      courseId: z.string().optional().describe("Optioneel: specifiek vak ID. Zonder ID worden alle vakken getoond")
    },
    async ({ courseId }: { courseId?: string }) => {
      try {
        let courses: Course[];
        if (courseId) {
          const course = await canvas.getCourse(courseId, { include: ['total_scores', 'enrollments'] }) as Course;
          courses = [course];
        } else {
          courses = await canvas.fetchAllPages<Course>('/api/v1/courses', {
            enrollment_state: 'active',
            state: ['available'],
            include: ['total_scores', 'enrollments']
          });
        }

        const parts: string[] = ['\u{1F4CA} Studievoortgang:\n'];

        for (const course of courses) {
          try {
            const [assignments, modules] = await Promise.all([
              canvas.fetchAllPages<Assignment>(`/api/v1/courses/${course.id}/assignments`, {
                include: ['submission'],
                'student_ids[]': 'self'
              }),
              canvas.fetchAllPages<Module>(`/api/v1/courses/${course.id}/modules`, {
                'include[]': 'items'
              })
            ]);

            // Opdracht statistieken
            const published = assignments.filter(a => a.published);
            const submitted = published.filter(a => a.submission && a.submission.workflow_state !== 'unsubmitted');
            const graded = published.filter(a => a.submission?.grade);

            // Module statistieken
            let totalItems = 0;
            let completedItems = 0;
            for (const mod of modules) {
              if (mod.items) {
                for (const item of mod.items) {
                  totalItems++;
                  if (item.completion_requirement?.completed) {
                    completedItems++;
                  }
                }
              }
            }

            const enrollment = course.enrollments?.[0];
            const score = enrollment?.computed_current_score;

            const submittedPct = published.length > 0 ? Math.round((submitted.length / published.length) * 100) : 0;
            const modulePct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

            parts.push(`\u{1F4DA} ${course.name}`);
            if (score !== undefined) parts.push(`  Cijfer: ${score}%`);
            parts.push(`  Opdrachten: ${submitted.length}/${published.length} ingeleverd (${submittedPct}%)`);
            parts.push(`  Beoordeeld: ${graded.length}/${published.length}`);
            parts.push(`  Module items: ${completedItems}/${totalItems} voltooid (${modulePct}%)`);

            // Visuele voortgangsbalk
            const bar = '\u{2588}'.repeat(Math.round(submittedPct / 10)) + '\u{2591}'.repeat(10 - Math.round(submittedPct / 10));
            parts.push(`  [${bar}] ${submittedPct}%`);
            parts.push('');
          } catch {
            parts.push(`\u{1F4DA} ${course.name} - Kon voortgang niet ophalen`);
            parts.push('');
          }
        }

        return {
          content: [{ type: "text", text: parts.join('\n') }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon studievoortgang niet ophalen: ${error.message}`);
        }
        throw new Error('Kon studievoortgang niet ophalen: Onbekende fout');
      }
    }
  );

  // Tool: get-course-calendar - kalender events en deadlines
  server.tool(
    "get-course-calendar",
    "Haal alle events en deadlines op van een vak in kalenderformaat",
    {
      courseId: z.string().optional().describe("Optioneel: specifiek vak ID. Zonder ID worden alle vakken getoond"),
      days: z.number().default(30).describe("Aantal dagen vooruit kijken (standaard 30)")
    },
    async ({ courseId, days = 30 }: { courseId?: string; days?: number }) => {
      try {
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);

        const params: any = {
          type: 'assignment',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          per_page: 100
        };

        if (courseId) {
          params['context_codes[]'] = [`course_${courseId}`];
        } else {
          // Haal alle vakken op voor context codes
          const courses = await canvas.fetchAllPages<Course>('/api/v1/courses', {
            enrollment_state: 'active',
            state: ['available']
          });
          params['context_codes[]'] = courses.map(c => `course_${c.id}`);
        }

        const events = await canvas.listCalendarEvents(params) as CalendarEvent[];

        if (events.length === 0) {
          return {
            content: [{ type: "text", text: `Geen events in de komende ${days} dagen.` }]
          };
        }

        // Sorteer op datum
        events.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

        // Groepeer per week
        const weeks = new Map<string, CalendarEvent[]>();
        for (const event of events) {
          const date = new Date(event.start_at);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay() + 1); // Maandag
          const weekKey = weekStart.toISOString().split('T')[0];
          if (!weeks.has(weekKey)) weeks.set(weekKey, []);
          weeks.get(weekKey)!.push(event);
        }

        const parts: string[] = [`\u{1F4C5} Kalender (komende ${days} dagen):\n`];

        for (const [weekStart, weekEvents] of weeks) {
          const weekDate = new Date(weekStart);
          parts.push(`\u{1F4C6} Week van ${weekDate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}:`);
          for (const event of weekEvents) {
            const daysLeft = daysUntil(event.start_at);
            const { emoji } = getUrgency(daysLeft);
            const contextName = event.context_name || '';
            parts.push(`  ${emoji} ${formatShortDate(event.start_at)} - ${event.title}${contextName ? ` (${contextName})` : ''}`);
          }
          parts.push('');
        }

        return {
          content: [{ type: "text", text: parts.join('\n') }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon kalender niet ophalen: ${error.message}`);
        }
        throw new Error('Kon kalender niet ophalen: Onbekende fout');
      }
    }
  );

  // Tool: get-quiz-results - resultaten van gemaakte quizzen
  server.tool(
    "get-quiz-results",
    "Bekijk de resultaten van gemaakte quizzen",
    {
      courseId: z.string().describe("Het ID van het vak")
    },
    async ({ courseId }: { courseId: string }) => {
      try {
        const quizzes = await canvas.fetchAllPages<any>(`/api/v1/courses/${courseId}/quizzes`);

        if (quizzes.length === 0) {
          return { content: [{ type: "text", text: "Geen quizzen gevonden voor dit vak." }] };
        }

        const parts: string[] = [`\u{1F4DD} Quiz resultaten:\n`];

        for (const quiz of quizzes) {
          try {
            const submissionsData = await canvas.listQuizSubmissions(courseId, quiz.id) as any;
            const submissions = submissionsData.quiz_submissions || [];
            const mySubmissions = submissions.filter((s: any) => s.workflow_state === 'complete');

            if (mySubmissions.length > 0) {
              const latest = mySubmissions[mySubmissions.length - 1];
              const percentage = quiz.points_possible
                ? Math.round((latest.kept_score / quiz.points_possible) * 100)
                : null;
              parts.push(`\u{2705} ${quiz.title}`);
              parts.push(`  Score: ${latest.kept_score}/${quiz.points_possible}${percentage !== null ? ` (${percentage}%)` : ''}`);
              parts.push(`  Poging: ${latest.attempt}`);
              parts.push(`  Datum: ${formatDate(latest.finished_at)}`);
            } else {
              parts.push(`\u{2B1C} ${quiz.title} - Nog niet gemaakt`);
              if (quiz.due_at) parts.push(`  Deadline: ${formatDate(quiz.due_at)}`);
            }
            parts.push('');
          } catch {
            parts.push(`\u{26A0}\u{FE0F} ${quiz.title} - Kon resultaten niet ophalen`);
            parts.push('');
          }
        }

        return {
          content: [{ type: "text", text: parts.join('\n') }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon quiz resultaten niet ophalen: ${error.message}`);
        }
        throw new Error('Kon quiz resultaten niet ophalen: Onbekende fout');
      }
    }
  );

  // Tool: get-learning-outcomes - leerdoelen per vak
  server.tool(
    "get-learning-outcomes",
    "Bekijk de leerdoelen van een vak",
    {
      courseId: z.string().describe("Het ID van het vak")
    },
    async ({ courseId }: { courseId: string }) => {
      try {
        const outcomeLinks = await canvas.listOutcomes(courseId) as any[];

        if (outcomeLinks.length === 0) {
          return { content: [{ type: "text", text: "Geen leerdoelen gevonden voor dit vak." }] };
        }

        const parts: string[] = [`\u{1F3AF} Leerdoelen:\n`];

        // Haal details op per outcome (max 10 parallel)
        const batchSize = 10;
        for (let i = 0; i < outcomeLinks.length; i += batchSize) {
          const batch = outcomeLinks.slice(i, i + batchSize);
          const outcomes = await Promise.all(
            batch.map((link: any) =>
              canvas.getOutcome(link.outcome?.id || link.outcome_id).catch(() => null)
            )
          );

          for (const outcome of outcomes) {
            if (!outcome) continue;
            const o = outcome as any;
            parts.push(`\u{1F539} ${o.title}`);
            if (o.description) parts.push(`  ${o.description}`);
            if (o.mastery_points) parts.push(`  Mastery: ${o.mastery_points} punten`);
            parts.push('');
          }
        }

        return {
          content: [{ type: "text", text: parts.join('\n') }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon leerdoelen niet ophalen: ${error.message}`);
        }
        throw new Error('Kon leerdoelen niet ophalen: Onbekende fout');
      }
    }
  );
}
