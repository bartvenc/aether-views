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


@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [   CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule],
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

  tmdbService = inject(TmdbService);
  router = inject(Router);

  selectedCategory = signal('Popular');
  selectedYear = signal(0);
  selectedGenres = signal<number[]>([]);
  selectedStudiosOrNetworks = signal(0);
  keywordInput = signal('');
  keywordResults = signal<{ id: number; name: string }[]>([]);
  selectedKeywords = signal<{ id: number; name: string }[]>([]);
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

    this.updateFilter();
  }

  updateFilter() {
    if (this.selectedCategory() === 'New' && this.selectedYear() === 0) {
      this.selectedYear.set(new Date().getFullYear());
    }
  
    const newType = this.selectedTypeSignal();
    if (newType !== this.type) {
      this.router.navigate([`/discover/${newType}`], { queryParams: this.filters });
    } else {
      this.filterChange.emit({
        type: this.selectedTypeSignal(),
        category: this.selectedCategory(),
        year: this.selectedYear(),
        genres: this.selectedGenres(),
        studioOrNetwork: this.selectedStudiosOrNetworks(),
        keywords: this.selectedKeywords().map(kw => kw.id),
      });
      console.log('Filter from filter component updated:', {
        type: this.selectedTypeSignal(),
        category: this.selectedCategory(),
        year: this.selectedYear(),
        genres: this.selectedGenres(),
        keyword: this.selectedKeywords(),
        studioOrNetwork: this.selectedStudiosOrNetworks(),
      });
    }
  }

  onGenreChange(event: any) {
    // event.value is an array of selected IDs
    this.selectedGenres.set(event.value);
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

  addKeyword(keyword: { id: number; name: string }) {
    const exists = this.selectedKeywords().some(kw => kw.id === keyword.id);
    if (!exists) {
      this.selectedKeywords.update(current => [...current, keyword]);
      this.keywordInput.set('');
      this.keywordResults.set([]);
      this.updateFilter();
    }
  }

  removeKeyword(keywordId: number) {
    this.selectedKeywords.update(keywords => keywords.filter(kw => kw.id !== keywordId));
    this.updateFilter();
  }

  private checkViewport(): void {
    this.isMobile = window.innerWidth < 768; 
  }
  
}
