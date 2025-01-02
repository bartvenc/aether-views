import { Component, inject, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FilterComponent } from '../../components/filter/filter.component';
import { CardComponent } from '../../components/card/card.component';
import { TmdbService } from '../../services/tmdb.service';
import { MOVIE_GENRES } from '../../../../public/assets/genres';
import { Genre } from '../../interfaces/common-interfaces';
import { Studio, STUDIOS } from '../../../../public/assets/studios';
import { Network } from '../../interfaces/series';

@Component({
  selector: 'app-filter-page',
  standalone: true,
  imports: [FilterComponent, CardComponent, RouterLink],
  templateUrl: './filter-page.component.html'
})
export class FilterPageComponent implements OnInit, OnDestroy {
  @Input() type: 'movies' | 'series' = 'movies';
  filters = signal({
    category: 'Popular',
    year: null as number | null,  
    genres: [] as Genre[],
    keywords: [],
    studiosOrNetworks: [] as Studio[] | Network [],
  });

  movieGenres = MOVIE_GENRES;
  studios = STUDIOS;

  currentGenres: Genre[] = [];
  curentStudiosOrNetwork: Studio[] = [];

  items = signal<any[]>([]); // This will hold the fetched data
  isLoading = signal(false);
  currentPage = signal(1);
  totalPages = signal(0);

  repeatArray = new Array(6);

  route: ActivatedRoute = inject(ActivatedRoute);
  tmdbService = inject(TmdbService);

  ngOnInit(): void {

    this.type = this.route.snapshot.data['type'];

    console.log('Type:', this.type);
    if(this.type === 'movies') {
      this.currentGenres = this.movieGenres;
      this.curentStudiosOrNetwork = this.studios;
      this.fetchMovies(true);
    }

    window.addEventListener('scroll', this.onScroll.bind(this));
  }

  // Triggered by the filter component
  updateFilters(newFilters: any) {
    console.log('Updating filters:', newFilters);
    this.filters.update((currentFilters) => {
      const updatedYear = newFilters.category === 'New' && !newFilters.year
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
    this.fetchMovies(true);
  }
  



  fetchMovies(initialLoad: boolean = false) {
    if (this.isLoading() || (!initialLoad && this.currentPage() > 500)) return; // TMDB API limit

    this.isLoading.set(true);
    const filterValues = this.filters();
    const pagesToFetch = initialLoad ? [1, 2] : [this.currentPage()];

    Promise.all(
      pagesToFetch.map((page) =>
        this.tmdbService.fetchMovies(filterValues, page).toPromise()
      )
    )
      .then((responses) => {
        responses.forEach((response) => {
          this.items.update((existingItems) => [...existingItems, ...response.results]);
        });
        if (!initialLoad) {
          this.currentPage.update((page) => page + 1);
        }
        this.isLoading.set(false);
      })
      .catch((err) => {
        console.error('Error fetching movies:', err);
        this.isLoading.set(false);
      });
  }

  onScroll(): void {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    const clientHeight = document.documentElement.clientHeight || window.innerHeight;

    if (scrollTop + clientHeight >= scrollHeight - 100) {
      this.fetchMovies(); // Load next page on scroll
    }
  }


  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll.bind(this));
  }

/*
  this.route.queryParams.subscribe((params) => {
    if (params['releaseYear']) {
      this.filters.update((f) => ({ ...f, year: +params['releaseYear'] }));
    }
    if (params['genres']) {
      this.filters.update((f) => ({ ...f, genres: params['genres'].split(',') }));
    }
    if (params['keyword']) {
      this.filters.update((f) => ({ ...f, keyword: params['keyword'] }));
    }
    
  });
  fetchItems() {
    this.isLoading.set(true);
    const filterValues = this.filters();
    console.log('Fetching items with filters:', filterValues);

    // Mock API call
    setTimeout(() => {
      // Replace this with actual data fetch
      this.items.set([
        // Mock data structure
        { id: 1, title: 'Sample Movie 1', subtitle: '2024', imageUrl: '...' },
        { id: 2, title: 'Sample Movie 2', subtitle: '2023', imageUrl: '...' },
      ]);
      this.isLoading.set(false);
    }, 1000);
  }*/
}
