import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BackendService {
  private baseUrl = 'http://localhost:5000'; // Adjust the URL if different

  constructor(private http: HttpClient) {}

  getRecommendations(query: string) {
    return this.http.post<{ recommendations: string[] }>(`${this.baseUrl}/recommend`, { query });
  }

  search(query: string) {
    return this.http.post<{ results: string[] }>(`${this.baseUrl}/search`, { query });
  }
}