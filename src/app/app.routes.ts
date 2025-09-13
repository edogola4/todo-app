import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'todos',
    pathMatch: 'full'
  },
  {
    path: 'todos',
    loadChildren: () => import('./components/todo/todo.routes').then(m => m.TODO_ROUTES),
    canActivate: [authGuard]
  },
  {
    path: 'auth',
    loadChildren: () => import('./components/auth/auth.module').then(m => m.AuthModule),
    canActivate: [publicGuard]
  },
  {
    path: '**',
    redirectTo: 'todos'
  }
];
