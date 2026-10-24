import { api } from './apiClient';

export const bazarService = {
  getBazar: async ({ monthKey, memberId, status } = {}) => {
    const params = new URLSearchParams();
    if (monthKey) params.set('monthKey', monthKey);
    if (memberId && memberId !== 'all') params.set('memberId', memberId);
    if (status && status !== 'all') params.set('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get(`/bazar${query}`);
  },

  createBazar: async (data) => {
    return api.post('/bazar', data);
  },

  approveBazar: async (id, { status }) => {
    return api.patch(`/bazar/${id}/approve`, { status });
  },

  updateBazar: async (id, data) => {
    return api.put(`/bazar/${id}`, data);
  },

  deleteBazar: async (id) => {
    return api.delete(`/bazar/${id}`);
  },
};
