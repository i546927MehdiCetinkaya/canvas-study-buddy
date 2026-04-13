import { z } from "zod";
import { CanvasClient } from "../canvasClient.js";
import { Course, Module, ModuleItem, Page } from "../types.js";
import { formatDate, stripHtml, truncate } from "../helpers.js";

export function registerContentTools(server: any, canvas: CanvasClient) {
  // Tool: get-page-content - pagina inhoud
  server.tool(
    "get-page-content",
    "Haal de inhoud op van een Canvas pagina via de page slug/URL",
    {
      courseId: z.string().describe("Het ID van het vak"),
      pageUrl: z.string().describe("De slug/URL van de pagina (bijv. 'week-1-introductie')")
    },
    async ({ courseId, pageUrl }: { courseId: string; pageUrl: string }) => {
      try {
        const page = await canvas.getPage(courseId, pageUrl) as Page;
        const content = page.body ? stripHtml(page.body) : 'Geen inhoud';

        return {
          content: [{ type: "text", text: `\u{1F4C4} ${page.title}\nLaatst gewijzigd: ${formatDate(page.updated_at)}\n\n${content}` }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon pagina niet ophalen: ${error.message}`);
        }
        throw new Error('Kon pagina niet ophalen: Onbekende fout');
      }
    }
  );

  // Tool: search-all-content - zoeken door alles
  server.tool(
    "search-all-content",
    "Zoek door ALLES: paginas, modules, opdrachten, aankondigingen en bestanden across alle vakken",
    {
      query: z.string().describe("Zoekterm"),
      courseId: z.string().optional().describe("Optioneel: beperk zoeken tot één vak")
    },
    async ({ query, courseId }: { query: string; courseId?: string }) => {
      try {
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

        const queryLower = query.toLowerCase();
        const results: Array<{ type: string; title: string; courseName: string; match: string; url?: string }> = [];

        const batchSize = 3;
        for (let i = 0; i < courses.length; i += batchSize) {
          const batch = courses.slice(i, i + batchSize);

          await Promise.all(batch.map(async (course) => {
            try {
              // Zoek in pagina's
              const pages = await canvas.fetchAllPages<any>(`/api/v1/courses/${course.id}/pages`, {
                search_term: query
              });
              for (const page of pages) {
                results.push({
                  type: '\u{1F4C4} Pagina',
                  title: page.title,
                  courseName: course.name,
                  match: `Gevonden in paginatitel`,
                  url: page.html_url
                });
              }
            } catch {}

            try {
              // Zoek in opdrachten
              const assignments = await canvas.fetchAllPages<any>(`/api/v1/courses/${course.id}/assignments`, {
                search_term: query
              });
              for (const a of assignments) {
                if (a.name.toLowerCase().includes(queryLower)) {
                  results.push({
                    type: '\u{1F4DD} Opdracht',
                    title: a.name,
                    courseName: course.name,
                    match: `Deadline: ${formatDate(a.due_at)}`,
                    url: a.html_url
                  });
                }
              }
            } catch {}

            try {
              // Zoek in modules
              const modules = await canvas.fetchAllPages<Module>(`/api/v1/courses/${course.id}/modules`, {
                search_term: query,
                'include[]': 'items'
              });
              for (const mod of modules) {
                if (mod.name.toLowerCase().includes(queryLower)) {
                  results.push({
                    type: '\u{1F4C1} Module',
                    title: mod.name,
                    courseName: course.name,
                    match: `${mod.items_count} items`
                  });
                }
                // Zoek ook in module items
                if (mod.items) {
                  for (const item of mod.items) {
                    if (item.title.toLowerCase().includes(queryLower)) {
                      results.push({
                        type: `\u{1F4CE} ${item.type}`,
                        title: item.title,
                        courseName: course.name,
                        match: `In module: ${mod.name}`,
                        url: item.html_url
                      });
                    }
                  }
                }
              }
            } catch {}

            try {
              // Zoek in bestanden
              const files = await canvas.fetchAllPages<any>(`/api/v1/courses/${course.id}/files`, {
                search_term: query
              });
              for (const file of files) {
                results.push({
                  type: '\u{1F4C2} Bestand',
                  title: file.display_name,
                  courseName: course.name,
                  match: `${file.content_type}, ${Math.round(file.size / 1024)} KB`,
                  url: file.url
                });
              }
            } catch {}
          }));
        }

        if (results.length === 0) {
          return {
            content: [{ type: "text", text: `Geen resultaten gevonden voor "${query}".` }]
          };
        }

        const formatted = results.map(r => {
          return `${r.type}: ${r.title}\n  Vak: ${r.courseName}\n  ${r.match}`;
        }).join('\n\n');

        return {
          content: [{ type: "text", text: `\u{1F50D} Zoekresultaten voor "${query}" (${results.length}):\n\n${formatted}` }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Zoeken mislukt: ${error.message}`);
        }
        throw new Error('Zoeken mislukt: Onbekende fout');
      }
    }
  );

  // Tool: get-module-content - alle content van een module
  server.tool(
    "get-module-content",
    "Haal alle content van een module op inclusief pagina-inhoud, niet alleen titels",
    {
      courseId: z.string().describe("Het ID van het vak"),
      moduleId: z.string().describe("Het ID van de module"),
      includePageContent: z.boolean().default(true).describe("Ook de volledige pagina-inhoud ophalen (standaard true)")
    },
    async ({ courseId, moduleId, includePageContent = true }: { courseId: string; moduleId: string; includePageContent?: boolean }) => {
      try {
        const items = await canvas.fetchAllPages<ModuleItem>(`/api/v1/courses/${courseId}/modules/${moduleId}/items`);

        const parts: string[] = [];

        for (const item of items) {
          parts.push(`\n${'='.repeat(50)}`);
          parts.push(`\u{1F539} [${item.type}] ${item.title}`);

          if (item.completion_requirement) {
            const status = item.completion_requirement.completed ? '\u{2705} Voltooid' : '\u{2B1C} Nog niet voltooid';
            parts.push(`  Status: ${status} (${item.completion_requirement.type})`);
          }

          // Haal pagina-inhoud op als het een Page is
          if (includePageContent && item.type === 'Page' && item.page_url) {
            try {
              const page = await canvas.getPage(courseId, item.page_url) as Page;
              if (page.body) {
                parts.push(`\n${stripHtml(page.body)}`);
              }
            } catch {
              parts.push(`  (Kon pagina-inhoud niet laden)`);
            }
          }
        }

        if (items.length === 0) {
          return {
            content: [{ type: "text", text: "Geen items gevonden in deze module." }]
          };
        }

        return {
          content: [{ type: "text", text: `Module inhoud (${items.length} items):${parts.join('\n')}` }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon module content niet ophalen: ${error.message}`);
        }
        throw new Error('Kon module content niet ophalen: Onbekende fout');
      }
    }
  );

  // Tool: get-recent-updates - wat is er recent aangepast
  server.tool(
    "get-recent-updates",
    "Bekijk wat er de afgelopen X dagen is aangepast of toegevoegd op Canvas",
    {
      days: z.number().default(7).describe("Aantal dagen terug kijken (standaard 7)")
    },
    async ({ days = 7 }: { days?: number }) => {
      try {
        const activities = await canvas.listActivityStream({ per_page: 50 }) as any[];
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const recent = activities.filter(a => new Date(a.created_at) > cutoff);

        if (recent.length === 0) {
          return {
            content: [{ type: "text", text: `Geen updates in de afgelopen ${days} dagen.` }]
          };
        }

        const formatted = recent.map(a => {
          const typeEmoji: Record<string, string> = {
            'Announcement': '\u{1F4E2}',
            'Message': '\u{1F4E9}',
            'Submission': '\u{1F4E4}',
            'Conference': '\u{1F3A5}',
            'Conversation': '\u{1F4AC}',
            'DiscussionTopic': '\u{1F4AC}',
          };
          const emoji = typeEmoji[a.type] || '\u{1F4CB}';
          return `${emoji} ${a.title || a.type}\n  ${formatDate(a.created_at)}\n  ${truncate(stripHtml(a.message || ''), 100)}`;
        }).join('\n\n');

        return {
          content: [{ type: "text", text: `\u{1F195} Updates afgelopen ${days} dagen (${recent.length}):\n\n${formatted}` }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon updates niet ophalen: ${error.message}`);
        }
        throw new Error('Kon updates niet ophalen: Onbekende fout');
      }
    }
  );
}
