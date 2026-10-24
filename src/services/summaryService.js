import { api } from './apiClient';

export const summaryService = {
  getSummary: async (monthKey) => {
    const query = monthKey ? `?monthKey=${encodeURIComponent(monthKey)}` : '';
    return api.get(`/summary${query}`);
  },
};
