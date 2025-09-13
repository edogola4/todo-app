import { Routes } from '@angular/router';
import { TodoComponent } from './todo.component';

export const TODO_ROUTES: Routes = [
  {
    path: '',
    component: TodoComponent,
    title: 'My Todos'
  }
];
