import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, throwError, of } from 'rxjs';
import { map, switchMap, takeWhile, catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class BackendService {
  private localBackendUrl = 'https://api.aether-view.com';
  private remoteBackendUrl = 'https://aether-views-api-247441061608.europe-north1.run.app';
  private currentBackendUrl: string;

  private cleanTitle(title: string): string {
    return title.replace(/: Season \d+|: Episode \d+|: Chapter \d+|: Part \d+| - The Series| - Season \d+|: Act \d+|: City of Angels|: A Jedi's Return|: The Complete Series|: Series Finale/gi, '');
  }

  private filterInvalidTitles(items: any[]): any[] {
    return items.map(item => ({
      ...item,
      title: this.cleanTitle(item.title)
    }));
  }
  
  constructor(private http: HttpClient) {
    this.currentBackendUrl = this.localBackendUrl;
    this.checkLocalServer();
  }

  private checkLocalServer(): void {
    this.http
      .get(`${this.localBackendUrl}/health`)
      .pipe(
        catchError(() => {
          this.currentBackendUrl = this.remoteBackendUrl;
          return of(null);
        })
      )
      .subscribe();
  }

  private pollJobStatus(requestType: string, jobId: string): Observable<any> {
    if (!jobId) {
      console.error(`Invalid ${requestType} job ID:`, jobId);
      return throwError(() => new Error(`Invalid ${requestType} job ID`));
    }

    return interval(2000).pipe(
      switchMap(() =>
        this.http.get<{
          status: string;
          error?: string;
          result?: {
            recommendations: any[];
            results: any[];
          };
        }>(`${this.currentBackendUrl}/status/${requestType}/${jobId}`)
      ),
      map(response => {
        if (response.status === 'error') {
          throw new Error(response.error || `${requestType} request failed`);
        }
        return response;
      }),
      takeWhile(
        response => response.status === 'pending' || response.status === 'processing',
        true
      )
    );
  }

  private handleRequest(endpoint: string, query: string): Observable<any> {
    return this.http.post(`${this.currentBackendUrl}/${endpoint}`, { query }).pipe(
      catchError(error => {
        if (this.currentBackendUrl === this.localBackendUrl) {
          this.currentBackendUrl = this.remoteBackendUrl;
          return this.http.post(`${this.remoteBackendUrl}/${endpoint}`, { query });
        }
        return throwError(() => error);
      })
    );
  }

  getRecommendations(query: string): Observable<any> {
    return this.handleRequest('recommend', query).pipe(
      switchMap(response => this.pollJobStatus('recommend', response.request_id)),
      map(response => {
        const recommendations = this.filterInvalidTitles(response.result?.recommendations || []);
        const results = this.filterInvalidTitles(response.result?.results || []);
        
        if (!recommendations.length && !results.length) {
          return { recommendations: [], results: [] };
        }
        return { recommendations, results };
      })
    );
  }
  search(query: string): Observable<any> {
    return this.handleRequest('search', query).pipe(
      switchMap(response => this.pollJobStatus('search', response.request_id)),
      map(response => {
        const results = this.filterInvalidTitles(response.result?.results || []);
        
        if (!results.length) {
          return { recommendations: [], results: [] };
        }
        return { recommendations: [], results };
      })
    );
  }
}


