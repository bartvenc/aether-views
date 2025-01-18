import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output, signal, OnInit, HostListener } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { Network } from '../../interfaces/series';
import { Studio } from '../../../../public/assets/studios';
import { Genre } from '../../interfaces/common-interfaces';
import { TmdbService } from '../../services/tmdb.service';
import { Router } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatChipsModule],
  templateUrl: './filter.component.html',
})
export class FilterComponent implements OnInit {
  @Input() type: 'movies' | 'series' | null = null; // Default type
  @Input() genres: Genre[] = [];
  @Input() years: number[] = [];
  @Input() studiosOrNetworks: Studio[] | Network[] = [];
  @Input() filters: Record<string, any> = {};
  @Output() filterChange = new EventEmitter<any>();
  @HostListener('window:resize', [])
  onResize(): void {
    this.checkViewport();
  }

  countries = [
    { code: 'US', name: 'USA' },
    { code: 'GB', name: 'UK' },
    { code: 'JP', name: 'Japan' },
    { code: 'KR', name: 'South Korea' },
    { code: 'FR', name: 'France' }
  ];



  tmdbService = inject(TmdbService);
  router = inject(Router);


  selectedCategory = signal('Popular');
  selectedYear = signal(0);
  selectedGenres = signal<number[]>([]);
  selectedStudiosOrNetworks = signal(0);
  keywordInput = signal('');
  keywordResults = signal<{ id: number; name: string }[]>([]);
  selectedKeywords = signal<{ id: number; name: string }[]>([]);
  separatorKeysCodes = [ENTER, COMMA] as const;

  selectedCountry = signal<string | null>('');

  selectedTypeSignal = signal<'movies' | 'series' | null>(this.type);
  showFilters = false;
  isMobile = false;

  ngOnInit() {
    this.checkViewport();
    console.log(' 5 Filter component initialized with:', this.filters);
    this.selectedTypeSignal.set(this.filters['type'] || this.type);
    this.selectedCategory.set(this.filters['category'] || 'Popular');
    this.selectedYear.set(this.filters['year'] || 0);
    this.selectedGenres.set(this.filters['genres'] || []);
    this.selectedStudiosOrNetworks.set(this.filters['studiosOrNetworks'] || 0);
    const keywordParam = this.filters['keyword'] ? [this.filters['keyword']] : [];
    this.selectedKeywords.set(keywordParam);
    console.log('  6 Filter component initialized after with:', {
      type: this.selectedTypeSignal(),
      category: this.selectedCategory(),
      year: this.selectedYear(),
      genres: this.selectedGenres(),
      keyword: this.selectedKeywords(),
      studioOrNetwork: this.selectedStudiosOrNetworks(),
    });
    const userRegion = this.tmdbService.getRegion();
    if (userRegion && !this.countries.some(c => c.code === userRegion)) {
      this.countries = [{ code: userRegion, name: new Intl.DisplayNames(['en'], { type: 'region' }).of(userRegion) || userRegion }, ...this.countries,];
    }


    this.updateFilter();
  }

  updateFilter() {
    const newType = this.selectedTypeSignal();

    if (newType !== this.type) {
      this.router.navigate([`/discover/${newType}`]);
      return;
    }

    if (this.selectedCategory() === 'New' && this.selectedYear() === 0) {
      this.selectedYear.set(new Date().getFullYear());
    }

    this.filterChange.emit({
      type: this.selectedTypeSignal(),
      category: this.selectedCategory(),
      year: this.selectedYear(),
      genres: this.selectedGenres(),
      studioOrNetwork: this.selectedStudiosOrNetworks(),
      keywords: this.selectedKeywords().map(kw => kw.id),
      country: this.selectedCountry()
    });
    console.log('Filter from filter component updated:', {
      type: this.selectedTypeSignal(),
      category: this.selectedCategory(),
      year: this.selectedYear(),
      genres: this.selectedGenres(),
      keyword: this.selectedKeywords(),
      studioOrNetwork: this.selectedStudiosOrNetworks(),
      country: this.selectedCountry()
    });

  }

  filterReset() {
    this.selectedCategory.set('Popular');
    this.selectedYear.set(0);
    this.selectedGenres.set([]);
    this.selectedStudiosOrNetworks.set(0);
    this.selectedKeywords.set([]);
    this.selectedCountry.set('');
    this.updateFilter();
  }

  onGenreChange(event: any) {
    // event.value is an array of selected IDs
    console.log('Genres changed:', event.value);
    if (event.value.some((genre: number) => genre === undefined)) {
      console.log('Deselecting all genres');
      this.selectedGenres.set([]);
    } else {
      this.selectedGenres.set(event.value);
    }
    this.updateFilter();
  }

  onKeywordInput(query: string) {
    this.keywordInput.set(query);
    if (query.length >= 3) {
      this.tmdbService.searchKeyword(query).subscribe((response) => {
        this.keywordResults.set(response.results);
      });
    } else {
      this.keywordResults.set([]);
    }
  }

  addKeywordFromSuggestion(keyword: { id: number; name: string }) {
    const exists = this.selectedKeywords().some((kw) => kw.id === keyword.id);
    if (!exists) {
      this.selectedKeywords.update((current) => [...current, keyword]);
    }

    this.keywordInput.set('');
    this.keywordResults.set([]); // Clear the results menu
    this.updateFilter();
  }

  removeKeyword(keywordId: number) {
    this.selectedKeywords.update((keywords) => keywords.filter((kw) => kw.id !== keywordId));
    this.updateFilter();
  }


  private checkViewport(): void {
    this.isMobile = window.innerWidth < 768;
  }

  getFirstSelectedGenre(): Genre | null {
    return this.genres.find((genre) => this.selectedGenres().includes(genre.id)) || null;
  }
}
