import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
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
export class FilterComponent {
  @Input() type: 'movies' | 'series' = 'movies'; // Default type
  @Input() genres: Genre[] = [];
  @Input() years: number[] = [];
  @Input() studiosOrNetworks: Studio[] | Network[] = [];
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
    });
    console.log('Filter from filter component updated:', {
      type: this.type,
      category: this.selectedCategory(),
      year: this.selectedYear(),
      genres: this.selectedGenres(),
      keyword: this.selectedKeywords().map(kw => kw.id),
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
