import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { RecommendationResponse, SearchResponse } from '../interfaces/common-interfaces';


@Injectable({ providedIn: 'root' })
export class BackendService {
  private backEndBaseUrl = environment.BACKEND_BASE_URL; // Adjust the URL if different

  constructor(private http: HttpClient) {}

  getRecommendations(query: string) {
    return this.http.post<RecommendationResponse>(`${this.backEndBaseUrl}/recommend`, { query });
  }

  search(query: string) {
    return this.http.post<SearchResponse>(`${this.backEndBaseUrl}/search`, { query });
  }
}
