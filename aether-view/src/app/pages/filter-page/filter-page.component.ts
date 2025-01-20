import { Component, inject, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FilterComponent } from '../../components/filter/filter.component';
import { CardComponent } from '../../components/card/card.component';
import { TmdbService } from '../../services/tmdb.service';
import { MOVIE_GENRES, SERIES_GENRES } from '../../../../public/assets/genres';
import { Genre, Keyword } from '../../interfaces/common-interfaces';
import { Studio, STUDIOS } from '../../../../public/assets/studios';
import {  NETWORKS } from '../../../../public/assets/networks';
import { firstValueFrom, Subscription } from 'rxjs';
import { InfiniteScrollDirective  } from 'ngx-infinite-scroll';

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
  filters = signal({
    type: this.type,
    category: 'Popular',
    year: null as number | null,
    genres: [] as number[],
    keyword: null as Keyword | null,
    studiosOrNetworks: null as number | null,
    person: null as number | null,
  });

  movieGenres = MOVIE_GENRES;
  seriesGenres = SERIES_GENRES;
  studios = STUDIOS;
  networks = NETWORKS;

  years = Array.from({length: new Date().getFullYear() - 1979},
   (_, i) => new Date().getFullYear() - i);

  
  selectedGenres = signal<number[]>([]);

  currentGenres: Genre[] = [];
  curentStudiosOrNetwork: Studio[] = [];

  items = signal<any[]>([]); // This will hold the fetched data
  isLoading = signal(false);
  page = signal(1);
  private scrollSubscription?: Subscription;
  private isLoadingMore = false;
  currentPage = signal(1);
  totalPages = signal(0);

  repeatArray = new Array(6);

  route: ActivatedRoute = inject(ActivatedRoute);
  tmdbService = inject(TmdbService);

  ngOnInit(): void {
    this.type = this.route.snapshot.data['type'];
    this.filters.update(f => ({ ...f, type: this.type }));

   
    if (this.type === 'movies') {
      this.currentGenres = this.movieGenres;
      this.curentStudiosOrNetwork = this.studios;
    } else if (this.type === 'series') {
      this.currentGenres = this.seriesGenres;
      this.curentStudiosOrNetwork = this.networks;
    }

    this.route.queryParams.subscribe(params => {
      if (params['genre']) {
        this.filters.update(f => ({ ...f, genres: params['genre'].split(',').map((id: number) => +id) }));

      }
      if (params['keyword']) {
        try {
          const keyword = JSON.parse(params['keyword']);
          this.filters.update(f => ({ ...f, keyword }));
        } catch (e) {
          console.error('Invalid keyword format:', e);
        }
      }
      if (params['studio']) {
        try {
          this.filters.update(f => ({ ...f, studiosOrNetworks: params['studio'] }));
        } catch (e) {
          console.error('Invalid keyword format:', e);
        }
      }
      if (params['person']) {
        try {
          this.filters.update(f => ({ ...f, person: params['person'] }));
        } catch (e) {
          console.error('Invalid keyword format:', e);
        }
      }
      if (params['category']) {
        try {
          this.filters.update(f => ({ ...f, category: params['category'] }));
        } catch (e) {
          console.error('Invalid keyword format:', e);
        }
      }
    });
  }

  // Triggered by the filter component
  updateFilters(newFilters: any) {
    if (this.isLoading()) {
      return;
    }
    this.filters.update(currentFilters => {
      const updatedYear =
        newFilters.category === 'New' && !newFilters.year
          ? new Date().getFullYear()
          : newFilters.year !== undefined
            ? newFilters.year
            : currentFilters.year;

      return {
        ...currentFilters,
        ...newFilters,
        keywords: newFilters.keywords || [],
        year: updatedYear,
      };
    });

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
        pagesToFetch.map(page =>
          firstValueFrom(
            this.tmdbService.fetchContent(filterValues, page, this.type === 'movies' ? 'movie' : 'tv')
          )
        )
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
