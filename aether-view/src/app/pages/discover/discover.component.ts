import { Component, inject, Signal, signal, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TmdbService } from '@services/tmdb.service';
import { SliderComponent } from '@components/slider/slider.component';
import { MOVIE_GENRES, SERIES_GENRES } from '@app/data/constants/genres';
import { STUDIOS } from '@app/data/constants/studios';
import { NETWORKS } from '@app/data/constants/networks';


@Component({
  selector: 'app-discover',
  standalone: true,
  imports: [SliderComponent, RouterLink],
  templateUrl: './discover.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DiscoverComponent {
  MOVIE_GENRES = MOVIE_GENRES;
  SERIES_GENRES = SERIES_GENRES;
  STUDIOS = STUDIOS;
  NETWORKS = NETWORKS;

  protected readonly tmdbService = inject(TmdbService);

  protected readonly popularSeries = this.tmdbService.popularSeries;
  protected readonly trendingSeries = this.tmdbService.trendingSeries;

  protected readonly trendingMovies = this.tmdbService.trendingMovies;
  protected readonly upcomingMovies = this.tmdbService.upcomingMovies;

  protected readonly currentPopularSeriesPage = signal(1);
}
