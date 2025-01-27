import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Router } from '@angular/router';

import { forkJoin, map, Observable, switchMap, catchError, of } from 'rxjs';

import { SliderComponent } from '@components/slider/slider.component';
import { defaultCurations } from '@app/data/constants/currations';
import { BackendService } from '@services/backend.service';
import { prompts, quotes, secondStageMessages } from '@app/data/constants/placeholders';
import { Curation, RecommendationItem } from '@interfaces/common-interfaces';
import { Movie } from '@interfaces/movies';
import { Series } from '@interfaces/series';
import { TmdbService } from '@services/tmdb.service';

interface FilterState {
  mediaFilter: 'all' | 'movies' | 'series';
  sortOrder: 'newest' | 'oldest';
}

interface QuoteState {
  index: number;
  interval: any;
}

@Component({
  standalone: true,
  selector: 'app-recommendation',
  templateUrl: './recommendation.component.html',
  imports: [CommonModule, FormsModule, MatButtonToggleModule, SliderComponent],
  host: {
    class: 'recommendation-page',
  },
  styles: [
    `
      :host {
        @apply block min-h-screen bg-[#201a23] text-white;
      }

      .header-gradient {
        @apply bg-gradient-to-b from-transparent to-[#201a23];
      }

      .content-wrapper {
        @apply px-4 md:px-8 py-2 md:py-1;
      }

      .search-input {
        @apply w-full max-w-md bg-[#28202b] border border-gray-700 text-gray-300 p-2 rounded-lg
             focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all duration-300 text-sm;
      }

      .search-input:disabled {
         @apply cursor-not-allowed;
      }
      .button-primary:disabled {
        @apply cursor-not-allowed;
      }
      .button-primary {
        @apply px-4 py-2 bg-[#3a2e3d] hover:bg-[#4a3e4d] text-white rounded-lg
             transition duration-300 flex items-center justify-center gap-2 text-sm whitespace-nowrap;
      }

      .section-title {
        @apply text-2xl font-bold mb-6;
      }

      .curation-title {
        @apply text-xl font-bold mb-2 px-2;
      }
    `,
  ],
})
export class RecommendationComponent implements OnInit, OnDestroy {
  private readonly STORAGE_KEY = 'user_curations';
  // Signals
  readonly currentRecommendations = signal<Curation[]>([]);
  readonly showExamples = signal(true);
  readonly defaultRecommendations = signal<Curation[]>([]);
  readonly isLoading = signal(false);
  readonly isSecondStage = signal(false);
  readonly currentQuote = signal('');
  readonly currentPromt = signal('');
  readonly filterState = signal<FilterState>({
    mediaFilter: 'all',
    sortOrder: 'newest',
  });

  // Regular properties
  userQuery = '';
  hasUserInput = false;
  
  private quoteState: QuoteState = { index: 0, interval: null };
  private promptState: QuoteState = {
    index: Math.floor(Math.random() * prompts.length),
    interval: null,
  };

  // Dependency injection
  private readonly router = inject(Router);
  private readonly backendService = inject(BackendService);
  private readonly tmdbService = inject(TmdbService);

  ngOnInit(): void {
    this.loadSavedCurations();
    this.startQuoteRotation();
    this.defaultRecommendations.set(defaultCurations);
  }

  // API interaction methods
  private searchSingleTitle(content: RecommendationItem): Observable<Series | Movie | null> {
    return this.tmdbService.searchMulti(content.title).pipe(
      map(results => {
        const matchingResult = results.find(result => result.media_type === content.media_type);
        return matchingResult ?? results.find(item => ['movie', 'tv'].includes(item.media_type)) ?? null;
      }),
      catchError(error => {
        console.error('Error searching title:', error);
        return of(null);
      })
    );
  }

  getRecommendations(): void {
    this.isLoading.set(true);
    this.isSecondStage.set(false);
    this.startQuoteRotation();

    this.fetchRecommendations().subscribe({
      next: () => {
        this.resetState();
      },
      error: error => {
        console.error('Error in recommendation flow:', error);
        this.handleError();
      },
    });
  }

  private fetchRecommendations(): Observable<void> {
    return this.backendService.getRecommendations(this.userQuery).pipe(
      switchMap(response => this.processInitialResults(response)),
      switchMap(() => this.fetchSecondaryResults()),
      map(() => void 0)
    );
  }

  private processInitialResults(response: any): Observable<void> {
    return forkJoin<(Series | Movie | null)[]>(response.recommendations.map((item: RecommendationItem) => this.searchSingleTitle(item))).pipe(
      map(results => this.updateRecommendations(results, true))
    );
  }

  private fetchSecondaryResults(): Observable<void> {
    this.isSecondStage.set(true);
    return this.backendService.search(this.userQuery).pipe(
      switchMap(response => forkJoin<(Series | Movie | null)[]>(response.results.map((item: RecommendationItem) => this.searchSingleTitle(item)))),
      map(results => this.updateRecommendations(results, false))
    );
  }

  private updateRecommendations(results: (Series | Movie | null)[], isNew: boolean): void {
    if (results.length === 0) return;

    const validResults = results.filter((r): r is Series | Movie => r !== null);
    const movies = validResults.filter(r => r.media_type === 'movie') as Movie[];
    const series = validResults.filter(r => r.media_type === 'tv') as Series[];

    const newCuration: Curation = {
      id: crypto.randomUUID(),
      query: this.userQuery,
      timestamp: new Date().toISOString(),
      isDefault: false,
      movies,
      series
    };

    this.currentRecommendations.update(curations => {
      const updated = isNew ? [newCuration, ...curations] : [...curations];
      this.saveCurations(); // Save after updating
      return updated;
    });
  }

  // Quote rotation methods
  private startQuoteRotation(): void {
    this.updateInitialQuotes();
    this.setupQuoteIntervals();
  }

  private updateInitialQuotes(): void {
    this.currentPromt.set(prompts[this.promptState.index]);
    this.currentQuote.set(quotes[this.quoteState.index]);
  }

  private setupQuoteIntervals(): void {
    this.promptState.interval = setInterval(() => {
      if (this.hasUserInput) {
        clearInterval(this.promptState.interval);
        return;
      }
      this.promptState.index = (this.promptState.index + 1) % prompts.length;
      this.currentPromt.set(prompts[this.promptState.index]);
    }, 2500);

    if (this.isLoading()) {
      this.setupLoadingQuotes();
    }
  }

  private setupLoadingQuotes(): void {
    const updateQuote = () => {
      if (!this.isLoading()) {
        clearInterval(this.quoteState.interval);
        return;
      }
      const source = this.isSecondStage() ? secondStageMessages : quotes;
      this.currentQuote.set(source[this.quoteState.index]);
      this.quoteState.index = (this.quoteState.index + 1) % source.length;
    };

    this.quoteState.interval = setInterval(updateQuote, 2500);
    updateQuote();
  }

  // Filtering and sorting methods
  get filteredCurations() {
    const userCurations = this.filterCurations(this.currentRecommendations(), false);
    const defaultCurations = this.showExamples() ? this.filterCurations(this.defaultRecommendations(), true) : [];
    return [...userCurations, ...defaultCurations];
  }

  private filterCurations(curations: Curation[], isDefault: boolean) {
    return curations.map((curation, index) => ({
      ...this.applySortingAndFiltering(curation),
      isDefault,
      trackId: `${curation.query}_${isDefault ? index + 1000 : index}`,
    }));
  }

  private applySortingAndFiltering(curation: Curation) {
    const { mediaFilter, sortOrder } = this.filterState();
    const allItems = [...curation.movies, ...curation.series]
      .filter(item => this.filterByMediaType(item, mediaFilter))
      .sort((a, b) => this.sortByDate(a, b, sortOrder));

    return {
      query: curation.query,
      items: allItems,
    };
  }

  private filterByMediaType(item: Movie | Series, mediaFilter: string): boolean {
    if (mediaFilter === 'all') return true;
    return mediaFilter === 'movies' ? item.media_type === 'movie' : item.media_type === 'tv';
  }

  private sortByDate(a: Movie | Series, b: Movie | Series, sortOrder: string): number {
    const dateA = new Date(this.getItemDate(a));
    const dateB = new Date(this.getItemDate(b));
    return sortOrder === 'newest' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
  }

  private getItemDate(item: Movie | Series): string {
    return item.media_type === 'movie' ? ((item as Movie).release_date ?? '') : ((item as Series).first_air_date ?? '');
  }

  // Utility methods
  private isDuplicate(result: Series | Movie): boolean {
    if (this.currentRecommendations().length === 0) return false;

    const current = this.currentRecommendations()[0];

    return result.media_type === 'movie' ? current.movies.some(m => m.id === result.id) : current.series.some(s => s.id === result.id);
  }

  private handleError(): void {
    this.isLoading.set(false);
    this.isSecondStage.set(false);
    this.resetState();
  }

  private resetState(): void {
    this.userQuery = '';
    this.hasUserInput = false;
    this.isLoading.set(false);
    this.isSecondStage.set(false);
    clearInterval(this.promptState.interval);
    clearInterval(this.quoteState.interval);
    this.startQuoteRotation();
  }

  get userCurations() {
    return this.filteredCurations.filter(c => !c.isDefault);
  }

  get exampleCurations() {
    return this.filteredCurations.filter(c => c.isDefault);
  }

  onUserInput(): void {
    this.hasUserInput = true;
    clearInterval(this.promptState.interval);
  }

  navigateToDetails(item: Movie | Series): void {
    this.saveCurations();
    const route = item.media_type === 'movie' ? '/movie' : '/tv';
    this.router.navigate([`${route}/${item.id}`]);
  }

  private loadSavedCurations(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const curations = JSON.parse(saved);
        this.currentRecommendations.set(curations);
      }
    } catch (error) {
      console.error('Error loading curations:', error);
    }
  }

  private saveCurations(): void {
    try {
      const curations = this.currentRecommendations();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(curations));
    } catch (error) {
      console.error('Error saving curations:', error);
    }
  }

  ngOnDestroy(): void {
    clearInterval(this.promptState.interval);
    clearInterval(this.quoteState.interval);
  }
}
