import { api } from './apiClient';

export const messService = {
  getMess: async () => {
    return api.get('/mess');
  },

  createMess: async ({ name }) => {
    return api.post('/mess/create', { name });
  },

  joinMess: async ({ inviteCode }) => {
    return api.post('/mess/join', { inviteCode });
  },

  leaveMess: async () => {
    return api.post('/mess/leave');
  },

  updateMess: async (data) => {
    return api.put('/mess', data);
  },

  deleteMess: async ({ password, force = true }) => {
    return api.delete('/mess', { password, force });
  },

  getMembers: async (messId) => {
    const query = messId ? `?messId=${encodeURIComponent(messId)}` : '';
    return api.get(`/mess/members${query}`);
  },

  getMonths: async () => {
    return api.get('/mess/months');
  },

  createMonth: async ({ monthKey }) => {
    return api.post('/mess/months', { monthKey });
  },

  getManagerSequence: async () => {
    return api.get('/mess/manager/sequence');
  },

  updateManagerSequence: async ({ memberIds, rotationType, reason }) => {
    return api.put('/mess/manager/sequence', { memberIds, rotationType, reason });
  },

  transferManagerRole: async ({ targetMemberId, reason }) => {
    return api.post('/mess/manager/transfer', { targetMemberId, reason });
  },

  getManagerLogs: async () => {
    return api.get('/mess/manager/logs');
  },

  exportData: async (monthKey) => {
    return api.get(`/mess/export?monthKey=${encodeURIComponent(monthKey)}`);
  },
};
