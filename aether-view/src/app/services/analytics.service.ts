import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { TmdbService } from './tmdb.service';

export interface AggregatedClick {
  itemId: number;
  itemType: string;
  clickCount: number;
}

export interface PopularContent {
  id: number;
  title?: string;
  name?: string;
  media_type: 'movie' | 'tv';
  poster_path?: string;
  release_date?: string;
  first_air_date?: string;
  clickCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly tmdbService = inject(TmdbService);
  private baseUrl = 'http://localhost:8080/api/analytics';

  getClickStatistics(type?: string, timeRange: string = 'week'): Observable<PopularContent[]> {
    const params: any = { timeRange };
    if (type && type !== 'all') {
      params.type = type;
    }

    return this.http.get<AggregatedClick[]>(`${this.baseUrl}/clicks`, { params }).pipe(
      switchMap(clicks => {
        if (!clicks.length) return of([]);

        const contentRequests = clicks.map(click => {
          if (click.itemType === 'movie') {
            return this.tmdbService.getMovieDetailsById(click.itemId).pipe(
              map(movie => ({
                ...movie,
                clickCount: click.clickCount,
                media_type: 'movie' as const
              }))
            );
          } else if (click.itemType === 'series') {
            return this.tmdbService.getSeriesDetailsById(click.itemId).pipe(
              map(series => ({
                ...series,
                clickCount: click.clickCount,
                media_type: 'tv' as const
              }))
            );
          }
          return of(null);
        });

        return forkJoin(contentRequests).pipe(
          map(results => results.filter(item => item !== null) as PopularContent[])
        );
      })
    );
  }
}
