import { api } from './apiClient';

export const tourService = {
  getTours: async () => {
    return api.get('/tours');
  },

  getTourById: async (id) => {
    return api.get(`/tours/${id}`);
  },

  createTour: async (data) => {
    return api.post('/tours', data);
  },

  joinTour: async ({ inviteCode }) => {
    return api.post('/tours/join', { inviteCode });
  },

  updateTour: async (id, data) => {
    return api.put(`/tours/${id}`, data);
  },

  deleteTour: async (id) => {
    return api.delete(`/tours/${id}`);
  },

  addParticipant: async (tourId, { name, phone, email, role }) => {
    return api.post(`/tours/${tourId}/members`, { name, phone, email, role });
  },

  updateParticipantRole: async (tourId, memberId, { role, name, phone }) => {
    return api.put(`/tours/${tourId}/members/${memberId}`, { role, name, phone });
  },

  removeParticipant: async (tourId, memberId) => {
    return api.delete(`/tours/${tourId}/members/${memberId}`);
  },

  addExpense: async (tourId, data) => {
    return api.post(`/tours/${tourId}/expenses`, data);
  },

  updateExpense: async (tourId, expenseId, data) => {
    try {
      return await api.put(`/tours/${tourId}/expenses/${expenseId}`, data);
    } catch (err) {
      // If PUT is not supported by API, delete and recreate
      if (err?.message?.includes('Cannot PUT') || err?.status === 404 || err?.status === 405) {
        await api.delete(`/tours/${tourId}/expenses/${expenseId}`);
        return await api.post(`/tours/${tourId}/expenses`, data);
      }
      throw err;
    }
  },

  deleteExpense: async (tourId, expenseId) => {
    return api.delete(`/tours/${tourId}/expenses/${expenseId}`);
  },

  addDeposit: async (tourId, data) => {
    return api.post(`/tours/${tourId}/deposits`, data);
  },

  updateDeposit: async (tourId, depositId, data) => {
    try {
      return await api.put(`/tours/${tourId}/deposits/${depositId}`, data);
    } catch (err) {
      // If PUT is not supported by API, delete and recreate
      if (err?.message?.includes('Cannot PUT') || err?.status === 404 || err?.status === 405) {
        await api.delete(`/tours/${tourId}/deposits/${depositId}`);
        return await api.post(`/tours/${tourId}/deposits`, data);
      }
      throw err;
    }
  },

  deleteDeposit: async (tourId, depositId) => {
    return api.delete(`/tours/${tourId}/deposits/${depositId}`);
  },
};
