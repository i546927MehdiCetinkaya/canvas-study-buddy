import { z } from "zod";
import { CanvasClient } from "../canvasClient.js";
import { Announcement, Course, Conversation, DiscussionTopic } from "../types.js";
import { formatDate, stripHtml, truncate } from "../helpers.js";

export function registerAnnouncementTools(server: any, canvas: CanvasClient) {
  // Tool: get-course-announcements - aankondigingen per vak
  server.tool(
    "get-course-announcements",
    "Haal aankondigingen op voor een specifiek vak",
    {
      courseId: z.string().describe("Het ID van het vak"),
      limit: z.number().default(10).describe("Maximaal aantal aankondigingen (standaard 10)")
    },
    async ({ courseId, limit = 10 }: { courseId: string; limit?: number }) => {
      try {
        const announcements = await canvas.listAnnouncements([`course_${courseId}`], {
          per_page: limit
        }) as Announcement[];

        if (announcements.length === 0) {
          return { content: [{ type: "text", text: "Geen aankondigingen gevonden voor dit vak." }] };
        }

        const formatted = announcements.map(a => {
          const readIcon = a.read_state === 'read' ? '\u{2705}' : '\u{1F7E1}';
          return `${readIcon} ${a.title}\n  Door: ${a.author.display_name}\n  Datum: ${formatDate(a.posted_at)}\n  ${truncate(stripHtml(a.message), 200)}`;
        }).join('\n\n');

        return {
          content: [{ type: "text", text: `\u{1F4E2} Aankondigingen (${announcements.length}):\n\n${formatted}` }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon aankondigingen niet ophalen: ${error.message}`);
        }
        throw new Error('Kon aankondigingen niet ophalen: Onbekende fout');
      }
    }
  );

  // Tool: get-all-announcements - alle aankondigingen across alle vakken
  server.tool(
    "get-all-announcements",
    "Haal alle aankondigingen op across alle vakken, gesorteerd op datum",
    {
      days: z.number().default(14).describe("Aantal dagen terug kijken (standaard 14)")
    },
    async ({ days = 14 }: { days?: number }) => {
      try {
        const courses = await canvas.fetchAllPages<Course>('/api/v1/courses', {
          enrollment_state: 'active',
          state: ['available']
        });

        const contextCodes = courses.map(c => `course_${c.id}`);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const announcements = await canvas.listAnnouncements(contextCodes, {
          per_page: 50,
          start_date: startDate.toISOString()
        }) as Announcement[];

        if (announcements.length === 0) {
          return {
            content: [{ type: "text", text: `Geen aankondigingen in de afgelopen ${days} dagen.` }]
          };
        }

        // Map context_code naar vaknaam
        const courseMap = new Map(courses.map(c => [`course_${c.id}`, c.name]));

        const formatted = announcements.map(a => {
          const courseName = courseMap.get(a.context_code || '') || 'Onbekend vak';
          const readIcon = a.read_state === 'read' ? '\u{2705}' : '\u{1F7E1}';
          return `${readIcon} ${a.title}\n  Vak: ${courseName}\n  Door: ${a.author.display_name}\n  Datum: ${formatDate(a.posted_at)}\n  ${truncate(stripHtml(a.message), 150)}`;
        }).join('\n\n');

        return {
          content: [{ type: "text", text: `\u{1F4E2} Alle aankondigingen (${announcements.length}):\n\n${formatted}` }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon aankondigingen niet ophalen: ${error.message}`);
        }
        throw new Error('Kon aankondigingen niet ophalen: Onbekende fout');
      }
    }
  );

  // Tool: get-unread-announcements - alleen nieuwe aankondigingen
  server.tool(
    "get-unread-announcements",
    "Haal alleen nieuwe/ongelezen aankondigingen op",
    {},
    async () => {
      try {
        const courses = await canvas.fetchAllPages<Course>('/api/v1/courses', {
          enrollment_state: 'active',
          state: ['available']
        });

        const contextCodes = courses.map(c => `course_${c.id}`);
        const announcements = await canvas.listAnnouncements(contextCodes, {
          per_page: 50
        }) as Announcement[];

        const unread = announcements.filter(a => a.read_state !== 'read');
        const courseMap = new Map(courses.map(c => [`course_${c.id}`, c.name]));

        if (unread.length === 0) {
          return {
            content: [{ type: "text", text: "\u{2705} Geen ongelezen aankondigingen!" }]
          };
        }

        const formatted = unread.map(a => {
          const courseName = courseMap.get(a.context_code || '') || 'Onbekend vak';
          return `\u{1F7E1} ${a.title}\n  Vak: ${courseName}\n  Door: ${a.author.display_name}\n  Datum: ${formatDate(a.posted_at)}\n  ${truncate(stripHtml(a.message), 200)}`;
        }).join('\n\n');

        return {
          content: [{ type: "text", text: `\u{1F514} Ongelezen aankondigingen (${unread.length}):\n\n${formatted}` }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon ongelezen aankondigingen niet ophalen: ${error.message}`);
        }
        throw new Error('Kon ongelezen aankondigingen niet ophalen: Onbekende fout');
      }
    }
  );

  // Tool: get-inbox-messages - Canvas inbox berichten
  server.tool(
    "get-inbox-messages",
    "Haal je Canvas inbox berichten op",
    {
      scope: z.enum(['inbox', 'unread', 'sent']).default('inbox').describe("Filter: inbox (alle), unread (ongelezen), sent (verzonden)"),
      limit: z.number().default(20).describe("Maximaal aantal berichten (standaard 20)")
    },
    async ({ scope = 'inbox', limit = 20 }: { scope?: string; limit?: number }) => {
      try {
        const params: any = { per_page: limit };
        if (scope === 'unread') params.scope = 'unread';
        if (scope === 'sent') params.scope = 'sent';

        const conversations = await canvas.listConversations(params) as Conversation[];

        if (conversations.length === 0) {
          return { content: [{ type: "text", text: "Geen berichten gevonden." }] };
        }

        const formatted = conversations.map(c => {
          const readIcon = c.workflow_state === 'unread' ? '\u{1F7E1}' : '\u{2705}';
          const participants = c.participants.map(p => p.name).join(', ');
          return `${readIcon} ${c.subject || '(geen onderwerp)'}\n  Van/Aan: ${participants}\n  Datum: ${formatDate(c.last_message_at)}\n  ${truncate(c.last_message, 100)}`;
        }).join('\n\n');

        return {
          content: [{ type: "text", text: `\u{1F4E9} Berichten (${conversations.length}):\n\n${formatted}` }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon berichten niet ophalen: ${error.message}`);
        }
        throw new Error('Kon berichten niet ophalen: Onbekende fout');
      }
    }
  );

  // Tool: get-discussion-posts - discussie posts van een vak
  server.tool(
    "get-discussion-posts",
    "Haal discussie posts op van een vak",
    {
      courseId: z.string().describe("Het ID van het vak"),
      limit: z.number().default(10).describe("Maximaal aantal discussies (standaard 10)")
    },
    async ({ courseId, limit = 10 }: { courseId: string; limit?: number }) => {
      try {
        const topics = await canvas.listDiscussionTopics(courseId, {
          per_page: limit,
          order_by: 'recent_activity'
        }) as DiscussionTopic[];

        // Filter echte discussies (geen announcements)
        const discussions = topics.filter(t => !(t as any).is_announcement);

        if (discussions.length === 0) {
          return { content: [{ type: "text", text: "Geen discussies gevonden voor dit vak." }] };
        }

        const formatted = discussions.map(d => {
          return `\u{1F4AC} ${d.title}\n  Door: ${d.author.display_name}\n  Reacties: ${d.discussion_subentry_count}\n  Datum: ${formatDate(d.posted_at)}\n  ${truncate(stripHtml(d.message), 150)}`;
        }).join('\n\n');

        return {
          content: [{ type: "text", text: `\u{1F4AC} Discussies (${discussions.length}):\n\n${formatted}` }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon discussies niet ophalen: ${error.message}`);
        }
        throw new Error('Kon discussies niet ophalen: Onbekende fout');
      }
    }
  );
}
