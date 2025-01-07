import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';


@Injectable({ providedIn: 'root' })
export class BackendService {
  private backEndBaseUrl = environment.BACKEND_BASE_URL; // Adjust the URL if different

  constructor(private http: HttpClient) {}

  getRecommendations(query: string) {
    return this.http.post<{ recommendations: string[] }>(`${this.backEndBaseUrl}/recommend`, { query });
  }

  search(query: string) {
    return this.http.post<{ results: string[] }>(`${this.backEndBaseUrl}/search`, { query });
  }
}
