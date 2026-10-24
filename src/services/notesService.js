import { api } from './apiClient';

export const notesService = {
  getNotes: async () => {
    return api.get('/notes');
  },

  createNote: async (data) => {
    const payload = {
      title: data.title,
      content: data.content ?? '',
      isChecklist: Boolean(data.isChecklist),
      items: data.items ?? data.checklistItems ?? null,
    };
    return api.post('/notes', payload);
  },

  updateNote: async (id, data) => {
    const payload = { ...data };
    if (payload.checklistItems !== undefined && payload.items === undefined) {
      payload.items = payload.checklistItems;
    }
    return api.put(`/notes/${id}`, payload);
  },

  deleteNote: async (id) => {
    return api.delete(`/notes/${id}`);
  },
};
