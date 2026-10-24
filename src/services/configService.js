import { api } from './apiClient';

export const configService = {
  getAppConfig: async () => {
    return api.get('/config');
  },
};
