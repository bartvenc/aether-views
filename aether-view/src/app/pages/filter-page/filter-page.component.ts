import { Component, DestroyRef, inject, Input, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FilterComponent } from '@components/filter/filter.component';
import { CardComponent } from '@components/card/card.component';
import { TmdbService } from '@services/tmdb.service';
import { MOVIE_GENRES, SERIES_GENRES } from '@assets/genres';
import { Genre, Keyword } from '@interfaces/common-interfaces';
import { Studio, STUDIOS } from '@assets/studios';
import { NETWORKS } from '@assets/networks';
import { firstValueFrom } from 'rxjs';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface FilterState {
  type: 'movies' | 'series';
  category: string;
  year: number | null;
  genres: number[];
  keyword: Keyword | null;
  studiosOrNetworks: number | null;
  person: number | null;
}

export interface ContentItem {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  overview: string;
  poster_path: string;
  media_type: 'movie' | 'tv';
}

@Component({
  selector: 'app-filter-page',
  standalone: true,
  imports: [FilterComponent, CardComponent, InfiniteScrollDirective],
  templateUrl: './filter-page.component.html',
})
export class FilterPageComponent implements OnInit {
  @Input() type: 'movies' | 'series' = 'movies';

  readonly filters = signal<FilterState>({
    type: this.type,
    category: 'Popular',
    year: null,
    genres: [],
    keyword: null,
    studiosOrNetworks: null,
    person: null,
  });

  readonly movieGenres = MOVIE_GENRES;
  readonly seriesGenres = SERIES_GENRES;
  readonly studios = STUDIOS;
  readonly networks = NETWORKS;
  readonly years = Array.from({ length: new Date().getFullYear() - 1979 }, (_, i) => new Date().getFullYear() - i);

  readonly selectedGenres = signal<number[]>([]);

  currentGenres: Genre[] = [];
  curentStudiosOrNetwork: Studio[] = [];

  readonly items = signal<any[]>([]);
  readonly isLoading = signal(false);
  readonly currentPage = signal(1);
  readonly totalPages = signal(0);

  readonly repeatArray = new Array(6);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly route: ActivatedRoute = inject(ActivatedRoute);
  protected readonly tmdbService = inject(TmdbService);

  ngOnInit(): void {
    this.initializeComponent();
    this.subscribeToRouteParams();
  }
  
  private initializeComponent(): void {
    this.type = this.route.snapshot.data['type'];
    this.filters.update(f => ({ ...f, type: this.type }));
    this.setCurrentFilters();
  }


  private setCurrentFilters(): void {
    if (this.type === 'movies') {
      this.currentGenres = this.movieGenres;
      this.curentStudiosOrNetwork = this.studios;
    } else {
      this.currentGenres = this.seriesGenres;
      this.curentStudiosOrNetwork = this.networks;
    }
  }

  private subscribeToRouteParams(): void {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => this.handleQueryParams(params));
  }
  
  private handleQueryParams(params: Record<string, string>): void {
    try {
      this.updateFiltersFromParams(params);
    } catch (error) {
      console.error('Error processing query parameters', error);
    }
  }

  private updateFiltersFromParams(params: Record<string, string>): void {
    const updates: Partial<FilterState> = {};

    if (params['genre']) {
      updates.genres = params['genre'].split(',').map(Number);
    }
    if (params['keyword']) {
      updates.keyword = JSON.parse(params['keyword']);
    }
    if (params['studio']) {
      updates.studiosOrNetworks = Number(params['studio']);
    }
    if (params['person']) {
      updates.person = Number(params['person']);
    }
    if (params['category']) {
      updates.category = params['category'];
    }

    this.filters.update(f => ({ ...f, ...updates }));
  }

  // Triggered by the filter component
  updateFilters(newFilters: Partial<FilterState>): void {
    if (this.isLoading()) return;

    this.filters.update(currentFilters => ({
      ...currentFilters,
      ...newFilters,
      keyword: newFilters.keyword || null,
      year: this.determineYear(newFilters, currentFilters)
    }));

    this.resetAndFetchContent();
  }

  private determineYear(newFilters: Partial<FilterState>, currentFilters: FilterState): number | null {
    if (newFilters.category === 'New' && !newFilters.year) {
      return new Date().getFullYear();
    }
    return newFilters.year ?? currentFilters.year;
  }

  private resetAndFetchContent(): void {
    this.currentPage.set(1);
    this.items.set([]);
    
    setTimeout(() => {
      if (!this.isLoading()) {
        this.fetchContent(true);
      }
    }, 300);
  }

  async fetchContent(initialLoad = false) {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    const filterValues = this.filters();
    const pagesToFetch = initialLoad ? [1, 2] : [this.currentPage()];

    try {
      const responses = await Promise.all(
        pagesToFetch.map(page => firstValueFrom(this.tmdbService.fetchContent(filterValues, page, this.type === 'movies' ? 'movie' : 'tv')))
      );

      if (initialLoad) {
        const combinedResults = responses.reduce((acc, response) => {
          if (response?.results) {
            return [...acc, ...response.results];
          }
          return acc;
        }, [] as any[]);

        this.items.set(combinedResults);
        this.currentPage.set(3);

        if (responses[0]?.total_pages) {
          this.totalPages.set(responses[0].total_pages);
        }
      } else {
        const response = responses[0];
        if (response?.results) {
          this.items.update(existingItems => [...existingItems, ...response.results]);
          this.currentPage.update(page => page + 1);
        }
      }
    } catch (err) {
      console.error('Error fetching content:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  onScroll(): void {
    if (this.isLoading() || (this.totalPages() && this.currentPage() >= this.totalPages())) {
      return;
    }
    this.fetchContent(false);
  }
}
