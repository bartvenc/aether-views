import { Injectable, inject, Signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Series } from '../interfaces/series';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { forkJoin, Observable, switchMap, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TmdbService {
  private readonly apiKey = '4692df374a198e0172ac98003b5cdab3';
  private readonly baseUrl = 'https://api.themoviedb.org/3';


  http: HttpClient = inject(HttpClient);

  // Convert the HTTP Observable directly to a Signal
  readonly popularSeries: Signal<Series[]> = toSignal(
    this.http.get<{ results: Series[] }>(`${this.baseUrl}/trending/tv/week?api_key=${this.apiKey}`).pipe(
      map(response => response.results)
    ),
    { initialValue: [] }
  );

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

  getPosterUrl(path: string | null | undefined): string {
    return path ? `https://image.tmdb.org/t/p/w500${path}` : '';
  }

  getBackDrop(path: string | null | undefined): string | null {
    return path ? `https://image.tmdb.org/t/p/original${path}` : null;
  }

  getTrailerUrl(series: Series | undefined): string | null {
    const videos = series?.videos?.results;
    return videos?.length ? `https://www.youtube.com/watch?v=${videos[0].key}` : null;
  }
}
  

