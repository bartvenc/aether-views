
import { Component, inject, Signal, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Series } from '../../interfaces/series';
import { TmdbService } from '../../services/tmdb.service';
import { RouterLink } from '@angular/router';
import { Swiper } from 'swiper';

@Component({
  selector: 'app-discover',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './discover.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DiscoverComponent { // Mock data signals

  tmdbService = inject(TmdbService);
  popularSeries: Signal<Series[]> = signal<Series[]>([])

  currentPopularSeriesPage = signal(1)



  popularMovies = signal([
    { name: 'Mufasa', poster_path: '/path/to/mufasa.jpg', release_date: '2024-12-01' },
    { name: 'Superman', poster_path: '/path/to/superman.jpg', release_date: '2024-11-15' },
    { name: 'Kraven', poster_path: '/path/to/kraven.jpg', release_date: '2024-10-10' },
  ]);

  trendingMovies = signal([
    { name: 'Red One', poster_path: '/path/to/redone.jpg', release_date: '2024-09-01' },
    { name: 'Carry-On', poster_path: '/path/to/carryon.jpg', release_date: '2024-08-20' },
  ]);

  movieGenres = signal(['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary']);

  movieStudios = signal(['Walt Disney Pictures', '20th Century Studios', 'Sony Pictures', 'Warner Bros.', 'Universal', 'Paramount']);

  // Using existing service function for popular series
  ngOnInit() {
    this.popularSeries = this.tmdbService.popularSeries;
    console.log(this.popularSeries())
  }
  trendingSeries = signal([
    { name: 'Queen', poster_path: '/path/to/queen.jpg', first_air_date: '2024-12-10' },
    { name: 'Daredevil', poster_path: '/path/to/daredevil.jpg', first_air_date: '2024-11-01' },
  ]);

  seriesGenres = signal(['Action & Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama']);

  seriesNetworks = signal(['Netflix', 'Disney+', 'Prime Video', 'Apple TV+', 'Hulu', 'HBO']);
}