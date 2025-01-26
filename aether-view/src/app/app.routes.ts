import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/discover/discover.component').then(m => m.DiscoverComponent) },
  { path: 'recommendation', loadComponent: () => import('./pages/recommendation/recommendation.component').then(m => m.RecommendationComponent) },
  {
    path: 'discover/movies',
    loadComponent: () => import('./pages/filter-page/filter-page.component').then(m => m.FilterPageComponent),
    data: { type: 'movies' },
  },
  {
    path: 'discover/series',
    loadComponent: () => import('./pages/filter-page/filter-page.component').then(m => m.FilterPageComponent),
    data: { type: 'series' },
  },
  { path: 'tv/:id', loadComponent: () => import('./pages/tv-details/tv-details.component').then(m => m.TvDetailsComponent) },
  { path: 'movie/:id', loadComponent: () => import('./pages/movie-details/movie-details.component').then(m => m.MovieDetailsComponent) },
  {
    path: 'person/:id',
    loadComponent: () => import('./pages/person-details/person-details.component').then(m => m.PersonDetailsComponent),
  },
];
