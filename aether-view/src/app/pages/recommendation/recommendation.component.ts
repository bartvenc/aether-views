// recommendation.component.ts

import { Component, inject, signal } from '@angular/core';
import { BackendService } from '../../services/backend.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Series } from '../../interfaces/series';
import { TmdbService } from '../../services/tmdb.service';
import { forkJoin, map, Observable } from 'rxjs';
import { Movie } from '../../interfaces/movies';
import { prompts, quotes, secondStageMessages } from '../../../../public/assets/placeholders';
import { RecommendationItem } from '../../interfaces/common-interfaces';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Router } from '@angular/router';
import { SliderComponent } from '../../components/slider/slider.component';

@Component({
  standalone: true,
  selector: 'app-recommendation',
  templateUrl: './recommendation.component.html',
  imports: [CommonModule, FormsModule, MatButtonToggleModule, SliderComponent],
})
export class RecommendationComponent {
  userQuery = '';
  currentRecommendations = signal<{
    query: string;
    movies: Movie[];
    series: Series[];
  }[]>([]);
  isLoading: boolean = false;
  isSecondStage: boolean = false;
  currentQuote = signal('');
  currentPromt = signal('');
  private hasUserInput = false;
  private promptInterval: any;
  private quoteInterval: any;
  readonly prompts = prompts;
  readonly quotes = quotes;
  readonly secondStageMessages = secondStageMessages;

  ngOnInit(): void {
    this.rotateQuotes();
  }

  router = inject(Router);

  mediaFilter = 'all'; // 'all' | 'movies' | 'series'
  sortOrder = 'newest'; // 'newest' | 'oldest'


  backendService = inject(BackendService);
  tmdbService = inject(TmdbService);

  
  private searchSingleTitle(content: RecommendationItem): Observable<Series | Movie | null> {
    return this.tmdbService.searchMulti(content.title).pipe(
      map(results => {
        // Find first result matching the media_type
        for (const result of results) {
          if (result.media_type === content.media_type) {
            return result;
          }
        }
        // If no match found, return first movie/tv result
        return results.find(item => 
          item.media_type === 'movie' || item.media_type === 'tv'
        ) || null;
      })
    );
  }

  getRecommendations() {
    this.isLoading = true;
    this.isSecondStage = false;
    clearInterval(this.quoteInterval);
    this.rotateQuotes();
  
    this.backendService.getRecommendations(this.userQuery).subscribe({
      next: response => {
        const searches = response.recommendations.map(item => 
          this.searchSingleTitle(item)
        );
  
        forkJoin(searches).subscribe({
          next: results => {
            const validResults = results.filter((result): result is (Series | Movie) => result !== null);
            const movies = validResults.filter(item => item.media_type === 'movie') as Movie[];
            const series = validResults.filter(item => item.media_type === 'tv') as Series[];
            
            this.currentRecommendations.update(current => [{
              query: this.userQuery,
              movies,
              series
            }, ...current]);
            
            this.performSecondarySearch();
          },
          error: error => {
            console.error('Error in initial searches:', error);
            this.isLoading = false;
          }
        });
      }
    });
  }

  private performSecondarySearch() {
    this.isSecondStage = true;
    
    this.backendService.search(this.userQuery).subscribe({
      next: response => {
        const searches = response.results.map(item =>
          this.searchSingleTitle(item)
        );
  
        forkJoin(searches).subscribe({
          next: results => {
            const validResults = results.filter((result): result is (Series | Movie) => 
              result !== null && 
              !this.currentRecommendations()[0].movies.some(m => m.id === result.id) &&
              !this.currentRecommendations()[0].series.some(s => s.id === result.id)
            );
            
            const movies = validResults.filter(item => item.media_type === 'movie') as Movie[];
            const series = validResults.filter(item => item.media_type === 'tv') as Series[];
            
            this.currentRecommendations.update(current => [{
              query: current[0].query,
              movies: [...current[0].movies, ...movies],
              series: [...current[0].series, ...series]
            }, ...current.slice(1)]);
            
            this.isLoading = false;
            this.isSecondStage = false;
            this.resetState();
          },
          error: error => {
            console.error('Error in secondary searches:', error);
            this.isLoading = false;
            this.isSecondStage = false;
            this.resetState();
          }
        });
      }
    });
  }

  rotateQuotes() {
    let quoteIndex = 0;
    let promptIndex = Math.floor(Math.random() * this.prompts.length);
    
    // Initial values
    this.currentPromt.set(this.prompts[promptIndex]);
    this.currentQuote.set(this.quotes[quoteIndex]);
  
    // Rotate prompts continuously until user input
    this.promptInterval = setInterval(() => {
      if (this.hasUserInput) {
        clearInterval(this.promptInterval);
        return;
      }
      promptIndex = (promptIndex + 1) % this.prompts.length;
      this.currentPromt.set(this.prompts[promptIndex]);
    }, 2500);
  
    // Rotate quotes only during loading
    const updateQuote = () => {
      if (!this.isLoading) {
        clearInterval(this.quoteInterval);
        return;
      }
      const source = this.isSecondStage ? this.secondStageMessages : this.quotes;
      this.currentQuote.set(source[quoteIndex]);
      quoteIndex = (quoteIndex + 1) % source.length;
    };
  
    // Start quote rotation when loading begins
    if (this.isLoading) {
      this.quoteInterval = setInterval(updateQuote, 2500);
      updateQuote(); // Initial update
    }
  }
  // Apply sorting
  getDateOrType(item: Movie | Series, option: 'date' | 'type'): string {
    if (option === 'date') {
      return item.media_type === 'movie' ? item.release_date ?? '' : item.first_air_date ?? '';
    } else {
      return item.media_type === 'movie' ? 'movies' : 'series';
    }
  }

  get filteredCurations() {
    return this.currentRecommendations().map(curation => {
      let allItems = [...curation.movies, ...curation.series];
      
      // Apply media type filter
      if (this.mediaFilter !== 'all') {
        allItems = allItems.filter(item => 
          this.mediaFilter === 'movies' ? 
            item.media_type === 'movie' : 
            item.media_type === 'tv'
        );
      }

      // Sort items using the extracted date
      allItems.sort((a, b) => {
        const dateA = new Date(this.getDateOrType(a, 'date'));
        const dateB = new Date(this.getDateOrType(b, 'date'));
        return this.sortOrder === 'newest' ? 
          dateB.getTime() - dateA.getTime() : 
          dateA.getTime() - dateB.getTime();
      });
      return {
        query: curation.query,
        items: allItems
      };
    });
  }

  // Update input handling
  onUserInput() {
    this.hasUserInput = true;
    clearInterval(this.promptInterval);
  }

  // Reset state when needed
  resetState() {
    this.userQuery = '';
    this.hasUserInput = false;
    clearInterval(this.promptInterval);
    clearInterval(this.quoteInterval);
    this.rotateQuotes();
  }

  ngOnDestroy() {
    clearInterval(this.promptInterval);
    clearInterval(this.quoteInterval);
  }

  navigateToDetails(item: Movie | Series) {
    const route = item.media_type === 'movie' ? '/movie' : '/tv';
    this.router.navigate([`${route}/${item.id}`]);
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
}
