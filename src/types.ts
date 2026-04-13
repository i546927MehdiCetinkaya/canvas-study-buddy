// Canvas Study Buddy - TypeScript type definities

export interface CanvasConfig {
  apiToken: string;
  baseUrl: string;
}

export interface Term {
  id: number;
  name: string;
  start_at?: string;
  end_at?: string;
}

export interface Course {
  id: number;
  name: string;
  course_code: string;
  workflow_state: string;
  term?: Term;
  enrollments?: Enrollment[];
  total_students?: number;
  syllabus_body?: string;
  created_at?: string;
  start_at?: string;
  end_at?: string;
}

export interface Enrollment {
  type: string;
  role: string;
  enrollment_state: string;
  computed_current_score?: number;
  computed_final_score?: number;
  computed_current_grade?: string;
  computed_final_grade?: string;
}

export interface Assignment {
  id: number;
  name: string;
  description?: string;
  due_at?: string;
  lock_at?: string;
  unlock_at?: string;
  points_possible: number;
  submission_types: string[];
  course_id: number;
  html_url: string;
  published: boolean;
  has_submitted_submissions?: boolean;
  rubric?: RubricCriterion[];
  rubric_settings?: any;
  submission?: Submission;
  assignment_group_id?: number;
  grading_type?: string;
}

export interface RubricCriterion {
  id: string;
  description: string;
  long_description?: string;
  points: number;
  ratings?: RubricRating[];
}

export interface RubricRating {
  id: string;
  description: string;
  long_description?: string;
  points: number;
}

export interface Submission {
  id: number;
  user_id: number;
  assignment_id: number;
  body?: string;
  submission_type: 'online_text_entry' | 'online_upload' | 'online_url' | 'media_recording' | null;
  workflow_state: string;
  grade?: string;
  score?: number;
  submitted_at?: string;
  graded_at?: string;
  attachments?: CanvasFile[];
  submission_comments?: SubmissionComment[];
  attempt?: number;
  late?: boolean;
  missing?: boolean;
  excused?: boolean;
  rubric_assessment?: Record<string, RubricAssessmentEntry>;
}

export interface RubricAssessmentEntry {
  points: number;
  rating_id?: string;
  comments?: string;
}

export interface SubmissionComment {
  id: number;
  author_id: number;
  author_name: string;
  author?: {
    display_name: string;
    role?: string;
  };
  comment: string;
  created_at: string;
}

export interface CanvasFile {
  id: number;
  filename: string;
  display_name: string;
  content_type: string;
  size: number;
  url: string;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: number;
  name: string;
  position: number;
  published: boolean;
  items_count: number;
  items_url: string;
  items?: ModuleItem[];
  state?: string;
  completed_at?: string;
}

export interface ModuleItem {
  id: number;
  title: string;
  type: string;
  position: number;
  indent: number;
  content_id?: number;
  html_url?: string;
  page_url?: string;
  url?: string;
  published?: boolean;
  completion_requirement?: {
    type: string;
    completed: boolean;
  };
}

export interface Page {
  page_id: number;
  url: string;
  title: string;
  body?: string;
  created_at: string;
  updated_at: string;
  published: boolean;
}

export interface Announcement {
  id: number;
  title: string;
  message: string;
  posted_at: string;
  read_state?: string;
  author: {
    display_name: string;
  };
  context_code?: string;
}

export interface DiscussionTopic {
  id: number;
  title: string;
  message: string;
  posted_at: string;
  author: {
    display_name: string;
  };
  discussion_subentry_count: number;
  read_state?: string;
}

export interface CalendarEvent {
  id: number;
  title: string;
  start_at: string;
  end_at?: string;
  description?: string;
  context_code: string;
  context_name?: string;
  type: string;
  assignment?: Assignment;
  html_url?: string;
}

export interface Conversation {
  id: number;
  subject: string;
  last_message: string;
  last_message_at: string;
  message_count: number;
  workflow_state: string;
  participants: Array<{
    id: number;
    name: string;
  }>;
}

export interface User {
  id: number;
  name: string;
  short_name?: string;
  email?: string;
  avatar_url?: string;
  enrollments?: Enrollment[];
}

export interface QuizSubmission {
  id: number;
  quiz_id: number;
  score: number;
  kept_score: number;
  attempt: number;
  finished_at: string;
  workflow_state: string;
}

export interface TodoItem {
  type: string;
  assignment?: Assignment;
  context_name: string;
  course_id: number;
  html_url: string;
}

// Urgentie niveaus voor deadlines
export type UrgencyLevel = 'kritiek' | 'urgent' | 'let_op' | 'ok';

export interface DeadlineWithUrgency {
  assignment: Assignment;
  courseName: string;
  courseId: number;
  urgency: UrgencyLevel;
  urgencyEmoji: string;
  daysUntilDue: number;
}
