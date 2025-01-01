
import { Component, inject, Signal, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Series } from '../../interfaces/series';
import { Movie } from '../../interfaces/movies';
import { TmdbService } from '../../services/tmdb.service';
import { Swiper } from 'swiper';
import { SliderComponent } from '../../components/slider/slider.component';
import { MOVIE_GENRES, SERIES_GENRES } from '../../../../public/assets/genres';
import { STUDIOS } from '../../../../public/assets/studios';

@Component({
  selector: 'app-discover',
  standalone: true,
  imports: [SliderComponent],
  templateUrl: './discover.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DiscoverComponent { 


  MOVIE_GENRES = MOVIE_GENRES;
  SERIES_GENRES = SERIES_GENRES;
  STUDIOS = STUDIOS;
  
  tmdbService = inject(TmdbService);

  popularSeries: Signal<Series[]> = signal<Series[]>([])
  trendingSeries: Signal<Series[]> = signal<Series[]>([])
  
  trendingMovies: Signal<Movie[]> = signal<Movie[]>([])
  upcomingMovies: Signal<Movie[]> = signal<Movie[]>([])


  currentPopularSeriesPage = signal(1)

  // Using existing service function for popular series
  ngOnInit() {
    this.popularSeries = this.tmdbService.popularSeries;
    this.trendingSeries = this.tmdbService.trendingSeries;

    this.trendingMovies = this.tmdbService.trendingMovies;
    this.upcomingMovies = this.tmdbService.upcomingMovies;
    console.log(this.popularSeries())
  }

}