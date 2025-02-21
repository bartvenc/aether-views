import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output, signal, OnInit, HostListener } from '@angular/core';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

import { Network } from '@interfaces/series';
import { Studio } from '@app/data/constants/studios';
import { Genre } from '@interfaces/common-interfaces';
import { TmdbService } from '@services/tmdb.service';
import { Router } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';

export interface FilterState {
  type: 'movies' | 'series' | null;
  category: string;
  year: number;
  genres: number[];
  studioOrNetwork: number;
  keywords: number[];
  country: string | null;
}

export interface KeywordResult {
  id: number;
  name: string;
}

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatIconModule, MatChipsModule],
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
    { code: 'FR', name: 'France' },
  ];

  protected readonly tmdbService = inject(TmdbService);
  protected readonly router = inject(Router);

  readonly selectedCategory = signal('Popular');
  readonly selectedYear = signal(0);
  readonly selectedGenres = signal<number[]>([]);
  readonly selectedStudiosOrNetworks = signal(0);
  readonly keywordInput = signal('');
  readonly keywordResults = signal<{ id: number; name: string }[]>([]);
  readonly selectedKeywords = signal<{ id: number; name: string }[]>([]);
  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  readonly selectedCountry = signal<string | null>('');

  readonly selectedTypeSignal = signal<'movies' | 'series' | null>(this.type);
  readonly activeFiltersCount = signal(0);
  showFilters = false;
  isMobile = false;

  ngOnInit() {
    this.checkViewport();
    this.initializeSelections();
    this.updateFilter(); // Moved common startup logic into a single method
  }

  private initializeSelections(): void {
    // Consolidated the signal initializations here for clarity
    this.selectedTypeSignal.set(this.filters['type'] || this.type);
    this.selectedCategory.set(this.filters['category'] || 'Popular');
    this.selectedYear.set(this.filters['year'] || 0);
    this.selectedGenres.set(this.filters['genres'] || []);
    const studioId = this.filters['studiosOrNetworks'] ? Number(this.filters['studiosOrNetworks']) : 0;
    this.selectedStudiosOrNetworks.set(studioId);
    const keywordParam = this.filters['keyword'] ? [this.filters['keyword']] : [];
    this.selectedKeywords.set(keywordParam);
    const userRegion = this.tmdbService.getRegion();
    if (userRegion && !this.countries.some(c => c.code === userRegion)) {
      this.countries = [
        { code: userRegion, name: new Intl.DisplayNames(['en'], { type: 'region' }).of(userRegion) || userRegion },
        ...this.countries,
      ];
    }
  }

  updateFilter(): void {
    if (this.shouldNavigateType()) {
      this.router.navigate([`/discover/${this.selectedTypeSignal()}`]);
      return;
    }
    if (this.selectedCategory() === 'New' && this.selectedYear() === 0) {
      this.selectedYear.set(new Date().getFullYear());
    }
    this.emitFilterChange();
    this.activeFiltersCount.set(this.countActiveFilters());
  }

  private shouldNavigateType(): boolean {
    const newType = this.selectedTypeSignal();
    return !!newType && newType !== this.type;
  }

  private emitFilterChange(): void {
    const payload = {
      type: this.selectedTypeSignal(),
      category: this.selectedCategory(),
      year: this.selectedYear(),
      genres: this.selectedGenres(),
      studioOrNetwork: this.selectedStudiosOrNetworks(),
      keywords: this.selectedKeywords().map(kw => kw.id),
      country: this.selectedCountry(),
    };
    this.filterChange.emit(payload);
  }

  filterReset(): void {
    this.selectedCategory.set('Popular');
    this.selectedYear.set(0);
    this.selectedGenres.set([]);
    this.selectedStudiosOrNetworks.set(0);
    this.selectedKeywords.set([]);
    this.selectedCountry.set('');
    this.activeFiltersCount.set(0);
    this.updateFilter();
  }

  onGenreChange(event: any): void {
    if (event.value.some((genre: number) => genre === undefined)) {
      this.selectedGenres.set([]);
    } else {
      this.selectedGenres.set(event.value);
    }
    this.updateFilter();
  }

  onKeywordInput(query: string) {
    this.keywordInput.set(query);
    if (query.length >= 3) {
      this.tmdbService.searchKeyword(query).subscribe(response => {
        this.keywordResults.set(response.results);
      });
    } else {
      this.keywordResults.set([]);
    }
  }

  addKeywordFromSuggestion(keyword: { id: number; name: string }) {
    const exists = this.selectedKeywords().some(kw => kw.id === keyword.id);
    if (!exists) {
      this.selectedKeywords.update(current => [...current, keyword]);
    }

    this.keywordInput.set('');
    this.keywordResults.set([]);
    this.updateFilter();
  }

  removeKeyword(keywordId: number) {
    this.selectedKeywords.update(keywords => keywords.filter(kw => kw.id !== keywordId));
    this.updateFilter();
  }

  async onCountryChange(event: any) {
    const newCountry = event.value;
    if (!newCountry) {
      this.selectedCountry.set('');
      this.updateFilter();
      return;
    }
    const previousCountry = this.selectedCountry();

    if (newCountry === 'JP' || newCountry === 'KR') {
      const countryName = newCountry === 'JP' ? 'Japan' : 'Korea';
      const confirmed = confirm(
        `Notice\n\nSome content from ${countryName} may not be properly marked as adult due to inconsistent tagging practices. As a result, we cannot guarantee filtering of all adult content. Please proceed with this in mind.`
      );

      if (!confirmed) {
        this.selectedCountry.set(previousCountry);
        return;
      }
    }

    this.selectedCountry.set(newCountry);
    this.updateFilter();
  }

  private checkViewport(): void {
    this.isMobile = window.innerWidth < 768;
  }

  getFirstSelectedGenre(): Genre | null {
    return this.genres.find(genre => this.selectedGenres().includes(genre.id)) || null;
  }

  private countActiveFilters(): number {
    let count = 0;

    if (this.selectedCategory() !== 'Popular') count++;
    if (this.selectedYear() !== 0) count++;
    if (this.selectedGenres().length > 0) count++;
    if (this.selectedStudiosOrNetworks() !== 0) count++;
    if (this.selectedKeywords().length > 0) count++;
    if (this.selectedCountry() !== '') count++;

    return count;
  }
}
