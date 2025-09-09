export const environment = {
  production: true,
  apiUrl: 'https://staging-api.todoapp.com/v1', // Staging API URL
  appName: 'Todo App (Staging)',
  version: '1.0.0-staging',
  enableDebug: true,
  localStoragePrefix: 'todo-staging-',
  features: {
    analytics: true,
    notifications: false,
    offlineMode: true
  },
  security: {
    enableAuth: true,
    tokenExpiration: 28800 // 8 hours in seconds
  }
};
