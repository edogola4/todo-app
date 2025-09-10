<div align="center">
  <h1>Todo App</h1>
  <p>✨ A sophisticated task management application built with Angular and modern web technologies</p>

[![Vercel](https://vercelbadge.vercel.app/api/edogola4/todo-app)](https://todo-app.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Last Commit](https://img.shields.io/github/last-commit/edogola4/todo-app)](https://github.com/edogola4/todo-app/commits/main)
[![GitHub Issues](https://img.shields.io/github/issues/edogola4/todo-app)](https://github.com/edogola4/todo-app/issues)
[![GitHub PRs](https://img.shields.io/github/issues-pr/edogola4/todo-app)](https://github.com/edogola4/todo-app/pulls)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/edogola4/todo-app/graphs/commit-activity) 
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

[![Angular](https://img.shields.io/badge/Angular-16.2.0-DD0031?logo=angular&logoColor=white)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![RxJS](https://img.shields.io/badge/RxJS-7.8.0-B7178C?logo=reactivex&logoColor=white)](https://rxjs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18.16.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Jasmine](https://img.shields.io/badge/Jasmine-4.6.0-8A4182?logo=jasmine&logoColor=white)](https://jasmine.github.io/)
[![Karma](https://img.shields.io/badge/Karma-6.4.0-EB3E3E?logo=karma&logoColor=white)](https://karma-runner.github.io/)

</div>

## 🚀 Features

### Authentication & Security
- 🔐 **JWT Authentication**: Secure user authentication with JSON Web Tokens
- 🔄 **Session Management**: Automatic token refresh and secure storage
- 🔒 **Password Reset**: Secure password reset flow with email verification
- 👤 **User Profiles**: Personalized user experience with profile management

### Task Management
- 📝 **Rich Text Editing**: Create and edit tasks with a powerful rich text editor
- 🏷️ **Task Organization**: Categorize and prioritize your tasks effectively
- 🔄 **Drag & Drop**: Intuitive task reordering with drag and drop
- 🔍 **Search & Filter**: Quickly find tasks with powerful search and filtering
- 📅 **Due Dates & Reminders**: Never miss a deadline with due dates and notifications

### User Experience
- 🌓 **Dark/Light Mode**: Built-in theme support for comfortable usage
- 📱 **Responsive Design**: Works seamlessly across all devices
- ⚡ **Progressive Web App**: Installable and works offline
- 🌍 **Internationalization**: Support for multiple languages

### Development & Deployment
- 🛠 **CI/CD Pipeline**: Automated testing and deployment with GitHub Actions
- 🔄 **Preview Deployments**: Automatic preview deployments for pull requests
- 🚀 **Production Deployments**: Automated deployment to Vercel on main branch updates
- 🧪 **Testing**: Comprehensive unit and integration testing with Jasmine/Karma

## 📦 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/edogola4/todo-app.git
   cd todo-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   ng serve
   ```

4. Open your browser and navigate to `http://localhost:4200/`

## 🔄 CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment:

### Workflows

1. **CI Workflow**
   - Triggered on push to main and pull requests
   - Runs linting, tests, and builds the application
   - Uploads build artifacts

2. **Vercel Deployment**
   - Deploys to Vercel on push to main
   - Creates preview deployments for pull requests
   - Requires `VERCEL_TOKEN` secret in GitHub repository settings

### Environment Variables

Set up the following secrets in your GitHub repository settings:

- `VERCEL_TOKEN`: Vercel authentication token
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID

## 🧪 Testing

### Unit Tests

Run the unit tests to verify the functionality of individual components and services:

```bash
# Run all unit tests
ng test

# Run tests in watch mode
ng test --watch=true

# Run a specific test file
ng test --include=**/components/auth/login/login.component.spec.ts
```

### Testing Strategy

- **Component Tests**: Test component templates and behavior
- **Service Tests**: Verify API interactions and business logic
- **Form Validation**: Test form controls and validators
- **Authentication**: Test login/logout and protected routes

### Test Coverage

Generate a test coverage report:

```bash
ng test --code-coverage
```

Coverage reports will be available in `coverage/` directory.

## 🛠️ Development

### Prerequisites

- Node.js 18.16.0 or higher
- npm 9.5.0 or higher
- Angular CLI 16.2.0 or higher

### Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `ng serve`
4. Open `http://localhost:4200` in your browser

### Build

```bash
# Development build
ng build

# Production build with optimizations
ng build --configuration production
```

Build artifacts will be stored in the `dist/` directory.

### Code Style

This project follows the [Angular Style Guide](https://angular.io/guide/styleguide).

- Run linting: `ng lint`
- Format code: `npx prettier --write "**/*.{ts,html,scss,json,md}"`

## 🚀 Development Server

Start the development server with hot module replacement:

```bash
# Start the development server
ng serve

# Open in default browser automatically
ng serve --open

# Use a different port
ng serve --port 4201

# Enable production mode
ng serve --configuration production
```

The application will be available at `http://localhost:4200/` by default.

## 🔧 Environment Configuration

### Development
Create a `src/environments/environment.ts` file with your development configuration:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api', // Your API URL
  appName: 'Todo App (Dev)'
};
```

### Production
Update `src/environments/environment.prod.ts` for production settings.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Angular](https://angular.io/) - The web framework used
- [Angular Material](https://material.angular.io/) - UI component library
- [RxJS](https://rxjs.dev/) - Reactive programming library
- [Jasmine](https://jasmine.github.io/) - Testing framework
- [Karma](https://karma-runner.github.io/) - Test runner

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
