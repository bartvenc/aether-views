import { Component, inject, Signal, signal, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { TmdbService } from '../../services/tmdb.service';
import { SliderComponent } from '../../components/slider/slider.component';
import { MOVIE_GENRES, SERIES_GENRES } from '../../../../public/assets/genres';
import { STUDIOS } from '../../../../public/assets/studios';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-discover',
  standalone: true,
  imports: [SliderComponent, RouterLink],
  templateUrl: './discover.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DiscoverComponent implements OnInit {
  MOVIE_GENRES = MOVIE_GENRES;
  SERIES_GENRES = SERIES_GENRES;
  STUDIOS = STUDIOS;

  tmdbService = inject(TmdbService);

  popularSeries = this.tmdbService.popularSeries;
  trendingSeries = this.tmdbService.trendingSeries;

  trendingMovies = this.tmdbService.trendingMovies;
  upcomingMovies = this.tmdbService.upcomingMovies;

  currentPopularSeriesPage = signal(1);

  // Using existing service function for popular series
  ngOnInit() {
    console.log(this.popularSeries());
  }
}
