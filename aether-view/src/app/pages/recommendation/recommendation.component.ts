// recommendation.component.ts

import { Component, inject } from '@angular/core';
import { BackendService } from '../../services/backend.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Series } from '../../interfaces/series';
import { TmdbService } from '../../services/tmdb.service';
import { map } from 'rxjs';
import { forkJoin, Observable } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-recommendation',
  templateUrl: './recommendation.component.html',
  imports: [CommonModule, FormsModule],
})
export class RecommendationComponent {
  userQuery = '';
  recommendations: Series[] = [];

  backendService = inject(BackendService);
  tmdbService = inject(TmdbService);

  getRecommendations() {
    // First get recommendations
    this.backendService.getRecommendations(this.userQuery).subscribe(
      (response) => {
        const seriesNames = response.recommendations;
        this.fetchSeriesDetails(seriesNames, () => {
          // After first batch loaded, get search results
          console.log('LLM Recommendations:', this.recommendations);
          this.performSecondarySearch();
        });
      },
      (error) => {
        console.error('Error fetching recommendations:', error);
      }
    );
  }

  private performSecondarySearch() {
    this.backendService.search(this.userQuery).subscribe(
      (response) => {
        const newSeriesNames = response.results.filter((name) =>
          // Filter out series names that already exist in recommendations
          !this.recommendations.some((existing) => existing.name.toLowerCase() === name.toLowerCase())
        );

        if (newSeriesNames.length > 0) {
          this.fetchAdditionalSeriesDetails(newSeriesNames, () => {
            // After fetching additional series, fetch recommendations for each series
            console.log('LLM online Recommendations:', this.recommendations);
            this.fetchRecommendationsForSeries();
          });
        }
      },
      (error) => {
        console.error('Error fetching search results:', error);
      }
    );
  }

  fetchSeriesDetails(seriesNames: string[], callback?: () => void) {
    this.tmdbService.getSeriesDetails(seriesNames).subscribe(
      (seriesList) => {
        this.recommendations = seriesList;
        if (callback) callback();
      },
      (error) => {
        console.error('Error fetching series details:', error);
      }
    );
  }

  fetchAdditionalSeriesDetails(seriesNames: string[], callback?: () => void) {
    this.tmdbService.getSeriesDetails(seriesNames).subscribe(
      (seriesList) => {
        this.recommendations = [...this.recommendations, ...seriesList];
        if (callback) callback();
      },
      (error) => {
        console.error('Error fetching additional series details:', error);
      }
    );
  }

  fetchRecommendationsForSeries() {
    // Now pass the entire series object instead of just the ID
    const requests = this.recommendations.map(series =>
      this.tmdbService.getSeriesRecommendations(series)
    );

    forkJoin(requests).subscribe(
      (recommendedSeriesArrays) => {
        // Flatten the array of arrays and filter out empty arrays
        const newRecommendations = recommendedSeriesArrays
          .flat()
          .filter(series => series !== null);

        // Filter out duplicates
        const uniqueRecommendations = newRecommendations.filter(
          newSeries => !this.recommendations.some(
            existing => existing.name.toLowerCase() === newSeries.name.toLowerCase()
          )
        );
        console.log('Unique recommendations:', uniqueRecommendations);
        // Add unique recommendations to the existing list
        this.recommendations = [...this.recommendations, ...uniqueRecommendations];
        console.log('Tmbd Recommendations :', this.recommendations);
      },
      (error) => {
        console.error('Error fetching recommendations for series:', error);
      }
    );
  }

  getPosterUrl(posterPath: string | null | undefined): string {
    return posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : 'assets/placeholder-image.jpg';
  }
}