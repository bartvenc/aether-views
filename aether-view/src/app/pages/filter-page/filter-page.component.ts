import { Component, inject, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FilterComponent } from '../../components/filter/filter.component';
import { CardComponent } from '../../components/card/card.component';
import { TmdbService } from '../../services/tmdb.service';
import { MOVIE_GENRES, SERIES_GENRES } from '../../../../public/assets/genres';
import { Genre, Keyword } from '../../interfaces/common-interfaces';
import { Studio, STUDIOS } from '../../../../public/assets/studios';
import { Network } from '../../interfaces/series';
import { debounceTime, firstValueFrom, fromEvent, Subscription } from 'rxjs';

@Component({
  selector: 'app-filter-page',
  standalone: true,
  imports: [FilterComponent, CardComponent],
  templateUrl: './filter-page.component.html',
})
export class FilterPageComponent implements OnInit, OnDestroy {
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

  selectedGenres = signal<number[]>([]);

  currentGenres: Genre[] = [];
  curentStudiosOrNetwork: Studio[] = [];

  items = signal<any[]>([]); // This will hold the fetched data
  isLoading = signal(false);
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

    console.log('Type:', this.type);
    if (this.type === 'movies') {
      this.currentGenres = this.movieGenres;
      this.curentStudiosOrNetwork = this.studios;
    } else if (this.type === 'series') {
      this.currentGenres = this.seriesGenres;
      //this.curentStudiosOrNetwork = this.studios;
    }

    this.route.queryParams.subscribe(params => {
      if (params['genre']) {
        this.filters.update(f => ({ ...f, genres: params['genre'].split(',').map((id: number) => +id) }));
        console.log('Genres:', this.filters().genres);
        //this.updateFilters(this.filters());
      }
      if (params['keyword']) {
        try {
          const keyword = JSON.parse(params['keyword']);
          this.filters.update(f => ({ ...f, keyword }));
          console.log('Keyword 1:', this.filters().keyword);
        } catch (e) {
          console.error('Invalid keyword format:', e);
        }
      }
      if (params['studio']) {
        try {
          this.filters.update(f => ({ ...f, studiosOrNetworks: params['studio'] }));
          console.log('studio 1:', this.filters().studiosOrNetworks);
        } catch (e) {
          console.error('Invalid keyword format:', e);
        }
      }
      if (params['person']) {
        try {
          this.filters.update(f => ({ ...f, person: params['person'] }));
          console.log('person 1:', this.filters().person);
        } catch (e) {
          console.error('Invalid keyword format:', e);
        }
      }
      if (params['category']) {
        try {
          this.filters.update(f => ({ ...f, category: params['category'] }));
          console.log('category 1:', this.filters().category);
        } catch (e) {
          console.error('Invalid keyword format:', e);
        }
      }
    });
    this.setupScrollListener();
  }

  // Triggered by the filter component
  updateFilters(newFilters: any) {
    console.log('Updating filters: 2', newFilters);
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
    console.log('Updated filters:', this.filters());
    this.currentPage.set(1);
    this.items.set([]);
    this.fetchContent(true);
  }

  async fetchContent(initialLoad = false) {
    if (this.isLoading() || (!initialLoad && this.currentPage() > 500)) return;

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

      responses.forEach(response => {
        if (response) {  // Add null check
          if (initialLoad) {
            this.items.set(response.results || []); // Add fallback
          } else {
            this.items.update(existingItems => [...existingItems, ...(response.results || [])]);
          }
        }
      });

      if (!initialLoad) {
        this.currentPage.update(page => page + 1);
      }
    } catch (err) {
      console.error('Error fetching content:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  private setupScrollListener(): void {
    // Clean up any existing subscription first
    this.scrollSubscription?.unsubscribe();
    
    this.scrollSubscription = fromEvent(window, 'scroll')
      .pipe(
        debounceTime(200)
      )
      .subscribe(() => {
        if (!this.isLoadingMore && this.route.snapshot.url[0]?.path.includes('discover')) {
          this.onScroll();
        }
      });
  }

  onScroll(): void {
    if (this.isLoading()) return; // Don't trigger if already loading

    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    const clientHeight = document.documentElement.clientHeight || window.innerHeight;

    if (scrollTop + clientHeight >= scrollHeight - 100) {
      this.isLoadingMore = true;
      this.fetchContent().finally(() => {
        this.isLoadingMore = false;
      });
    }
  }

  ngOnDestroy(): void {
    if (this.scrollSubscription) {
      this.scrollSubscription.unsubscribe();
    }
  }
}
