import { z } from "zod";
import { CanvasClient } from "../canvasClient.js";
import { Assignment, Course, Submission } from "../types.js";
import { formatDate, truncate } from "../helpers.js";

export function registerGradeTools(server: any, canvas: CanvasClient) {
  // Tool: get-my-grades - cijfers per vak
  server.tool(
    "get-my-grades",
    "Haal jouw cijfers op per vak, inclusief individuele opdracht scores",
    {
      courseId: z.string().optional().describe("Optioneel: specifiek vak ID. Zonder ID worden alle vakken getoond")
    },
    async ({ courseId }: { courseId?: string }) => {
      try {
        if (courseId) {
          // Cijfers voor specifiek vak
          const [course, assignments] = await Promise.all([
            canvas.getCourse(courseId, { include: ['total_scores', 'enrollments'] }) as Promise<Course>,
            canvas.fetchAllPages<Assignment>(`/api/v1/courses/${courseId}/assignments`, {
              include: ['submission'],
              'student_ids[]': 'self'
            })
          ]);

          const enrollment = course.enrollments?.[0];
          const totalScore = enrollment?.computed_current_score;

          const graded = assignments
            .filter(a => a.submission?.score !== null && a.submission?.score !== undefined)
            .sort((a, b) => {
              const dateA = a.submission?.graded_at || '';
              const dateB = b.submission?.graded_at || '';
              return dateB.localeCompare(dateA);
            });

          const parts: string[] = [`\u{1F4CA} Cijfers voor ${course.name}:`];
          if (totalScore !== undefined) {
            parts.push(`Totaal: ${totalScore}%\n`);
          }

          if (graded.length === 0) {
            parts.push('Nog geen beoordeelde opdrachten.');
          } else {
            for (const a of graded) {
              const sub = a.submission!;
              const percentage = a.points_possible ? Math.round((sub.score! / a.points_possible) * 100) : null;
              const percentText = percentage !== null ? ` (${percentage}%)` : '';
              parts.push(`  ${sub.score}/${a.points_possible}${percentText} - ${a.name}`);
            }
          }

          return {
            content: [{ type: "text", text: parts.join('\n') }]
          };
        } else {
          // Overzicht alle vakken
          const courses = await canvas.fetchAllPages<Course>('/api/v1/courses', {
            enrollment_state: 'active',
            state: ['available'],
            include: ['total_scores', 'enrollments']
          });

          const parts: string[] = ['\u{1F4CA} Cijferoverzicht alle vakken:\n'];

          for (const course of courses) {
            const enrollment = course.enrollments?.[0];
            const score = enrollment?.computed_current_score;
            const grade = enrollment?.computed_current_grade;
            const scoreText = score !== undefined ? `${score}%${grade ? ` (${grade})` : ''}` : 'Nog geen cijfer';
            parts.push(`\u{1F4DA} ${course.name}: ${scoreText}`);
          }

          return {
            content: [{ type: "text", text: parts.join('\n') }]
          };
        }
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon cijfers niet ophalen: ${error.message}`);
        }
        throw new Error('Kon cijfers niet ophalen: Onbekende fout');
      }
    }
  );

  // Tool: get-assignment-feedback - feedback op ingeleverd werk
  server.tool(
    "get-assignment-feedback",
    "Haal de feedback van de docent op voor een specifieke opdracht",
    {
      courseId: z.string().describe("Het ID van het vak"),
      assignmentId: z.string().describe("Het ID van de opdracht")
    },
    async ({ courseId, assignmentId }: { courseId: string; assignmentId: string }) => {
      try {
        const [assignment, submission] = await Promise.all([
          canvas.getAssignment(courseId, assignmentId) as Promise<Assignment>,
          canvas.getMySubmission(courseId, assignmentId, {
            include: ['submission_comments', 'rubric_assessment']
          }) as Promise<Submission>
        ]);

        const parts: string[] = [`\u{1F4AC} Feedback voor "${assignment.name}":\n`];

        // Score
        if (submission.score !== null && submission.score !== undefined) {
          parts.push(`Score: ${submission.score}/${assignment.points_possible}`);
          if (submission.grade) parts.push(`Cijfer: ${submission.grade}`);
        }

        // Rubric assessment
        if (submission.rubric_assessment && assignment.rubric) {
          parts.push('\n\u{1F4CB} Rubric beoordeling:');
          for (const criterion of assignment.rubric) {
            const assessment = submission.rubric_assessment[criterion.id];
            if (assessment) {
              parts.push(`  ${criterion.description}: ${assessment.points}/${criterion.points}`);
              if (assessment.comments) {
                parts.push(`    Opmerking: ${assessment.comments}`);
              }
            }
          }
        }

        // Comments
        const comments = submission.submission_comments || [];
        const teacherComments = comments.filter(c => c.author?.role !== 'student');

        if (teacherComments.length > 0) {
          parts.push('\n\u{1F4AC} Opmerkingen van docent:');
          for (const comment of teacherComments) {
            parts.push(`  [${formatDate(comment.created_at)}] ${comment.author_name}:`);
            parts.push(`  ${comment.comment}`);
          }
        } else if (!submission.rubric_assessment) {
          parts.push('\nGeen feedback gevonden voor deze opdracht.');
        }

        return {
          content: [{ type: "text", text: parts.join('\n') }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon feedback niet ophalen: ${error.message}`);
        }
        throw new Error('Kon feedback niet ophalen: Onbekende fout');
      }
    }
  );

  // Tool: get-all-feedback - alle feedback across alle vakken
  server.tool(
    "get-all-feedback",
    "Haal alle feedback op across alle vakken, chronologisch gesorteerd",
    {
      days: z.number().default(30).describe("Aantal dagen terug kijken (standaard 30)")
    },
    async ({ days = 30 }: { days?: number }) => {
      try {
        const courses = await canvas.fetchAllPages<Course>('/api/v1/courses', {
          enrollment_state: 'active',
          state: ['available']
        });

        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - days);

        const allFeedback: Array<{
          courseName: string;
          assignmentName: string;
          score?: number;
          pointsPossible?: number;
          comments: Array<{ author: string; comment: string; date: string }>;
          gradedAt?: string;
        }> = [];

        const batchSize = 5;
        for (let i = 0; i < courses.length; i += batchSize) {
          const batch = courses.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(course =>
              canvas.fetchAllPages<any>(`/api/v1/courses/${course.id}/students/submissions`, {
                'student_ids[]': 'self',
                include: ['submission_comments', 'assignment'],
                submitted_since: sinceDate.toISOString()
              }).then(subs => ({ course, submissions: subs }))
               .catch(() => ({ course, submissions: [] }))
            )
          );

          for (const { course, submissions } of results) {
            for (const sub of submissions) {
              const teacherComments = (sub.submission_comments || [])
                .filter((c: any) => c.author?.role !== 'student');

              if (sub.grade || teacherComments.length > 0) {
                allFeedback.push({
                  courseName: course.name,
                  assignmentName: sub.assignment?.name || `Opdracht ${sub.assignment_id}`,
                  score: sub.score,
                  pointsPossible: sub.assignment?.points_possible,
                  comments: teacherComments.map((c: any) => ({
                    author: c.author_name,
                    comment: c.comment,
                    date: c.created_at
                  })),
                  gradedAt: sub.graded_at
                });
              }
            }
          }
        }

        // Sorteer op datum (nieuwste eerst)
        allFeedback.sort((a, b) => {
          const dateA = a.gradedAt || a.comments[0]?.date || '';
          const dateB = b.gradedAt || b.comments[0]?.date || '';
          return dateB.localeCompare(dateA);
        });

        if (allFeedback.length === 0) {
          return {
            content: [{ type: "text", text: `Geen feedback gevonden in de afgelopen ${days} dagen.` }]
          };
        }

        const formatted = allFeedback.map(f => {
          const parts: string[] = [];
          const scoreText = f.score !== undefined ? ` - ${f.score}/${f.pointsPossible}` : '';
          parts.push(`\u{1F4DA} ${f.courseName} > ${f.assignmentName}${scoreText}`);
          if (f.gradedAt) parts.push(`  Beoordeeld: ${formatDate(f.gradedAt)}`);
          for (const c of f.comments) {
            parts.push(`  \u{1F4AC} ${c.author}: ${truncate(c.comment, 150)}`);
          }
          return parts.join('\n');
        }).join('\n\n');

        return {
          content: [{ type: "text", text: `\u{1F4AC} Alle feedback (afgelopen ${days} dagen):\n\n${formatted}` }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon feedback niet ophalen: ${error.message}`);
        }
        throw new Error('Kon feedback niet ophalen: Onbekende fout');
      }
    }
  );

  // Tool: get-unread-feedback - alleen nieuwe feedback
  server.tool(
    "get-unread-feedback",
    "Haal alleen nieuwe/ongelezen feedback op die je nog niet hebt verwerkt",
    {},
    async () => {
      try {
        const courses = await canvas.fetchAllPages<Course>('/api/v1/courses', {
          enrollment_state: 'active',
          state: ['available']
        });

        const unreadFeedback: Array<{
          courseName: string;
          assignmentName: string;
          score?: number;
          pointsPossible?: number;
          comment: string;
          author: string;
          date: string;
        }> = [];

        const batchSize = 5;
        for (let i = 0; i < courses.length; i += batchSize) {
          const batch = courses.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(course =>
              canvas.fetchAllPages<any>(`/api/v1/courses/${course.id}/students/submissions`, {
                'student_ids[]': 'self',
                include: ['submission_comments', 'assignment'],
                workflow_state: 'graded'
              }).then(subs => ({ course, submissions: subs }))
               .catch(() => ({ course, submissions: [] }))
            )
          );

          for (const { course, submissions } of results) {
            for (const sub of submissions) {
              // Check voor recente opmerkingen (afgelopen 7 dagen)
              const recentComments = (sub.submission_comments || [])
                .filter((c: any) => {
                  if (c.author?.role === 'student') return false;
                  const commentDate = new Date(c.created_at);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return commentDate > weekAgo;
                });

              for (const c of recentComments) {
                unreadFeedback.push({
                  courseName: course.name,
                  assignmentName: sub.assignment?.name || `Opdracht ${sub.assignment_id}`,
                  score: sub.score,
                  pointsPossible: sub.assignment?.points_possible,
                  comment: c.comment,
                  author: c.author_name,
                  date: c.created_at
                });
              }
            }
          }
        }

        unreadFeedback.sort((a, b) => b.date.localeCompare(a.date));

        if (unreadFeedback.length === 0) {
          return {
            content: [{ type: "text", text: "\u{2705} Geen nieuwe feedback in de afgelopen 7 dagen." }]
          };
        }

        const formatted = unreadFeedback.map(f => {
          const scoreText = f.score !== undefined ? ` (${f.score}/${f.pointsPossible})` : '';
          return `\u{1F4AC} ${f.courseName} > ${f.assignmentName}${scoreText}\n  ${f.author} (${formatDate(f.date)}):\n  "${f.comment}"`;
        }).join('\n\n');

        return {
          content: [{ type: "text", text: `\u{1F514} Nieuwe feedback (${unreadFeedback.length}):\n\n${formatted}\n\nWat wil je als eerste aanpakken?` }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon ongelezen feedback niet ophalen: ${error.message}`);
        }
        throw new Error('Kon ongelezen feedback niet ophalen: Onbekende fout');
      }
    }
  );

  // Tool: get-rubric-scores - rubric scores op ingeleverd werk
  server.tool(
    "get-rubric-scores",
    "Haal jouw rubric scores op per criterium voor een beoordeelde opdracht",
    {
      courseId: z.string().describe("Het ID van het vak"),
      assignmentId: z.string().describe("Het ID van de opdracht")
    },
    async ({ courseId, assignmentId }: { courseId: string; assignmentId: string }) => {
      try {
        const [assignment, submission] = await Promise.all([
          canvas.getAssignment(courseId, assignmentId) as Promise<Assignment>,
          canvas.getMySubmission(courseId, assignmentId, {
            include: ['rubric_assessment']
          }) as Promise<any>
        ]);

        if (!assignment.rubric || !submission.rubric_assessment) {
          return {
            content: [{ type: "text", text: `Geen rubric beoordeling gevonden voor "${assignment.name}".` }]
          };
        }

        const parts: string[] = [`\u{1F4CB} Rubric scores voor "${assignment.name}":\n`];
        let totalEarned = 0;
        let totalPossible = 0;

        for (const criterion of assignment.rubric) {
          const assessment = submission.rubric_assessment[criterion.id];
          if (assessment) {
            const earned = assessment.points || 0;
            totalEarned += earned;
            totalPossible += criterion.points;
            const percentage = Math.round((earned / criterion.points) * 100);
            const bar = '\u{2588}'.repeat(Math.round(percentage / 10)) + '\u{2591}'.repeat(10 - Math.round(percentage / 10));
            parts.push(`${criterion.description}:`);
            parts.push(`  ${bar} ${earned}/${criterion.points} (${percentage}%)`);
            if (assessment.comments) {
              parts.push(`  Opmerking: ${assessment.comments}`);
            }
          }
        }

        const totalPercentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
        parts.push(`\nTotaal: ${totalEarned}/${totalPossible} (${totalPercentage}%)`);

        return {
          content: [{ type: "text", text: parts.join('\n') }]
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Kon rubric scores niet ophalen: ${error.message}`);
        }
        throw new Error('Kon rubric scores niet ophalen: Onbekende fout');
      }
    }
  );
}
