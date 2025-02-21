import { Injectable, inject, Signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { forkJoin, Observable, tap, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Series, Season } from '@interfaces/series';
import { Movie } from '@interfaces/movies';
import { Genre, Person } from '@interfaces/common-interfaces';
import { Studio } from '@app/data/constants/studios';
import { ContentItem } from '@pages/filter-page/filter-page.component';
import { Network } from '@app/data/constants/networks';

interface TmdbConfig {
  apiKey: string;
  baseUrl: string;
  region: {
    storageKey: string;
    timestampKey: string;
    cacheDuration: number;
  };
  content: {
    seenStorageKey: string;
  };
}

@Injectable({ providedIn: 'root' })
export class TmdbService {
  private readonly config: TmdbConfig = {
    apiKey: '4692df374a198e0172ac98003b5cdab3',
    baseUrl: 'https://api.themoviedb.org/3',
    region: {
      storageKey: 'user_region',
      timestampKey: 'region_timestamp',
      cacheDuration: 24 * 60 * 60 * 1000,
    },
    content: {
      seenStorageKey: 'seen_content',
    },
  };

  private readonly http = inject(HttpClient);
  private userRegion = 'US';
  private seenContent = new Set<string>();
  private cache = new Map<string, { data: any; timestamp: number }>();

  private popularSeriesSignal: Signal<Series[]> | null = null;
  private trendingSeriesSignal: Signal<Series[]> | null = null;
  private trendingMoviesSignal: Signal<Movie[]> | null = null;
  private upcomingMoviesSignal: Signal<Movie[]> | null = null;
  private movieGenresSignal: Signal<Genre[]> | null = null;

  constructor() {
    this.loadSeenContent();
  }

  // REGION MANAGEMENT
  // ----------------
  async initializeRegion(): Promise<void> {
    try {
      if (await this.loadCachedRegion()) return;
      await this.detectRegion();
    } catch (error) {
      console.warn('Could not detect region, using default:', this.userRegion);
    }
  }

  private async loadCachedRegion(): Promise<boolean> {
    const cachedRegion = localStorage.getItem(this.config.region.storageKey);
    const timestamp = localStorage.getItem(this.config.region.timestampKey);

    if (cachedRegion && timestamp) {
      const age = Date.now() - Number(timestamp);
      if (age < this.config.region.cacheDuration) {
        this.userRegion = cachedRegion;
        return true;
      }
    }
    return false;
  }

  private async detectRegion(): Promise<void> {
    const browserLang = navigator.language;
    if (browserLang) {
      const region = browserLang.split('-')[1] || browserLang.toUpperCase();
      this.updateRegion(region);
    }

    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    if (data.country) {
      this.updateRegion(data.country);
    }
  }

  private updateRegion(region: string): void {
    this.userRegion = region;
    localStorage.setItem(this.config.region.storageKey, region);
    localStorage.setItem(this.config.region.timestampKey, Date.now().toString());
  }

  // IMAGE HANDLING
  // -------------
  private getOptimizedImageSize(type: 'poster' | 'profile' | 'logo' | 'backdrop'): string {
    const isMobile = window.innerWidth < 768;
    switch (type) {
      case 'poster':
        return isMobile ? 'w92' : 'w154';
      case 'profile':
        return isMobile ? 'w185' : 'w300';
      case 'logo':
        return 'w300'; // Logos need clarity, keep size
      case 'backdrop':
        return isMobile ? 'w780' : 'w1280';
      default:
        return 'original';
    }
  }

  getImageUrl(item: Series | Movie | Studio | Genre | Person | null | ContentItem | undefined, isPriority = false): string {
    if (!item) return 'assets/poster.jpg';

    let path: string | undefined | null = null;
    let type: 'poster' | 'profile' | 'logo' | 'backdrop' = 'poster';
    let fallback = 'assets/poster.jpg';

    if (this.isSeries(item) || this.isMovie(item)) {
      path = item.poster_path;
      fallback = 'assets/poster.png';
    } else if (this.isStudio(item)) {
      path = `_filter(duotone,ffffff,bababa)/${item.logo_path}`;
      type = 'logo';
      fallback = 'assets/studio.png';
    } else if (this.isGenre(item)) {
      path = item.posterUrl;
      type = 'backdrop';
      fallback = 'assets/genre.png';
    } else if (this.isPerson(item)) {
      path = item.profile_path;
      type = 'profile';
      fallback = 'assets/person.png';
    }

    if (!path) return fallback;

    const size = this.getOptimizedImageSize(type);
    const format = type === 'logo' ? '' : '?format=webp'; // Keep logos in original format for transparency

    // Add loading priority hints
    const priority = isPriority ? '#priority=true' : '';

    return `https://image.tmdb.org/t/p/${size}${path}${format}${priority}`;
  }

  getLargeImageUrl(path: string | null, type: 'backdrop' | 'poster' = 'backdrop'): string {
    if (!path) return 'assets/poster.jpg';
    const size = type === 'backdrop' ? 'w1280' : 'w780';
    return `https://image.tmdb.org/t/p/${size}${path}?format=webp`;
  }

  // API REQUESTS
  // -----------
  private createHttpParams(params: Record<string, any>): HttpParams {
    let httpParams = new HttpParams().set('api_key', this.config.apiKey);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return httpParams;
  }

  private fetchWithCache<T>(url: string, params: Record<string, any>, cacheDuration = 5 * 60 * 1000): Observable<T> {
    const cacheKey = `${url}?${new URLSearchParams(params).toString()}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      return of(cached.data);
    }

    return this.http.get<T>(url, { params: this.createHttpParams(params) }).pipe(
      tap(data => {
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
      }),
      catchError(error => {
        console.error(`Error fetching ${url}:`, error);
        throw error;
      })
    );
  }

  // CONTENT FETCHING
  // ---------------
  fetchContent(filters: any, page = 1, type: 'movie' | 'tv' = 'movie'): Observable<any> {
    const params = this.buildContentParams(filters, page, type);
    return this.fetchWithCache(`${this.config.baseUrl}/discover/${type}`, params);
  }

  private buildContentParams(filters: any, page: number, type: 'movie' | 'tv'): Record<string, any> {
    const params: Record<string, any> = {
      language: 'en-US',
      page,
      include_adult: false,
      watch_region: this.userRegion,
      with_origin_country: filters.country,
    };

    // Add category-specific parameters
    this.addCategoryParams(params, filters, type);

    // Add additional filters
    this.addAdditionalFilters(params, filters, type);

    return params;
  }

  private addCategoryParams(params: Record<string, any>, filters: any, type: 'movie' | 'tv'): void {
    switch (filters.category) {
      case 'Popular':
        params['sort_by'] = 'popularity.desc';
        if (type === 'tv') {
          params['include_video'] = false; // TV-specific params
        }
        if (filters.year > 0) {
          if (type === 'movie') {
            params['primary_release_year'] = filters.year;
          }
          if (type === 'tv') {
            params['first_air_date_year'] = filters.year;
          }
          // No direct year filter for TV popular category
        }
        break;

      case 'New':
        params['sort_by'] = type === 'movie' ? 'release_date.desc' : 'first_air_date.desc';
        if (filters.year > 0) {
          params['primary_release_year'] = filters.year; // Movies
          params['first_air_date_year'] = filters.year; // TV
        }
        break;

      case 'Top Rated':
        params['sort_by'] = 'vote_average.desc';
        params['vote_count.gte'] = '200';
        params['without_genres'] = '99,10755'; // Exclude genres (optional)
        if (filters.year > 0) {
          if (type === 'movie') {
            params['primary_release_year'] = filters.year;
          } else {
            params['first_air_date_year'] = filters.year;
          }
        }
        break;

      case 'Now Playing':
        params['sort_by'] = 'popularity.desc';
        const today = new Date();
        const minDate = `${today.getFullYear()}-${today.getMonth() + 1}-01`;
        const maxDate = `${today.getFullYear()}-${today.getMonth() + 1}-28`;

        if (type === 'movie') {
          params['with_release_type'] = '2|3';
          params['release_date.gte'] = minDate;
          params['release_date.lte'] = maxDate;
        } else {
          params['air_date.gte'] = minDate;
          params['air_date.lte'] = maxDate;
        }
        break;

      default:
        params['sort_by'] = 'popularity.desc';
    }
  }

  private addAdditionalFilters(params: Record<string, any>, filters: any, type: 'movie' | 'tv'): void {
    if (filters.genres && filters.genres.length !== 0) {
      params['with_genres'] = filters.genres.join(',');
    }
    if (filters.studioOrNetwork && filters.studioOrNetwork !== 0) {
      if (type === 'movie') {
        params['with_companies'] = filters.studioOrNetwork;
      } else if (type === 'tv') {
        params['with_networks'] = filters.studioOrNetwork;
      }
    }
    if (filters.keywords && filters.keywords.length !== 0) {
      params['with_keywords'] = filters.keywords;
    }
    if (filters.person && filters.person !== 0) {
      params['with_cast'] = filters.person;
    }
  }

  getPersonDetails(personId: number): Observable<Person> {
    const url = `${this.config.baseUrl}/person/${personId}?append_to_response=images&language=en-US&api_key=${this.config.apiKey}`;
    return this.http.get<Person>(url);
  }

  getPersonCombinedCredits(personId: number): Observable<(Movie | Series)[]> {
    const url = `${this.config.baseUrl}/person/${personId}/combined_credits?api_key=${this.config.apiKey}`;
    return this.http.get<{ cast: (Movie | Series)[] }>(url).pipe(map(response => response.cast));
  }

  searchKeyword(query: string) {
    const url = `${this.config.baseUrl}/search/keyword?api_key=${this.config.apiKey}&query=${encodeURIComponent(query)}&language=en-US`;
    return this.http.get<{ results: { id: number; name: string }[] }>(url);
  }

  getPosterUrl(path: string | null | undefined, size: 'w200' | 'w300' | 'w500' = 'w500'): string {
    if (!path) return 'assets/poster.png';
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }

  getBackDrop(path: string | null | undefined): string | null {
    return path ? `https://image.tmdb.org/t/p/original${path}` : null;
  }

  getStudioLogoUrl(studio: Studio | undefined): string | null {
    return studio ? `https://image.tmdb.org/t/p/w300_filter(duotone,ffffff,bababa)/${studio.logo_path}` : null;
  }

  getTrailerUrl(series: Series | Movie | undefined): string | null {
    const videos = series?.videos?.results;
    return videos?.length ? `https://www.youtube.com/watch?v=${videos[0].key}` : null;
  }

  getSeriesDetailsById(seriesId: number): Observable<Series> {
    return this.http
      .get<Series>(`${this.config.baseUrl}/tv/${seriesId}`, {
        params: {
          api_key: this.config.apiKey,
          append_to_response: 'images,videos,keywords,recommendations,similar,episode_groups,credits,content_ratings',
        },
      })
      .pipe(
        map(response => ({
          ...response,
          recommendations: response.recommendations
            ? {
                ...response.recommendations,
                results: response.recommendations.results.filter(item => item.media_type === 'tv').map(({ media_type, ...rest }) => rest as Series),
              }
            : undefined,
        }))
      );
  }

  getMovieDetailsById(movieId: number): Observable<Movie> {
    return this.http
      .get<Movie>(`${this.config.baseUrl}/movie/${movieId}`, {
        params: {
          api_key: this.config.apiKey,
          append_to_response: 'images,videos,keywords,recommendations,similar,credits,releases',
        },
      })
      .pipe(
        map(response => ({
          ...response,
          recommendations: response.recommendations
            ? {
                ...response.recommendations,
                results: response.recommendations.results.map(item => {
                  const { media_type, ...rest } = item;
                  return rest as Movie;
                }),
              }
            : undefined,
        }))
      );
  }

  getSeriesDetails(seriesNames: string[]): Observable<Series[]> {
    const requests = seriesNames.map(name =>
      this.http
        .get<{ results: Series[] }>(`${this.config.baseUrl}/search/tv`, {
          params: {
            api_key: this.config.apiKey,
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
    return this.http.get<Season>(`${this.config.baseUrl}/tv/${seriesId}/season/${seasonNumber}`, {
      params: { api_key: this.config.apiKey },
    });
  }

  searchMulti(query: string): Observable<any[]> {
    const url = `${this.config.baseUrl}/search/multi?api_key=${this.config.apiKey}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;
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

  // TYPE GUARDS
  // ----------
  isSeries(item: any): item is Series {
    return this.hasProperty<Series>(item, 'first_air_date', 'string');
  }

  isMovie(item: any): item is Movie {
    return this.hasProperty<Movie>(item, 'release_date', 'string');
  }

  isStudio(item: any): item is Studio {
    return this.hasProperty<Studio>(item, 'logo_path', 'string') && this.hasProperty<Studio>(item, 'name', 'string');
  }
  isNetwork(item: any): item is Network {
    return this.hasProperty<Network>(item, 'logo_path', 'string') && this.hasProperty<Network>(item, 'name', 'string');
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

  // CONTENT TRACKING
  // ---------------
  private loadSeenContent(): void {
    const saved = localStorage.getItem(this.config.content.seenStorageKey);
    if (saved) {
      this.seenContent = new Set(JSON.parse(saved));
    }
  }

  markAsSeen(type: 'movie' | 'tv', id: number): void {
    const key = `${type}_${id}`;
    this.seenContent.add(key);
    localStorage.setItem(this.config.content.seenStorageKey, JSON.stringify([...this.seenContent]));
  }

  isContentSeen(type: 'movie' | 'tv', id: number): boolean {
    return this.seenContent.has(`${type}_${id}`);
  }

  // Convert the HTTP Observable directly to a Signal/
  get popularSeries(): Signal<Series[]> {
    if (!this.popularSeriesSignal) {
      this.popularSeriesSignal = toSignal(
        this.http
          .get<{ results: Series[] }>(`${this.config.baseUrl}/tv/popular?api_key=${this.config.apiKey}`)
          .pipe(map(response => response.results)),
        { initialValue: [] }
      );
    }
    return this.popularSeriesSignal;
  }

  // Convert the HTTP Observable directly to a Signal
  get trendingSeries(): Signal<Series[]> {
    if (!this.trendingSeriesSignal) {
      this.trendingSeriesSignal = toSignal(
        this.http.get<{ results: Series[] }>(`${this.config.baseUrl}/trending/tv/week?api_key=${this.config.apiKey}`).pipe(
          map(response => response.results),
          map(series => series.map(({ media_type, ...seriesWithoutMediaType }) => seriesWithoutMediaType))
        ),
        { initialValue: [] }
      );
    }
    return this.trendingSeriesSignal;
  }

  get trendingMovies(): Signal<Movie[]> {
    if (!this.trendingMoviesSignal) {
      this.trendingMoviesSignal = toSignal(
        this.http.get<{ results: Movie[] }>(`${this.config.baseUrl}/trending/movie/week?api_key=${this.config.apiKey}`).pipe(
          map(response => response.results),
          map(movies => movies.map(({ media_type, ...movieWithoutMediaType }) => movieWithoutMediaType))
        ),
        { initialValue: [] }
      );
    }
    return this.trendingMoviesSignal;
  }

  get upcomingMovies(): Signal<Movie[]> {
    if (!this.upcomingMoviesSignal) {
      this.upcomingMoviesSignal = toSignal(
        this.http
          .get<{ results: Movie[] }>(`${this.config.baseUrl}/movie/upcoming?api_key=${this.config.apiKey}`)
          .pipe(map(response => response.results)),
        { initialValue: [] }
      );
    }
    return this.upcomingMoviesSignal;
  }

  get movieGenres(): Signal<Genre[]> {
    if (!this.movieGenresSignal) {
      this.movieGenresSignal = toSignal(
        this.http
          .get<{ genres: Genre[] }>(`${this.config.baseUrl}/genre/movie/list?api_key=${this.config.apiKey}`)
          .pipe(map(response => response.genres)),
        { initialValue: [] }
      );
    }
    return this.movieGenresSignal;
  }

  fetchMoviesByPopularity(page = 1) {
    const url = `${this.config.baseUrl}/discover/movie?api_key=${this.config.apiKey}&sort_by=popularity.desc&page=${page}`;
    return this.http.get<any>(url);
  }
}
