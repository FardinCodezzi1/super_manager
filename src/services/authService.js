import { api } from './apiClient';

export const authService = {
  login: async ({ email, password }) => {
    return api.post('/auth/login', { email, password });
  },

  register: async ({ name, email, password, phone }) => {
    return api.post('/auth/register', { name, email, password, phone: phone || undefined });
  },

  getMe: async () => {
    return api.get('/auth/me');
  },

  updateProfile: async (data) => {
    return api.put('/auth/profile', data);
  },

  updatePassword: async ({ currentPassword, newPassword }) => {
    return api.put('/auth/password', { currentPassword, newPassword });
  },

  deleteAccount: async ({ password }) => {
    return api.delete('/auth/account', { password });
  },
};
