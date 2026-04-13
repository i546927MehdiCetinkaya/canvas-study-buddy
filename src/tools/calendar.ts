import { z } from "zod";
import ical, { ICalAlarmType } from "ical-generator";
import { writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { CanvasClient } from "../canvasClient.js";
import { Assignment, Course, Module } from "../types.js";
import { stripHtml } from "../helpers.js";

export function registerCalendarTools(server: any, canvas: CanvasClient) {
  // Tool: export-to-calendar - deadlines exporteren als .ics bestand
  server.tool(
    "export-to-calendar",
    "Exporteer deadlines als .ics kalenderbestand voor Google Calendar, Apple Calendar of Outlook",
    {
      days: z.number().default(30).describe("Aantal dagen vooruit (standaard 30)"),
      courseId: z.string().optional().describe("Optioneel: alleen deadlines van dit vak"),
      onlyOpen: z.boolean().default(true).describe("Alleen niet-ingeleverde opdrachten (standaard true)")
    },
    async ({ days = 30, courseId, onlyOpen = true }: { days?: number; courseId?: string; onlyOpen?: boolean }) => {
      try {
        // Haal vakken op
        let courses: Course[];
        if (courseId) {
          const course = await canvas.getCourse(courseId) as Course;
          courses = [course];
        } else {
          courses = await canvas.fetchAllPages<Course>('/api/v1/courses', {
            enrollment_state: 'active',
            state: ['available']
          });
        }

        const now = new Date();
        const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        // Haal assignments en modules per vak op
        const deadlines: Array<{
          assignment: Assignment;
          courseName: string;
          courseCode: string;
          source: string;
        }> = [];

        const batchSize = 5;
        for (let i = 0; i < courses.length; i += batchSize) {
          const batch = courses.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(async (course) => {
              try {
                // Haal assignments en modules parallel op
                const [assignments, modules] = await Promise.all([
                  canvas.fetchAllPages<Assignment>(`/api/v1/courses/${course.id}/assignments`, {
                    include: ['submission'],
                    order_by: 'due_at'
                  }),
                  canvas.fetchAllPages<Module>(`/api/v1/courses/${course.id}/modules`, {
                    'include[]': 'items'
                  }).catch(() => [] as Module[])
                ]);

                // Bouw een mapping van assignment_id naar module/item naam
                const assignmentSources = new Map<number, string>();
                for (const mod of modules) {
                  if (!mod.items) continue;
                  for (const item of mod.items) {
                    if (item.type === 'Assignment' && item.content_id) {
                      assignmentSources.set(item.content_id, `Module: ${mod.name} > ${item.title}`);
                    }
                  }
                }

                return { course, assignments, assignmentSources };
              } catch {
                return { course, assignments: [] as Assignment[], assignmentSources: new Map<number, string>() };
              }
            })
          );

          for (const { course, assignments, assignmentSources } of results) {
            for (const assignment of assignments) {
              if (!assignment.due_at || !assignment.published) continue;

              const dueDate = new Date(assignment.due_at);
              if (dueDate < now || dueDate > futureDate) continue;

              // Filter op open opdrachten als gewenst
              if (onlyOpen) {
                const sub = assignment.submission;
                if (sub && sub.workflow_state !== 'unsubmitted') continue;
              }

              // Bepaal de bron (module/pagina)
              const source = assignmentSources.get(assignment.id) || 'Staat los (niet in een module)';

              deadlines.push({
                assignment,
                courseName: course.name,
                courseCode: course.course_code,
                source
              });
            }
          }
        }

        if (deadlines.length === 0) {
          return {
            content: [{ type: "text", text: `Geen deadlines gevonden in de komende ${days} dagen${onlyOpen ? ' (alleen open opdrachten)' : ''}.` }]
          };
        }

        // Sorteer op datum
        deadlines.sort((a, b) =>
          new Date(a.assignment.due_at!).getTime() - new Date(b.assignment.due_at!).getTime()
        );

        // Genereer .ics kalender
        const calendar = ical({
          name: 'Canvas Study Buddy - Deadlines',
          timezone: 'Europe/Amsterdam',
          prodId: { company: 'canvas-study-buddy', product: 'deadlines' }
        });

        for (const d of deadlines) {
          const dueDate = new Date(d.assignment.due_at!);

          // Beschrijving opbouwen
          const descParts: string[] = [];
          descParts.push(`Vak: ${d.courseName} (${d.courseCode})`);
          descParts.push(`Bron: ${d.source}`);
          if (d.assignment.points_possible) {
            descParts.push(`Punten: ${d.assignment.points_possible}`);
          }
          if (d.assignment.submission_types?.length) {
            descParts.push(`Inlevertype: ${d.assignment.submission_types.join(', ')}`);
          }
          if (d.assignment.description) {
            descParts.push(`\nBeschrijving:\n${stripHtml(d.assignment.description).substring(0, 500)}`);
          }
          descParts.push(`\nLink: ${d.assignment.html_url}`);

          calendar.createEvent({
            start: dueDate,
            end: dueDate,
            summary: `\u{1F4DA} ${d.courseName} \u{2014} ${d.assignment.name}`,
            description: descParts.join('\n'),
            url: d.assignment.html_url,
            alarms: [
              { type: ICalAlarmType.display, trigger: 24 * 60 * 60 } // 24 uur van tevoren
            ]
          });
        }

        // Sla op in Downloads map
        const downloadsPath = join(homedir(), 'Downloads');
        const fileName = `canvas-deadlines.ics`;
        const filePath = join(downloadsPath, fileName);

        writeFileSync(filePath, calendar.toString());

        // Samenvatting
        const summary = deadlines.map(d => {
          const date = new Date(d.assignment.due_at!).toLocaleDateString('nl-NL', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
          });
          return `  - ${date} | ${d.courseName} | ${d.assignment.name}`;
        }).join('\n');

        return {
          content: [{
            type: "text",
            text: `\u{1F4C5} Kalenderbestand aangemaakt met ${deadlines.length} deadlines!\n\nOpgeslagen: ${filePath}\n\nEvents:\n${summary}\n\nImporteren:\n- Google Calendar: calendar.google.com > Instellingen > Importeren\n- Apple Calendar: dubbelklik het bestand\n- Outlook: Bestand > Openen > Kalender importeren`
          }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon kalender niet exporteren: ${error.message}`);
        }
        throw new Error('Kon kalender niet exporteren: Onbekende fout');
      }
    }
  );
}
