export const environment = {
  production: true,
  apiUrl: 'https://api.todoapp.com/v1', // Production API URL
  appName: 'Todo App',
  version: '1.0.0',
  enableDebug: false,
  localStoragePrefix: 'todo-prod-',
  features: {
    analytics: true,
    notifications: true,
    offlineMode: true
  },
  security: {
    enableAuth: true,
    tokenExpiration: 86400 // 24 hours in seconds
  }
};
