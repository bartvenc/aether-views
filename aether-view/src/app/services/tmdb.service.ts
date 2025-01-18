import { Injectable, inject, Signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Season, Series } from '../interfaces/series';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { forkJoin, Observable, switchMap, tap } from 'rxjs';
import { Movie } from '../interfaces/movies';
import { Genre, Person } from '../interfaces/common-interfaces';
import { Studio } from '../../../public/assets/studios';
import { ContentItem } from '../pages/filter-page/filter-page.component';

@Injectable({ providedIn: 'root' })
export class TmdbService {
  private readonly apiKey = '4692df374a198e0172ac98003b5cdab3';
  private readonly baseUrl = 'https://api.themoviedb.org/3';
  private userRegion: string = 'US';

  http: HttpClient = inject(HttpClient);

  private popularSeriesSignal: Signal<Series[]> | null = null;

  async initializeRegion(): Promise<void> {
    try {
      const browserLang = navigator.language;
      if (browserLang) {
        const region = browserLang.split('-')[1] || browserLang.toUpperCase();
        console.log('Detected region:', region);
        this.userRegion = region;
      }

      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      if (data.country) {
        this.userRegion = data.country;
        console.log('Detected ipapi region:', this.userRegion);
      }
    } catch (error) {
      console.warn('Could not detect region, using default:', this.userRegion);
    }
  }



  // Convert the HTTP Observable directly to a Signal/
  get popularSeries(): Signal<Series[]> {
    if (!this.popularSeriesSignal) {
      this.popularSeriesSignal = toSignal(
        this.http.get<{ results: Series[] }>(`${this.baseUrl}/tv/popular?api_key=${this.apiKey}`).pipe(map(response => response.results)),
        { initialValue: [] }
      );
    }
    return this.popularSeriesSignal;
  }

  // Convert the HTTP Observable directly to a Signal
  private trendingSeriesSignal: Signal<Series[]> | null = null;
  get trendingSeries(): Signal<Series[]> {
    if (!this.trendingSeriesSignal) {
      this.trendingSeriesSignal = toSignal(
        this.http.get<{ results: Series[] }>(`${this.baseUrl}/trending/tv/week?api_key=${this.apiKey}`)
          .pipe(
            map(response => response.results),
            map(series => series.map(({ media_type, ...seriesWithoutMediaType }) => seriesWithoutMediaType))
          ),
        { initialValue: [] }
      );
    }
    return this.trendingSeriesSignal;
  }

  private trendingMoviesSignal: Signal<Movie[]> | null = null;
  get trendingMovies(): Signal<Movie[]> {
    if (!this.trendingMoviesSignal) {
      this.trendingMoviesSignal = toSignal(
        this.http.get<{ results: Movie[] }>(`${this.baseUrl}/trending/movie/week?api_key=${this.apiKey}`)
          .pipe(
            map(response => response.results),
            map(movies => movies.map(({ media_type, ...movieWithoutMediaType }) => movieWithoutMediaType))
          ),
        { initialValue: [] }
      );
    }
    return this.trendingMoviesSignal;
  }

  private upcomingMoviesSignal: Signal<Movie[]> | null = null;
  get upcomingMovies(): Signal<Movie[]> {
    if (!this.upcomingMoviesSignal) {
      this.upcomingMoviesSignal = toSignal(
        this.http.get<{ results: Movie[] }>(`${this.baseUrl}/movie/upcoming?api_key=${this.apiKey}`).pipe(map(response => response.results)),
        { initialValue: [] }
      );
    }
    return this.upcomingMoviesSignal;
  }

  private movieGenresSignal: Signal<Genre[]> | null = null;
  get movieGenres(): Signal<Genre[]> {
    if (!this.movieGenresSignal) {
      this.movieGenresSignal = toSignal(
        this.http.get<{ genres: Genre[] }>(`${this.baseUrl}/genre/movie/list?api_key=${this.apiKey}`).pipe(map(response => response.genres)),
        { initialValue: [] }
      );
    }
    return this.movieGenresSignal;
  }

  fetchMoviesByPopularity(page = 1) {
    const url = `${this.baseUrl}/discover/movie?api_key=${this.apiKey}&sort_by=popularity.desc&page=${page}`;
    return this.http.get<any>(url);
  }

  fetchContent(filters: any, page = 1, type: 'movie' | 'tv' = 'movie'): Observable<any> {
    console.log(filters);
    console.log(this.userRegion);
    const params: any = {
      api_key: this.apiKey,
      language: 'en-US',
      page: page.toString(),
      include_adult: false,
      watch_region: this.userRegion,
      with_origin_country: filters.country
    };

    switch (filters.category) {
      case 'Popular':
        params.sort_by = 'popularity.desc';
        if (type === 'tv') {
          params.include_video = false; // TV-specific params
        }
        if (filters.year > 0) {
          if (type === 'movie') {
            params.primary_release_year = filters.year;
          }
          // No direct year filter for TV popular category
        }
        break;

      case 'New':
        params.sort_by = type === 'movie' ? 'release_date.desc' : 'first_air_date.desc';
        console.log('Year:', filters.year);
        if (filters.year > 0) {
          params.primary_release_year = filters.year; // Movies
          params.first_air_date_year = filters.year; // TV
        }
        break;

      case 'Top Rated':
        params.sort_by = 'vote_average.desc';
        params['vote_count.gte'] = '200';
        params.without_genres = '99,10755'; // Exclude genres (optional)
        if (filters.year > 0) {
          if (type === 'movie') {
            params.primary_release_year = filters.year;
          } else {
            params.first_air_date_year = filters.year;
          }
        }
        break;

      case 'Now Playing':
        params.sort_by = 'popularity.desc';
        const today = new Date();
        const minDate = `${today.getFullYear()}-${today.getMonth() + 1}-01`;
        const maxDate = `${today.getFullYear()}-${today.getMonth() + 1}-28`;

        if (type === 'movie') {
          params.with_release_type = '2|3';
          params['release_date.gte'] = minDate;
          params['release_date.lte'] = maxDate;
        } else {
          params['air_date.gte'] = minDate;
          params['air_date.lte'] = maxDate;
        }
        break;

      default:
        params.sort_by = 'popularity.desc';
    }

    // Append additional filters if set
    if (filters.genres && filters.genres.length !== 0) {
      params.with_genres = filters.genres.join(',');
    }
    if (filters.studioOrNetwork && filters.studioOrNetwork !== 0) {
      if (type === 'movie') {
        params.with_companies = filters.studioOrNetwork;
      } else if (type === 'tv') {
        params.with_networks = filters.studioOrNetwork;
      }
    }
    if (filters.keywords && filters.keywords.length !== 0) {
      params.with_keywords = filters.keywords;
    }
    if (filters.person && filters.person !== 0) {
      params.with_cast = filters.person;
    }

    if (filters.country === 'KR') {
      // Exclude romance and drama (10749, 18) for Korean content to filter adult movies
      params.without_genres = params.without_genres 
        ? `${params.without_genres},10749,18` 
        : '10749,18';
    }

    const queryString = new URLSearchParams(params).toString();
    return this.http.get<any>(`${this.baseUrl}/discover/${type}?${queryString}`);
  }

  getPersonDetails(personId: number): Observable<Person> {
    const url = `${this.baseUrl}/person/${personId}?append_to_response=images&language=en-US&api_key=${this.apiKey}`;
    return this.http.get<Person>(url);
  }

  getPersonCombinedCredits(personId: number): Observable<(Movie | Series)[]> {
    const url = `${this.baseUrl}/person/${personId}/combined_credits?api_key=${this.apiKey}`;
    return this.http.get<{ cast: (Movie | Series)[] }>(url).pipe(map(response => response.cast));
  }

  searchKeyword(query: string) {
    const url = `${this.baseUrl}/search/keyword?api_key=${this.apiKey}&query=${encodeURIComponent(query)}&language=en-US`;
    return this.http.get<{ results: { id: number; name: string }[] }>(url);
  }

  getImageUrl(item: Series | Movie | Studio | Genre | Person | null | ContentItem |undefined): string | null {
    if (!item) return null;

    if (this.isSeries(item)) {
      return this.getPosterUrl(item.poster_path);
    }

    if (this.isMovie(item)) {
      return this.getPosterUrl(item.poster_path) ?? 'assets/poster.png';
    }

    if (this.isStudio(item)) {
      return this.getStudioLogoUrl(item);
    }

    if (this.isGenre(item)) {
      return this.getPosterUrl(item.posterUrl);
    }

    if (this.isPerson(item)) {
      return this.getPosterUrl(item.profile_path) ?? 'assets/person.png';
    }

    console.warn('Unknown item type:', item);
    return null;
  }

  // Type guards
  isSeries(item: any): item is Series {
    return this.hasProperty<Series>(item, 'first_air_date', 'string');
  }
  isMovie(item: any): item is Movie {
    return this.hasProperty<Movie>(item, 'release_date', 'string');
  }
  isStudio(item: any): item is Studio {
    return this.hasProperty<Studio>(item, 'logo_path', 'string') && this.hasProperty<Studio>(item, 'name', 'string');
  }
  isGenre(item: any): item is Genre {
    return (
      this.hasProperty<Genre>(item, 'id', 'number') &&
      this.hasProperty<Genre>(item, 'name', 'string') &&
      !('logo_path' in item) &&
      !('profile_path' in item)
    );
  }

  isPerson(item: any): item is Person {
    return this.hasProperty<Person>(item, 'profile_path', 'string');
  }

  // General utility to check property types
  private hasProperty<T>(obj: any, key: keyof T, type: string): boolean {
    return obj?.[key] !== undefined && typeof obj[key] === type;
  }

  getPosterUrl(path: string | null | undefined): string {
    return path ? `https://image.tmdb.org/t/p/w500${path}` : 'assets/poster.png';
  }

  getBackDrop(path: string | null | undefined): string | null {
    return path ? `https://image.tmdb.org/t/p/original${path}` : null;
  }

  getStudioLogoUrl(studio: Studio | undefined): string | null {
    return studio ? `https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/${studio.logo_path}` : null;
  }

  getTrailerUrl(series: Series | Movie | undefined): string | null {
    const videos = series?.videos?.results;
    return videos?.length ? `https://www.youtube.com/watch?v=${videos[0].key}` : null;
  }

  getSeriesDetailsById(seriesId: number): Observable<Series> {
    return this.http
      .get<Series>(`${this.baseUrl}/tv/${seriesId}`, {
        params: {
          api_key: this.apiKey,
          append_to_response: 'images,videos,keywords,recommendations,similar,episode_groups,credits,content_ratings',
        },
      })
      .pipe(
        tap(response => {
          console.log('Full series details:', response);
        })
      );
  }

  getMovieDetailsById(movieId: number): Observable<Movie> {
    return this.http
      .get<Movie>(`${this.baseUrl}/movie/${movieId}`, {
        params: {
          api_key: this.apiKey,
          append_to_response: 'images,videos,keywords,recommendations,similar,credits,releases',
        },
      })
      .pipe(
        tap(response => {
          console.log('Full series details:', response);
        })
      );
  }

  getSeriesDetails(seriesNames: string[]): Observable<Series[]> {
    const requests = seriesNames.map(name =>
      this.http
        .get<{ results: Series[] }>(`${this.baseUrl}/search/tv`, {
          params: {
            api_key: this.apiKey,
            query: name,
          },
        })
        .pipe(map(response => (response.results.length > 0 ? response.results[0] : null)))
    );

    return forkJoin(requests).pipe(
      map(seriesList => seriesList.filter(series => series !== null)) // Remove null entries
    );
  }

  getSeasonDetails(seriesId: number, seasonNumber: number): Observable<Season> {
    return this.http.get<Season>(`${this.baseUrl}/tv/${seriesId}/season/${seasonNumber}`, {
      params: { api_key: this.apiKey }
    });
  }

  searchMulti(query: string): Observable<any[]> {
    const url = `${this.baseUrl}/search/multi?api_key=${this.apiKey}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;
    return this.http.get<{ results: Series[] | Movie[] | Person[] }>(url).pipe(map(response => response.results));
  }
  // Add method to manually set region
  setRegion(region: string) {
    this.userRegion = region.toUpperCase();
  }

  // Add method to get current region
  getRegion(): string {
    return this.userRegion;
  }
}
