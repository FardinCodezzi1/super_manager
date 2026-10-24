import { api } from './apiClient';

export const depositService = {
  getDeposits: async ({ monthKey, memberId } = {}) => {
    const params = new URLSearchParams();
    if (monthKey) params.set('monthKey', monthKey);
    if (memberId && memberId !== 'all') params.set('memberId', memberId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get(`/deposits${query}`);
  },

  createDeposit: async (data) => {
    return api.post('/deposits', data);
  },

  updateDeposit: async (id, data) => {
    return api.put(`/deposits/${id}`, data);
  },

  deleteDeposit: async (id) => {
    return api.delete(`/deposits/${id}`);
  },
};
