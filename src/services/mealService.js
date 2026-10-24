import { api } from './apiClient';

export const mealService = {
  getMeals: async ({ monthKey } = {}) => {
    const params = new URLSearchParams();
    if (monthKey) params.set('monthKey', monthKey);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get(`/meals${query}`);
  },

  recordMeal: async ({ date, memberId, lunch, dinner, isLeave = false }) => {
    const formattedDate = date.includes('T') ? date : `${date}T12:00:00.000Z`;
    return api.post('/meals/update', {
      date: formattedDate,
      memberId,
      lunch: Number(lunch) || 0,
      dinner: Number(dinner) || 0,
      isLeave: Boolean(isLeave),
    });
  },

  getLeaveRequests: async () => {
    return api.get('/meals/leave-requests');
  },

  createLeaveRequest: async ({ startDate, endDate, reason }) => {
    return api.post('/meals/leave-request', { startDate, endDate, reason });
  },

  approveLeaveRequest: async (id, { status }) => {
    return api.patch(`/meals/leave-requests/${id}`, { status });
  },
};
