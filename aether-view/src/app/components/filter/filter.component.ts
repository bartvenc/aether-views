import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output, signal, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Network } from '../../interfaces/series';
import { Studio } from '../../../../public/assets/studios';
import { Genre } from '../../interfaces/common-interfaces';
import { TmdbService } from '../../services/tmdb.service';

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './filter.component.html',
})
export class FilterComponent implements OnInit {
  @Input() type: 'movies' | 'series' = 'movies'; // Default type
  @Input() genres: Genre[] = [];
  @Input() years: number[] = [];
  @Input() studiosOrNetworks: Studio[] | Network[] = [];
  @Input() filters: Record<string, any> = {};
  @Output() filterChange = new EventEmitter<any>();

  tmdbService = inject(TmdbService);

  selectedCategory = signal('Popular');
  selectedYear = signal(0);
  selectedGenres = signal<number[]>([]);
  selectedStudiosOrNetworks = signal(0);
  keywordInput = signal('');
  keywordResults = signal<{ id: number; name: string }[]>([]);
  selectedKeywords = signal<{ id: number; name: string }[]>([]);
  genreDropdownOpen = signal<boolean>(false);
  selectedType = signal('movies');

  ngOnInit() {
    console.log(' 5 Filter component initialized with:', this.filters);
    this.selectedType.set(this.type);
    this.selectedCategory.set(this.filters['category'] || 'Popular');
    this.selectedYear.set(this.filters['year'] || 0);
    this.selectedGenres.set(this.filters['genres'] || []);
    this.selectedStudiosOrNetworks.set(this.filters['studiosOrNetworks'] || 0);
    const keywordParam = this.filters['keyword'] ? [this.filters['keyword']] : [];
    this.selectedKeywords.set(keywordParam);
    console.log('  6 Filter component initialized after with:', {
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

    this.filterChange.emit({
      category: this.selectedCategory(),
      year: this.selectedYear(),
      genres: this.selectedGenres(),
      studioOrNetwork: this.selectedStudiosOrNetworks(),
      keywords: this.selectedKeywords().map(kw => kw.id),
      type: this.selectedType(),
    });
    console.log('Filter from filter component updated:', {
      type: this.type,
      category: this.selectedCategory(),
      year: this.selectedYear(),
      genres: this.selectedGenres(),
      keyword: this.selectedKeywords(),
      studioOrNetwork: this.selectedStudiosOrNetworks(),
    });
  }

  toggleGenreDropdown() {
    this.genreDropdownOpen.update(state => !state);
  }

  updateSelectedGenres(genreId: number, isChecked: boolean) {
    this.selectedGenres.update(currentGenres => {
      if (isChecked) {
        return [...currentGenres, genreId];
      } else {
        return currentGenres.filter(id => id !== genreId);
      }
    });
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
    if (!this.selectedKeywords().find(kw => kw.id === keyword.id)) {
      this.selectedKeywords.update(keywords => [...keywords, keyword]);
      this.updateFilter();
    }
    this.keywordResults.set([]); // Clear results after selection
    this.keywordInput.set(''); // Clear input
  }

  removeKeyword(keywordId: number) {
    this.selectedKeywords.update(keywords => keywords.filter(kw => kw.id !== keywordId));
    this.updateFilter();
  }
}
