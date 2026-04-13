import { z } from "zod";
import { CanvasClient } from "../canvasClient.js";
import { Course, Assignment, Module, Announcement, User } from "../types.js";
import { formatDate, stripHtml } from "../helpers.js";

export function registerCourseTools(server: any, canvas: CanvasClient) {
  // Tool: get-all-courses - alle vakken inclusief afgeronde
  server.tool(
    "get-all-courses",
    "Haal alle vakken op inclusief afgeronde, met metadata zoals semester, status en cijfer",
    {
      includeCompleted: z.boolean().default(false).describe("Ook afgeronde vakken tonen")
    },
    async ({ includeCompleted = false }: { includeCompleted?: boolean }) => {
      try {
        const states = includeCompleted
          ? ['available', 'completed']
          : ['available'];
        const courses = await canvas.fetchAllPages<Course>('/api/v1/courses', {
          include: ['term', 'total_scores', 'current_grading_period_scores', 'enrollments'],
          state: states
        });

        if (courses.length === 0) {
          return { content: [{ type: "text", text: "Geen vakken gevonden." }] };
        }

        const formatted = courses.map(course => {
          const termInfo = course.term ? ` (${course.term.name})` : '';
          const enrollment = course.enrollments?.[0];
          const grade = enrollment?.computed_current_score
            ? `\n  Cijfer: ${enrollment.computed_current_score}%`
            : '';
          const status = course.workflow_state === 'completed' ? ' [Afgerond]' : '';
          return `\u{1F4DA} ${course.name}${termInfo}${status}\n  ID: ${course.id}\n  Code: ${course.course_code}${grade}`;
        }).join('\n\n');

        return {
          content: [{ type: "text", text: `Jouw vakken:\n\n${formatted}` }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon vakken niet ophalen: ${error.message}`);
        }
        throw new Error('Kon vakken niet ophalen: Onbekende fout');
      }
    }
  );

  // Tool: get-course-overview - compleet overzicht van één vak
  server.tool(
    "get-course-overview",
    "Haal een compleet overzicht op van één vak: modules, paginas, opdrachten, aankondigingen en cijfers in één call",
    {
      courseId: z.string().describe("Het ID van het vak")
    },
    async ({ courseId }: { courseId: string }) => {
      try {
        // Parallel ophalen voor snelheid
        const [course, assignments, modules, announcements] = await Promise.all([
          canvas.getCourse(courseId, { include: ['term', 'total_scores', 'enrollments'] }) as Promise<Course>,
          canvas.fetchAllPages<Assignment>(`/api/v1/courses/${courseId}/assignments`, {
            include: ['submission'],
            order_by: 'due_at',
            'student_ids[]': 'self'
          }),
          canvas.fetchAllPages<Module>(`/api/v1/courses/${courseId}/modules`, {
            'include[]': 'items'
          }),
          canvas.listAnnouncements([`course_${courseId}`], { per_page: 5 }) as Promise<Announcement[]>
        ]);

        const parts: string[] = [];

        // Vak info
        const enrollment = course.enrollments?.[0];
        const grade = enrollment?.computed_current_score ? `${enrollment.computed_current_score}%` : 'Nog geen cijfer';
        parts.push(`\u{1F4DA} ${course.name}\nCode: ${course.course_code}\nCijfer: ${grade}`);

        // Opdrachten samenvatting
        const openAssignments = assignments.filter(a => {
          const sub = a.submission;
          return a.published && (!sub || sub.workflow_state === 'unsubmitted');
        });
        const gradedAssignments = assignments.filter(a => a.submission?.score !== null && a.submission?.score !== undefined);
        parts.push(`\n\u{1F4DD} Opdrachten: ${assignments.length} totaal, ${openAssignments.length} open, ${gradedAssignments.length} beoordeeld`);

        // Openstaande opdrachten
        if (openAssignments.length > 0) {
          const openList = openAssignments.slice(0, 10).map(a => {
            const due = a.due_at ? formatDate(a.due_at) : 'Geen deadline';
            return `  - ${a.name} (deadline: ${due})`;
          }).join('\n');
          parts.push(`\nOpenstaande opdrachten:\n${openList}`);
        }

        // Modules
        if (modules.length > 0) {
          const moduleList = modules.map(m => {
            const itemCount = m.items?.length || m.items_count || 0;
            return `  - ${m.name} (${itemCount} items)`;
          }).join('\n');
          parts.push(`\n\u{1F4C1} Modules (${modules.length}):\n${moduleList}`);
        }

        // Recente aankondigingen
        if (announcements.length > 0) {
          const annList = announcements.map(a => {
            return `  - ${a.title} (${formatDate(a.posted_at)})`;
          }).join('\n');
          parts.push(`\n\u{1F4E2} Recente aankondigingen:\n${annList}`);
        }

        return {
          content: [{ type: "text", text: parts.join('\n') }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon vakoverzicht niet ophalen: ${error.message}`);
        }
        throw new Error('Kon vakoverzicht niet ophalen: Onbekende fout');
      }
    }
  );

  // Tool: get-course-syllabus - syllabus inhoud
  server.tool(
    "get-course-syllabus",
    "Haal de syllabus inhoud op van een vak",
    {
      courseId: z.string().describe("Het ID van het vak")
    },
    async ({ courseId }: { courseId: string }) => {
      try {
        const course = await canvas.getCourse(courseId, { include: ['syllabus_body'] }) as any;
        const syllabus = course.syllabus_body;

        if (!syllabus) {
          return { content: [{ type: "text", text: `Geen syllabus gevonden voor ${course.name}.` }] };
        }

        const cleanText = stripHtml(syllabus);
        return {
          content: [{ type: "text", text: `\u{1F4D6} Syllabus van ${course.name}:\n\n${cleanText}` }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon syllabus niet ophalen: ${error.message}`);
        }
        throw new Error('Kon syllabus niet ophalen: Onbekende fout');
      }
    }
  );

  // Tool: get-course-files - alle bestanden
  server.tool(
    "get-course-files",
    "Haal alle bestanden van een vak op, filterbaar op type (pdf, docx, etc)",
    {
      courseId: z.string().describe("Het ID van het vak"),
      contentType: z.string().optional().describe("Filter op bestandstype, bijv. 'pdf', 'docx', 'pptx'")
    },
    async ({ courseId, contentType }: { courseId: string; contentType?: string }) => {
      try {
        const params: any = { per_page: 100 };
        if (contentType) {
          // Map korte namen naar content types
          const typeMap: Record<string, string> = {
            'pdf': 'application/pdf',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc': 'application/msword',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'zip': 'application/zip',
            'png': 'image/png',
            'jpg': 'image/jpeg',
          };
          params.content_types = [typeMap[contentType.toLowerCase()] || contentType];
        }

        const files = await canvas.fetchAllPages<any>(`/api/v1/courses/${courseId}/files`, params);

        if (files.length === 0) {
          return { content: [{ type: "text", text: "Geen bestanden gevonden." }] };
        }

        const formatted = files.map(f => {
          const sizeKB = Math.round(f.size / 1024);
          return `\u{1F4C4} ${f.display_name}\n  Type: ${f.content_type}\n  Grootte: ${sizeKB} KB\n  Gewijzigd: ${formatDate(f.updated_at)}`;
        }).join('\n\n');

        return {
          content: [{ type: "text", text: `Bestanden (${files.length}):\n\n${formatted}` }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon bestanden niet ophalen: ${error.message}`);
        }
        throw new Error('Kon bestanden niet ophalen: Onbekende fout');
      }
    }
  );

  // Tool: get-course-people - docenten en medestudenten
  server.tool(
    "get-course-people",
    "Haal de docenten en medestudenten van een vak op",
    {
      courseId: z.string().describe("Het ID van het vak"),
      enrollmentType: z.enum(['teacher', 'student', 'ta']).optional().describe("Filter op rol: teacher, student, of ta")
    },
    async ({ courseId, enrollmentType }: { courseId: string; enrollmentType?: string }) => {
      try {
        const params: any = {
          per_page: 100,
          include: ['enrollments', 'email']
        };
        if (enrollmentType) {
          params.enrollment_type = [enrollmentType];
        }

        const users = await canvas.fetchAllPages<User>(`/api/v1/courses/${courseId}/users`, params);

        if (users.length === 0) {
          return { content: [{ type: "text", text: "Geen personen gevonden." }] };
        }

        // Groepeer op rol
        const teachers = users.filter(u => u.enrollments?.some(e => e.type === 'TeacherEnrollment'));
        const tas = users.filter(u => u.enrollments?.some(e => e.type === 'TaEnrollment'));
        const students = users.filter(u => u.enrollments?.some(e => e.type === 'StudentEnrollment'));

        const parts: string[] = [];

        if (teachers.length > 0) {
          parts.push(`\u{1F9D1}\u{200D}\u{1F3EB} Docenten (${teachers.length}):`);
          teachers.forEach(t => parts.push(`  - ${t.name}${t.email ? ` (${t.email})` : ''}`));
        }
        if (tas.length > 0) {
          parts.push(`\n\u{1F9D1}\u{200D}\u{1F4BB} Studentassistenten (${tas.length}):`);
          tas.forEach(t => parts.push(`  - ${t.name}`));
        }
        if (students.length > 0) {
          parts.push(`\n\u{1F393} Studenten (${students.length}):`);
          students.slice(0, 50).forEach(s => parts.push(`  - ${s.name}`));
          if (students.length > 50) parts.push(`  ... en ${students.length - 50} meer`);
        }

        return {
          content: [{ type: "text", text: parts.join('\n') }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon personen niet ophalen: ${error.message}`);
        }
        throw new Error('Kon personen niet ophalen: Onbekende fout');
      }
    }
  );
}
