import axios, { AxiosInstance } from 'axios';

export class CanvasClient {
  private axios: AxiosInstance;

  constructor(baseUrl: string, apiToken: string) {
    this.axios = axios.create({
      baseURL: baseUrl,
      headers: { Authorization: `Bearer ${apiToken}` }
    });
  }

  // Generieke GET met error handling
  async get<T>(url: string, params: any = {}): Promise<T> {
    try {
      const response = await this.axios.get(url, { params });
      return response.data;
    } catch (error: any) {
      this.handleError(error);
    }
  }

  // Generieke POST met error handling
  async post<T>(url: string, data: any = {}, params: any = {}): Promise<T> {
    try {
      const response = await this.axios.post(url, data, { params });
      return response.data;
    } catch (error: any) {
      this.handleError(error);
    }
  }

  // Generieke PUT met error handling
  async put<T>(url: string, data: any = {}, params: any = {}): Promise<T> {
    try {
      const response = await this.axios.put(url, data, { params });
      return response.data;
    } catch (error: any) {
      this.handleError(error);
    }
  }

  // Generieke DELETE met error handling
  async delete<T>(url: string, params: any = {}): Promise<T> {
    try {
      const response = await this.axios.delete(url, { params });
      return response.data;
    } catch (error: any) {
      this.handleError(error);
    }
  }

  // Alle pagina's ophalen voor gepagineerde endpoints
  async fetchAllPages<T>(url: string, params: any = {}): Promise<T[]> {
    let results: T[] = [];
    let page = 1;
    let hasMore = true;
    const per_page = params.per_page || 100;
    while (hasMore) {
      const pageParams = { ...params, page, per_page };
      const data: T[] = await this.get<T[]>(url, pageParams);
      results.push(...data);
      hasMore = data.length === per_page;
      page += 1;
    }
    return results;
  }

  // Centrale error handler
  private handleError(error: any): never {
    if (error.response?.data?.errors) {
      throw new Error(JSON.stringify(error.response.data.errors));
    }
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('Onbekende fout opgetreden in CanvasClient');
  }

  // --- Cursussen ---
  async listCourses(params: any = {}) {
    return this.get('/api/v1/courses', params);
  }

  async getCourse(courseId: string, params: any = {}) {
    return this.get(`/api/v1/courses/${courseId}`, params);
  }

  // --- Assignments ---
  async listCourseAssignments(courseId: string, params: any = {}) {
    return this.get(`/api/v1/courses/${courseId}/assignments`, params);
  }

  async getAssignment(courseId: string, assignmentId: string, params: any = {}) {
    return this.get(`/api/v1/courses/${courseId}/assignments/${assignmentId}`, params);
  }

  // --- Eigen submissions (als student) ---
  async getMySubmission(courseId: string, assignmentId: string, params: any = {}) {
    return this.get(`/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/self`, params);
  }

  async getMySubmissions(courseId: string, params: any = {}) {
    return this.get(`/api/v1/courses/${courseId}/students/submissions`, {
      ...params,
      'student_ids[]': 'self'
    });
  }

  // --- Modules ---
  async listModules(courseId: string, params: any = {}) {
    return this.get(`/api/v1/courses/${courseId}/modules`, params);
  }

  async listModuleItems(courseId: string, moduleId: string, params: any = {}) {
    return this.get(`/api/v1/courses/${courseId}/modules/${moduleId}/items`, params);
  }

  // --- Pagina's ---
  async listPages(courseId: string, params: any = {}) {
    return this.get(`/api/v1/courses/${courseId}/pages`, params);
  }

  async getPage(courseId: string, pageUrl: string) {
    return this.get(`/api/v1/courses/${courseId}/pages/${encodeURIComponent(pageUrl)}`);
  }

  // --- Announcements ---
  async listAnnouncements(contextCodes: string[], params: any = {}) {
    return this.get('/api/v1/announcements', {
      ...params,
      'context_codes[]': contextCodes
    });
  }

  // --- Discussies ---
  async listDiscussionTopics(courseId: string, params: any = {}) {
    return this.get(`/api/v1/courses/${courseId}/discussion_topics`, params);
  }

  // --- Cursus gebruikers (docenten en medestudenten) ---
  async listCourseUsers(courseId: string, params: any = {}) {
    return this.get(`/api/v1/courses/${courseId}/users`, params);
  }

  // --- Bestanden ---
  async listCourseFiles(courseId: string, params: any = {}) {
    return this.get(`/api/v1/courses/${courseId}/files`, params);
  }

  // --- Kalender ---
  async listCalendarEvents(params: any = {}) {
    return this.get('/api/v1/calendar_events', params);
  }

  // --- Inbox (Conversations) ---
  async listConversations(params: any = {}) {
    return this.get('/api/v1/conversations', params);
  }

  // --- Todo items ---
  async listTodoItems() {
    return this.get('/api/v1/users/self/todo');
  }

  // --- Eigen gebruiker ---
  async getSelf() {
    return this.get('/api/v1/users/self');
  }

  // --- Quizzen ---
  async listQuizzes(courseId: string, params: any = {}) {
    return this.get(`/api/v1/courses/${courseId}/quizzes`, params);
  }

  async listQuizSubmissions(courseId: string, quizId: string, params: any = {}) {
    return this.get(`/api/v1/courses/${courseId}/quizzes/${quizId}/submissions`, params);
  }

  // --- Activity stream ---
  async listActivityStream(params: any = {}) {
    return this.get('/api/v1/users/self/activity_stream', params);
  }

  // --- Zoeken ---
  async searchCourseContent(courseId: string, searchTerm: string) {
    return this.get(`/api/v1/search/recipients`, {
      search: searchTerm,
      context: `course_${courseId}`,
      type: 'context'
    });
  }

  // --- Rubrics ---
  async getRubric(courseId: string, rubricId: string, params: any = {}) {
    return this.get(`/api/v1/courses/${courseId}/rubrics/${rubricId}`, params);
  }

  // --- Leerdoelen ---
  async listOutcomes(courseId: string, params: any = {}) {
    return this.get(`/api/v1/courses/${courseId}/outcome_group_links`, params);
  }

  async getOutcome(outcomeId: string) {
    return this.get(`/api/v1/outcomes/${outcomeId}`);
  }
}
