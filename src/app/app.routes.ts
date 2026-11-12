import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'projects' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login').then((m) => m.LoginPage),
    title: 'Sign in · EAsync',
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./pages/auth-callback').then((m) => m.AuthCallbackPage),
    title: 'Signing in · EAsync',
  },
  {
    path: 'projects',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/projects').then((m) => m.ProjectsPage),
    title: 'Projects · EAsync',
  },
  {
    path: 'projects/:projectId',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/project-diagrams').then((m) => m.ProjectDiagramsPage),
    title: 'Project · EAsync',
  },
  {
    path: 'diagrams/:diagramId',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/diagram-editor').then((m) => m.DiagramEditorPage),
    title: 'Diagram · EAsync',
  },
  { path: '**', redirectTo: 'projects' },
];

