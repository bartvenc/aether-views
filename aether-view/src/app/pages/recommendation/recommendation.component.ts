// recommendation.component.ts

import { Component, inject } from '@angular/core';
import { BackendService } from '../../services/backend.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Series } from '../../interfaces/series';
import { TmdbService } from '../../services/tmdb.service';
import { forkJoin, map, Observable } from 'rxjs';
import { Movie } from '../../interfaces/movies';

@Component({
  standalone: true,
  selector: 'app-recommendation',
  templateUrl: './recommendation.component.html',
  imports: [CommonModule, FormsModule],
})
export class RecommendationComponent {
  userQuery = '';
  recommendations: any[]= [];
  isLoading: boolean = false;
  isSecondStage: boolean = false;
  currentQuote: string = '';
  secondStageMessage: string = '';

  // List of funny loading quotes
  quotes: string[] = [
    "Mining the offline AI vault for hidden gems...",
    "Teaching the AI new tricks with old data...",
    "Making the offline LLM do its magic...",
    "Dusting off the AI archives...",
    "Unleashing the offline neural wizardry...",
    "Feeding data into the AI hamster wheel...",
    "Cranking the gears of the local AI engine...",
    "Digging through the treasure chest of data...",
    "Polishing old algorithms for new insights...",
    "Revisiting the AI's offline brain for brilliance...",
    "Uncovering hidden gems from the offline AI vault...",
    "Whispering sweet nothings to the neural net...",
    "Unlocking the mysteries of offline intelligence...",
  ];

  secondStageMessages: string[] = [
    "Exploring the vast AI cosmos for online treasures...",
    "Tuning into the infinite wisdom of the web...",
    "Sifting through digital galaxies for recommendations...",
    "Hunting for gold in the AI cloud...",
    "Surfing the web with neural precision...",
    "Letting the AI network do its thing...",
    "Cross-referencing data from the web multiverse...",
    "Casting a wide AI net in the online ocean...",
    "Scanning the digital horizons for gems...",
    "Traversing the online data jungle...",
    "Connecting to the intergalactic AI library...",
    "Synchronizing with the neural cloud...",
    "Venturing into the vast expanse of online knowledge...",
  ];

  backendService = inject(BackendService);
  tmdbService = inject(TmdbService);

  
  private searchSingleTitle(title: string): Observable<Series | Movie | null> {
    return this.tmdbService.searchMulti(title).pipe(
      map(results => results.find(item => 
        item.media_type === 'movie' || item.media_type === 'tv'
      ) || null)
    );
  }

  getRecommendations() {
    this.isLoading = true;
    this.isSecondStage = false;
    this.rotateQuotes();
    this.recommendations = [];

    this.backendService.getRecommendations(this.userQuery).subscribe({
      next: response => {
        const searches = response.recommendations.map(title => 
          this.searchSingleTitle(title)
        );

        forkJoin(searches).subscribe({
          next: results => {
            this.recommendations = results.filter((result): result is (Series | Movie) => 
              result !== null
            );
            this.performSecondarySearch();
          },
          error: error => {
            console.error('Error in initial searches:', error);
            this.isLoading = false;
          }
        });
      },
      error: error => {
        console.error('Error fetching recommendations:', error);
        this.isLoading = false;
      }
    });
  }

  private performSecondarySearch() {
    this.isSecondStage = true;

    this.backendService.search(this.userQuery).subscribe({
      next: response => {
        const searches = response.results.map(title =>
          this.searchSingleTitle(title)
        );

        forkJoin(searches).subscribe({
          next: results => {
            const newResults = results.filter((result): result is (Series | Movie) => 
              result !== null && 
              !this.recommendations.some(existing => existing.id === result.id)
            );
            
            if (newResults.length > 0) {
              this.recommendations = [...this.recommendations, ...newResults];
            }
            this.isLoading = false;
            this.isSecondStage = false;
          },
          error: error => {
            console.error('Error in secondary searches:', error);
            this.isLoading = false;
            this.isSecondStage = false;
          }
        });
      },
      error: error => {
        console.error('Error in backend search:', error);
        this.isLoading = false;
        this.isSecondStage = false;
      }
    });
  }

  rotateQuotes() {
    let index = 0;
  
    const updateMessage = () => {
      const source = this.isSecondStage ? this.secondStageMessages : this.quotes;
      this.currentQuote = source[index];
      index = (index + 1) % source.length;
    };
  
    updateMessage(); // Set initial message
  
    const interval = setInterval(() => {
      if (!this.isLoading) {
        clearInterval(interval); // Stop rotating when loading ends
        return;
      }
      updateMessage();
    }, 2500); // Change quotes every 2.5 seconds
  }

  fetchSeriesDetails(seriesNames: string[], callback?: () => void) {
    this.tmdbService.getSeriesDetails(seriesNames).subscribe(
      seriesList => {
        this.recommendations = seriesList;
        if (callback) callback();
      },
      error => {
        console.error('Error fetching series details:', error);
      }
    );
  }
/*
  fetchAdditionalSeriesDetails(seriesNames: string[], callback?: () => void) {
    this.tmdbService.getSeriesDetails(seriesNames).subscribe(
      seriesList => {
        this.recommendations = [...this.recommendations, ...seriesList];
        if (callback) callback();
      },
      error => {
        console.error('Error fetching additional series details:', error);
      }
    );
  }

  fetchRecommendationsForSeries(callback?: () => void) {
    const requests = this.recommendations.map(series =>
      this.tmdbService.getSeriesRecommendations(series)
    );
  
    forkJoin(requests).subscribe(
      recommendedSeriesArrays => {
        const newRecommendations = recommendedSeriesArrays.flat().filter(series => series !== null);
  
        const uniqueRecommendations = newRecommendations.filter(
          newSeries =>
            !this.recommendations.some(existing => existing.name.toLowerCase() === newSeries.name.toLowerCase())
        );
  
        console.log('Unique recommendations:', uniqueRecommendations);
        this.recommendations = [...this.recommendations, ...uniqueRecommendations];
        console.log('TMDb Recommendations:', this.recommendations);
  
        if (callback) callback(); // Signal completion of recommendations fetching
      },
      error => {
        console.error('Error fetching recommendations for series:', error);
        if (callback) callback(); // Ensure callback is called even on error
      }
    );
  }*/

  getPosterUrl(posterPath: string | null | undefined): string {
    return posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : 'assets/placeholder-image.jpg';
  }
}
