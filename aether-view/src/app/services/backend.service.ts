import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, throwError, forkJoin } from 'rxjs';
import { map, switchMap, takeWhile, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BackendService {
  private backEndBaseUrl = environment.BACKEND_BASE_URL;

  constructor(private http: HttpClient) {}

  private pollJobStatus(requestType: string, jobId: string): Observable<any> {
    if (!jobId) {
      console.error(`Invalid ${requestType} job ID:`, jobId);
      return throwError(() => new Error(`Invalid ${requestType} job ID`));
    }

    return interval(2000).pipe(
      switchMap(() => this.http.get<{ 
        status: string; 
        error?: string; 
        result?: { 
          recommendations: any[],
          results: any[]
        } 
      }>(`${this.backEndBaseUrl}/status/${requestType}/${jobId}`)),
      map(response => {
        console.log(`${requestType} response:`, response); // Debug log
        if (response.status === 'error') {
          throw new Error(response.error || `${requestType} request failed`);
        }
        return response;
      }),
      takeWhile(
        response => response.status === 'pending' || response.status === 'processing', 
        true // Include the last value before completing
      )
    );
  }

  getRecommendations(query: string): Observable<any> {
    return this.http.post<{request_id: string}>(
      `${this.backEndBaseUrl}/recommend`, 
      { query }
    ).pipe(
      switchMap(response => {
        console.log('Received recommendation ID:', response.request_id);
        return this.pollJobStatus('recommend', response.request_id);
      }),
      map(response => ({
        recommendations: response.result?.recommendations || [],
        results: response.result?.results || []
      }))
    );
  }

  search(query: string): Observable<any> {
    return this.http.post<{request_id: string}>(
      `${this.backEndBaseUrl}/search`, 
      { query }
    ).pipe(
      switchMap(response => this.pollJobStatus('search', response.request_id)),
      map(response => ({
        recommendations: [],
        results: response.result?.results || []
      }))
    );
  }
}