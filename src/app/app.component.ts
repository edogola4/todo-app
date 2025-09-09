import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TodoComponent } from './components/todo/todo.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    TodoComponent
  ],
  template: `
    <!-- Main App Component -->
    <div class="app-container">
      <main class="app-content">
        <app-todo></app-todo>
      </main>
    </div>
    
    <!-- Footer -->
    <footer class="app-footer">
      <p>&copy; 2025 DevExpress. Built with Angular, DevExpress, and CKEditor.</p>
    </footer>
  `,
  styles: [`
    .app-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    
    .app-content {
      flex: 1;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }
    
    .app-footer {
      text-align: center;
      padding: 20px;
      background-color: #f8f9fa;
      margin-top: auto;
    }
  `]
})
export class AppComponent {
  title = 'DevExpress Todo App';
}