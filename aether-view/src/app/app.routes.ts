import { Routes } from '@angular/router';
import { DiscoverComponent } from './pages/discover/discover.component';
import { TvDetailsComponent } from './pages/tv-details/tv-details.component';
import { AppComponent } from './app.component';
import { RecommendationComponent } from './pages/recommendation/recommendation.component';
import { MovieDetailsComponent } from './pages/movie-details/movie-details.component';

export const routes: Routes = [
  { path: '', component: AppComponent },
  { path: 'recommendation', component: RecommendationComponent },
  { path: 'discover', component: DiscoverComponent},
  { path: 'tv/:id', component: TvDetailsComponent },
  { path: 'movie/:id', component: MovieDetailsComponent }
];
