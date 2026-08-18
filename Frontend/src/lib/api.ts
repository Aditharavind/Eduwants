import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('accessToken', access);
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/token/', { username, password }),

  register: (data: {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
    first_name?: string;
    last_name?: string;
    user_type?: string;
    phone?: string;
    academic_level?: string;
    field_of_study?: string;
    interested_subjects?: string[];
  }) => api.post('/users/', data),

  refresh: (refresh: string) =>
    api.post('/auth/token/refresh/', { refresh }),

  getMe: () => api.get('/users/me/'),

  getProfile: () => api.get('/users/profile/'),

  updateProfile: (data: any) => api.put('/users/profile/', data),

  getUsage: () => api.get('/users/usage/'),
};

// User API
export const userAPI = {
  getAll: () => api.get('/users/'),
  getById: (id: string) => api.get(`/users/${id}/`),
};

// AI API
export const aiAPI = {
  getStats: () => api.get('/ai/'),

  summarize: (text: string, length: string = 'medium') =>
    api.post('/ai/', { action: 'summarize', text, length }),

  generateFlashcards: (text: string, count: number = 5) =>
    api.post('/ai/', { action: 'flashcards', text, count }),

  solvePyq: (question: string) =>
    api.post('/ai/', { action: 'solve_pyq', question }),

  oneNightPrep: (topic: string) =>
    api.post('/ai/', { action: 'one_night_prep', topic }),

  ocr: (image: File, detail: string = 'high') => {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('detail', detail);
    return api.post('/ai/ocr/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  imageToNotes: (image: File) => {
    const formData = new FormData();
    formData.append('image', image);
    return api.post('/ai/image_to_notes/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  mentorChat: (message: string, history: any[] = []) =>
    api.post('/ai/mentor_chat/', { message, history }),
};

// Academic API
export const academicAPI = {
  // Subjects
  getSubjects: (params?: { academic_level?: string }) =>
    api.get('/academic/subjects/', { params }),
  getSubjectById: (id: string) => api.get(`/academic/subjects/${id}/`),
  createSubject: (data: any) => api.post('/academic/subjects/', data),
  updateSubject: (id: string, data: any) => api.put(`/academic/subjects/${id}/`, data),
  deleteSubject: (id: string) => api.delete(`/academic/subjects/${id}/`),

  // Modules
  getModules: (params?: { subject?: string }) =>
    api.get('/academic/modules/', { params }),
  getModuleById: (id: string) => api.get(`/academic/modules/${id}/`),
  createModule: (data: any) => api.post('/academic/modules/', data),
  updateModule: (id: string, data: any) => api.put(`/academic/modules/${id}/`, data),
  deleteModule: (id: string) => api.delete(`/academic/modules/${id}/`),

  // Notes
  getNotes: (params: { module?: string; is_public?: string } = {}) =>
    api.get('/academic/notes/', { params }),
  getMyNotes: () => api.get('/academic/notes/my_notes/'),
  getNoteById: (id: string) => api.get(`/academic/notes/${id}/`),
  createNote: (data: any) => api.post('/academic/notes/', data),
  updateNote: (id: string, data: any) => api.put(`/academic/notes/${id}/`, data),
  deleteNote: (id: string) => api.delete(`/academic/notes/${id}/`),

  // PYQs
  getPYQs: (params: { subject?: string; university?: string; year?: string } = {}) =>
    api.get('/academic/pyqs/', { params }),
  getPYQById: (id: string) => api.get(`/academic/pyqs/${id}/`),
  createPYQ: (data: any) => api.post('/academic/pyqs/', data),
  updatePYQ: (id: string, data: any) => api.put(`/academic/pyqs/${id}/`, data),
  deletePYQ: (id: string) => api.delete(`/academic/pyqs/${id}/`),
  getOneNightPrep: (subjectId: string) =>
    api.get('/academic/pyqs/one_night_prep/', { params: { subject: subjectId } }),
  getMustRead: (subjectId?: string) =>
    api.get('/academic/pyqs/must_read/', { params: { subject: subjectId } }),

  // Flashcards
  getFlashcards: (params: { note?: string } = {}) =>
    api.get('/academic/flashcards/', { params }),
  getFlashcardById: (id: string) => api.get(`/academic/flashcards/${id}/`),
  createFlashcard: (data: any) => api.post('/academic/flashcards/', data),
  updateFlashcard: (id: string, data: any) => api.put(`/academic/flashcards/${id}/`, data),
  deleteFlashcard: (id: string) => api.delete(`/academic/flashcards/${id}/`),

  // Manavalan Mentor Tasks
  getMentorTasks: () => api.get('/academic/mentor-tasks/'),
  createMentorTask: (data: { description: string; is_sticky?: boolean }) =>
    api.post('/academic/mentor-tasks/', data),
  updateMentorTask: (id: number, data: any) =>
    api.put(`/academic/mentor-tasks/${id}/`, data),
  deleteMentorTask: (id: number) => api.delete(`/academic/mentor-tasks/${id}/`),
  toggleTaskComplete: (id: number) => api.post(`/academic/mentor-tasks/${id}/toggle_complete/`),
  toggleTaskSticky: (id: number) => api.post(`/academic/mentor-tasks/${id}/toggle_sticky/`),

  // Dashboard Insights
  getPersonalizedFlashcards: () => api.get('/academic/dashboard-insights/personalized_flashcards/'),
};

// DataBank (PYQ with FAISS) API
export const databankAPI = {
  // Subjects
  getSubjects: () => api.get('/databank/subjects/'),
  createSubject: (data: { name: string; description?: string }) => api.post('/databank/subjects/', data),
  deleteSubject: (id: number) => api.delete(`/databank/subjects/${id}/`),

  // Documents (PDF upload)
  uploadPDF: (subjectId: number, file: File) => {
    const formData = new FormData();
    formData.append('subject', String(subjectId));
    formData.append('pdf', file);
    return api.post('/databank/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getDocuments: (id?: number, isModule: boolean = true) =>
    api.get('/databank/documents/', { params: id ? (isModule ? { module: id } : { subject: id }) : {} }),

  // PYQ Sessions
  createSession: (subjectId: number) => api.post('/databank/sessions/', { subject: subjectId }),
  getSession: (sessionId: number) => api.get(`/databank/sessions/${sessionId}/`),
  getSessions: () => api.get('/databank/sessions/'),

  // Answers
  submitAnswer: (questionId: number, studentAnswer: string) =>
    api.post('/databank/answers/', { question: questionId, student_answer: studentAnswer }),

  // Hierarchy (General Access)
  getUniversities: () => api.get('/databank/universities/'),
  getCourses: (univId?: number) => api.get('/databank/courses/', { params: univId ? { university: univId } : {} }),
  getSemesters: (courseId?: number) => api.get('/databank/semesters/', { params: courseId ? { course: courseId } : {} }),
  getModules: (semId?: number, courseName?: string) =>
    api.get('/databank/modules/', { params: { ...(semId ? { semester: semId } : {}), ...(courseName ? { course_name: courseName } : {}) } }),
  createSessionByModule: (moduleId: number) => api.post('/databank/sessions/', { module: moduleId }),

  // One-Night Prep (read-only)
  getQuestionBank: (params?: { course_name?: string; field_of_study?: string }) =>
    api.get('/databank/question-bank/', { params: params || {} }),
  getPrepInsights: (params?: { course_name?: string; field_of_study?: string }) =>
    api.get('/databank/question-bank/insights/', { params: params || {} }),
  getQuestionPapers: () => api.get('/databank/question-papers/'),
};


// Admin API (separate admin token stored as adminToken)
const adminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const adminAPI = {
  login: (username: string, password: string) =>
    api.post('/users/admin/login/', { username, password }),
  getStats: () => adminApi.get('/users/admin/stats/'),
  getUsers: () => adminApi.get('/users/admin/users/'),
  changePassword: (current_password: string, new_password: string) =>
    adminApi.post('/users/admin/change-password/', { current_password, new_password }),

  // DataBank via admin token
  getSubjects: () => adminApi.get('/databank/subjects/'),
  createSubject: (data: { name: string; description?: string }) =>
    adminApi.post('/databank/subjects/', data),
  deleteSubject: (id: number) => adminApi.delete(`/databank/subjects/${id}/`),
  getDocuments: (id?: number, isModule: boolean = true) =>
    adminApi.get('/databank/documents/', { params: id ? (isModule ? { module: id } : { subject: id }) : {} }),
  uploadPDF: (moduleId: number, file: File, isModule: boolean = true) => {
    const formData = new FormData();
    if (isModule) formData.append('module', String(moduleId));
    else formData.append('subject', String(moduleId));
    formData.append('pdf', file);
    return adminApi.post('/databank/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // User Management
  manageUser: (userId: number, action: 'blacklist' | 'whitelist' | 'delete') =>
    adminApi.post('/users/admin/users/', { user_id: userId, action }),

  // PYQ Sessions
  createPYQSession: (id: number, isModule: boolean = true) =>
    adminApi.post('/databank/sessions/', isModule ? { module: id } : { subject: id }),

  // Hierarchy Management
  universities: {
    list: () => adminApi.get('/databank/universities/'),
    create: (data: { name: string; location?: string }) => adminApi.post('/databank/universities/', data),
    delete: (id: number) => adminApi.delete(`/databank/universities/${id}/`),
  },
  courses: {
    list: (univId?: number) => adminApi.get('/databank/courses/', { params: univId ? { university: univId } : {} }),
    create: (data: { university: number; name: string; level: 'UG' | 'PG' }) => adminApi.post('/databank/courses/', data),
    delete: (id: number) => adminApi.delete(`/databank/courses/${id}/`),
  },
  semesters: {
    list: (courseId?: number) => adminApi.get('/databank/semesters/', { params: courseId ? { course: courseId } : {} }),
    create: (data: { course: number; semester_number: number }) => adminApi.post('/databank/semesters/', data),
    delete: (id: number) => adminApi.delete(`/databank/semesters/${id}/`),
  },
  modules: {
    list: (semId?: number) => adminApi.get('/databank/modules/', { params: semId ? { semester: semId } : {} }),
    create: (data: { semester: number; name: string; module_number: number; pdf?: File }) => {
      if (data.pdf) {
        const formData = new FormData();
        formData.append('semester', String(data.semester));
        formData.append('name', data.name);
        formData.append('module_number', String(data.module_number));
        formData.append('pdf', data.pdf);
        return adminApi.post('/databank/modules/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      return adminApi.post('/databank/modules/', data);
    },
    delete: (id: number) => adminApi.delete(`/databank/modules/${id}/`),
    reindex: (id: number) => adminApi.post(`/databank/modules/${id}/reindex_all/`),
  },

  // Note Verification
  notes: {
    list: () => adminApi.get('/academic/notes/'), // Might need special admin filter but general works
    verify: (noteId: number) => adminApi.post(`/academic/notes/${noteId}/verify/`),
    promote: (noteId: number, moduleId: number) =>
      adminApi.post(`/academic/notes/${noteId}/promote_to_databank/`, { module_id: moduleId }),
  },

  // Question Papers (admin-only write operations)
  questionPapers: {
    list: (semId?: number) => adminApi.get('/databank/question-papers/', { params: semId ? { semester: semId } : {} }),
    create: (formData: FormData) =>
      adminApi.post('/databank/question-papers/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    update: (id: number, formData: FormData) =>
      adminApi.patch(`/databank/question-papers/${id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    delete: (id: number) => adminApi.delete(`/databank/question-papers/${id}/`),
    analyze: (id: number) => adminApi.post(`/databank/question-papers/${id}/analyze/`),
  },
};


export default api;
