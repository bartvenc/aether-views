import { Injectable, inject, Signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Series } from '../interfaces/series';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { forkJoin, Observable, switchMap, tap } from 'rxjs';
import { Movie } from '../interfaces/movies';
import { Genre, Person } from '../interfaces/common-interfaces';
import { Studio } from '../../../public/assets/studios';

@Injectable({ providedIn: 'root' })
export class TmdbService {
  private readonly apiKey = '4692df374a198e0172ac98003b5cdab3';
  private readonly baseUrl = 'https://api.themoviedb.org/3';


  http: HttpClient = inject(HttpClient);

  // Convert the HTTP Observable directly to a Signal
  readonly popularSeries: Signal<Series[]> = toSignal(
    this.http.get<{ results: Series[] }>(`${this.baseUrl}/tv/popular?api_key=${this.apiKey}`).pipe(
      map(response => response.results)
    ),
    { initialValue: [] }
  );


  // Convert the HTTP Observable directly to a Signal
  readonly trendingSeries: Signal<Series[]> = toSignal(
    this.http.get<{ results: Series[] }>(`${this.baseUrl}/trending/tv/week?api_key=${this.apiKey}`).pipe(
      map(response => response.results)
    ),
    { initialValue: [] }
  );

  readonly trendingMovies: Signal<Movie[]> = toSignal(
    this.http.get<{ results: Movie[] }>(`${this.baseUrl}/trending/movie/week?api_key=${this.apiKey}`).pipe(
      map(response => response.results)
    ),
    { initialValue: [] }
  );


  readonly upcomingMovies: Signal<Movie[]> = toSignal(
    this.http.get<{ results: Movie[] }>(`${this.baseUrl}/movie/upcoming?api_key=${this.apiKey}`).pipe(
      map(response => response.results)
    ),
    { initialValue: [] }
  );


  readonly movieGenres: Signal<Genre[]> = toSignal(
    this.http.get<{ genres: Genre[] }>(`${this.baseUrl}/genre/movie/list?api_key=${this.apiKey}`).pipe(
      map(response => response.genres)
    ),
    { initialValue: [] }
  );

  fetchMoviesByPopularity(page: number = 1) {
    const url = `${this.baseUrl}/discover/movie?api_key=${this.apiKey}&sort_by=popularity.desc&page=${page}`;
    return this.http.get<any>(url);
  }

  fetchMovies(filters: any, page: number = 1) {
    console.log(filters);
    const params: any = {
      api_key: this.apiKey,
      language: 'en-US',
      page: page.toString(),
      include_adult: false,
      include_video: false,
    };
  
    switch (filters.category) {
      case 'Popular':
        params.sort_by = 'popularity.desc';
        if (filters.year > 0) params.primary_release_year = filters.year; // Append release year
        break;
  
      case 'New':
        params.sort_by = 'release_date.desc';
        console.log('Year:', filters.year);
        if (filters.year > 0) params.primary_release_year = filters.year;
        break;
  
      case 'Top Rated':
        params.sort_by = 'vote_average.desc';
        params['vote_count.gte'] = '200';
        params.without_genres = '99,10755'; // Exclude genres
        if (filters.year > 0) params.primary_release_year = filters.year; // Append release year
        break;
  
      case 'Now Playing':
        params.sort_by = 'popularity.desc';
        params.with_release_type = '2|3';
        const today = new Date();
        params['release_date.gte'] = `${today.getFullYear()}-${today.getMonth() + 1}-01`;
        params['release_date.lte'] = `${today.getFullYear()}-${today.getMonth() + 1}-28`; // Approx end of month
        break;
  
      default:
        params.sort_by = 'popularity.desc';
    }
  
    // Append additional filters if set
    if (filters.genres && filters.genres.length != 0) {
      params.with_genres = filters.genres.join(',');
    }
    if (filters.studioOrNetwork && filters.studioOrNetwork != 0) {
      params.with_companies = filters.studioOrNetwork;
    }
    if (filters.keywords && filters.keywords.length != 0) {
      params.with_keywords = filters.keywords;
    }
  
    const queryString = new URLSearchParams(params).toString();
    return this.http.get<any>(`${this.baseUrl}/discover/movie?${queryString}`);
  }
  
  
  searchKeyword(query: string) {
    const url = `${this.baseUrl}/search/keyword?api_key=${this.apiKey}&query=${encodeURIComponent(query)}&language=en-US`;
    return this.http.get<{ results: { id: number; name: string }[] }>(url);
  }

  getImageUrl(item: Series | Movie | Studio | Genre | Person | null | undefined): string | null {
    if (!item) return null;

    if (this.isSeries(item)) {
      return this.getPosterUrl(item.poster_path);
    }

    if (this.isMovie(item)) {
      return this.getPosterUrl(item.poster_path);
    }

    if (this.isStudio(item)) {
      return this.getStudioLogoUrl(item);
    }

    if (this.isGenre(item)) {
      return this.getPosterUrl(item.posterUrl);
    }

    if (this.isPerson(item)) {
      return this.getPosterUrl(item.profile_path);
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
    return this.hasProperty<Genre>(item, 'id', 'number') 
    && this.hasProperty<Genre>(item, 'name', 'string') 
    && !('logo_path' in item)
    && !('profile_path' in item);
  }

  isPerson(item: any): item is Person {
    return this.hasProperty<Person>(item, 'profile_path', 'string');
  }

  // General utility to check property types
  private hasProperty<T>(obj: any, key: keyof T, type: string): boolean {
    return obj?.[key] !== undefined && typeof obj[key] === type;
  }

  getPosterUrl(path: string | null | undefined): string {
    return path ? `https://image.tmdb.org/t/p/w500${path}` : '';
  }

  getBackDrop(path: string | null | undefined): string | null {
    return path ? `https://image.tmdb.org/t/p/original${path}` : null;
  }

  getStudioLogoUrl(studio: Studio | undefined): string | null {
    return studio ? `https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/${studio.logo_path}` : null;
  }

  getTrailerUrl(series: Series  | Movie | undefined): string | null {
    const videos = series?.videos?.results;
    return videos?.length ? `https://www.youtube.com/watch?v=${videos[0].key}` : null;
  }

  getSeriesDetailsById(seriesId: number): Observable<Series> {
    return this.http.get<Series>(`${this.baseUrl}/tv/${seriesId}`, {
      params: {
        api_key: this.apiKey,
        append_to_response: 'images,videos,keywords,recommendations,similar,episode_groups,credits,content_ratings'
      }
    }).pipe(
      tap(response => {
        console.log('Full series details:', response);
      })
    );
  }

  getMovieDetailsById(movieId: number): Observable<Movie> {
    return this.http.get<Movie>(`${this.baseUrl}/movie/${movieId}`, {
      params: {
        api_key: this.apiKey,
        append_to_response: 'images,videos,keywords,recommendations,similar,credits,releases'
      }
    }).pipe(
      tap(response => {
        console.log('Full series details:', response);
      })
    );
  }

  getSeriesDetails(seriesNames: string[]): Observable<Series[]> {
    const requests = seriesNames.map(name =>
      this.http.get<{ results: Series[] }>(`${this.baseUrl}/search/tv`, {
        params: {
          api_key: this.apiKey,
          query: name
        }
      }).pipe(
        map(response => response.results.length > 0 ? response.results[0] : null)
      )
    );

    return forkJoin(requests).pipe(
      map(seriesList => seriesList.filter(series => series !== null)) // Remove null entries
    );
  }

  getSeriesRecommendations(series: Series): Observable<Series[]> {
    console.log('Getting recommendations for:', series.name, 'ID:', series.id);

    return this.http.get<Series>(`${this.baseUrl}/tv/${series.id}`, {
      params: { api_key: this.apiKey }
    }).pipe(
      tap(originalSeries => {
        console.log('Original series genres:', originalSeries.genres);
      }),
      switchMap(originalSeries =>
        this.http.get<{ results: Series[] }>(`${this.baseUrl}/tv/${series.id}/recommendations`, {
          params: { api_key: this.apiKey }
        }).pipe(
          tap(response => {
            console.log('Found', response.results.length, 'recommendations for', series.name);
          }),
          map(response => {
            const matchingRecs = response.results.filter(rec => {
              const hasMatchingGenre = rec.genre_ids?.some(genreId =>
                originalSeries.genres?.some(genre => genre.id === genreId)
              );
              console.log(
                'Checking recommendation:', rec.name,
                'genres:', rec.genre_ids,
                'matches:', hasMatchingGenre
              );
              return hasMatchingGenre;
            });
            console.log('Matching recommendations:', matchingRecs.map(r => r.name));
            return matchingRecs;
          }),
          map(matchingRecs => {
            const selected = matchingRecs.length > 0 ? [matchingRecs[0]] : [];
            console.log('Selected recommendation:', selected.map(s => s.name));
            return selected;
          })
        )
      )
    );
  }


}


