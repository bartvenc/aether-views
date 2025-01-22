import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, throwError, forkJoin } from 'rxjs';
import { map, switchMap, takeWhile, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BackendService {
  private localBaseUrl = 'api.aether-view.com'; // Cloudflare tunnel endpoint
  private cloudBaseUrl = 'https://aether-backend-247441061608.europe-north1.run.app';
  private retryDelay = 2000;

  constructor(private http: HttpClient) {}

  private tryEndpoint(endpoint: string, data: any, serverUrl: string): Observable<any> {
    return this.http.post<{request_id: string, source?: string}>(
      `${serverUrl}${endpoint}`, 
      data
    ).pipe(
      catchError(error => {
        if (error.status === 503 || error.status === 429) {
          // Service busy or rate limited - try cloud
          return throwError(() => ({ useCloud: true, error }));
        }
        return throwError(() => error);
      })
    );
  }

  private pollJobStatus(requestType: string, jobId: string, serverUrl: string): Observable<any> {
    return interval(2000).pipe(
      switchMap(() => this.http.get<any>(`${serverUrl}/status/${requestType}/${jobId}`).pipe(
        catchError(error => {
          if (error.status === 0) { // Connection lost
            return throwError(() => ({ useCloud: true, error }));
          }
          return throwError(() => error);
        })
      )),
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

  getRecommendations(query: string): Observable<any> {
    // Try local first
    return this.tryEndpoint('/recommend', { query }, this.localBaseUrl).pipe(
      catchError(error => {
        if (error.useCloud) {
          console.log('Local server busy, trying cloud...');
          return this.tryEndpoint('/recommend', { query }, this.cloudBaseUrl);
        }
        throw error;
      }),
      switchMap(response => {
        const serverUrl = response.source === 'cloud' ? this.cloudBaseUrl : this.localBaseUrl;
        return this.pollJobStatus('recommend', response.request_id, serverUrl).pipe(
          catchError(error => {
            if (error.useCloud) {
              console.log('Local connection lost, failing over to cloud...');
              return this.tryEndpoint('/recommend', { query }, this.cloudBaseUrl).pipe(
                switchMap(cloudResponse => 
                  this.pollJobStatus('recommend', cloudResponse.request_id, this.cloudBaseUrl)
                )
              );
            }
            throw error;
          })
        );
      }),
      map(response => ({
        recommendations: response.result?.recommendations || [],
        results: response.result?.results || []
      }))
    );
  }

  search(query: string): Observable<any> {
    // Similar pattern for search endpoint
    return this.tryEndpoint('/search', { query }, this.localBaseUrl).pipe(
      catchError(error => {
        if (error.useCloud) {
          console.log('Local server busy, trying cloud...');
          return this.tryEndpoint('/search', { query }, this.cloudBaseUrl);
        }
        throw error;
      }),
      switchMap(response => {
        const serverUrl = response.source === 'cloud' ? this.cloudBaseUrl : this.localBaseUrl;
        return this.pollJobStatus('search', response.request_id, serverUrl).pipe(
          catchError(error => {
            if (error.useCloud) {
              return this.tryEndpoint('/search', { query }, this.cloudBaseUrl).pipe(
                switchMap(cloudResponse => 
                  this.pollJobStatus('search', cloudResponse.request_id, this.cloudBaseUrl)
                )
              );
            }
            throw error;
          })
        );
      }),
      map(response => ({
        recommendations: [],
        results: response.result?.results || []
      }))
    );
  }
}
