import { Component, inject, HostListener } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { TmdbService } from '../../services/tmdb.service';
import { SearchResult, MediaType } from '../../interfaces/common-interfaces';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, MatMenuModule, MatIconModule, MatButtonModule, MatInputModule, FormsModule],
  templateUrl: './header.component.html',
  styles: [
    `
      .search-input {
        @apply w-full bg-[#201a23] text-gray-300 px-4 py-2 pr-10 rounded-lg focus:outline-none placeholder-gray-500;
      }

      .result-card {
        @apply relative cursor-pointer aspect-[2/3] rounded-lg overflow-hidden bg-[#28202b];
      }

      .media-icon {
        @apply absolute top-2 right-2 z-10 text-xl text-yellow-400 drop-shadow-lg;
      }

      .result-title {
        @apply absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2;
      }
    `,
  ],
})
export class HeaderComponent {
  searchQuery = '';
  searchResults: SearchResult[] = [];
  private searchSubject = new Subject<string>();
  readonly tmdbService = inject(TmdbService);
  readonly router = inject(Router);
  isMobile = window.innerWidth < 768;
  isSearchOpen = false;
  isHovered = false;
  isInputFocused = false;
  selectedIndex = -1;

  @HostListener('window:resize')
  onResize() {
    this.isMobile = window.innerWidth < 768;
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    if (!this.searchResults.length) return;

    switch (event.key) {
      case 'ArrowDown':
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.searchResults.length - 1);
        event.preventDefault();
        break;
      case 'ArrowUp':
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        event.preventDefault();
        break;
      case 'Enter':
        if (this.selectedIndex >= 0) {
          this.navigateTo(this.searchResults[this.selectedIndex]);
          event.preventDefault();
        }
        break;
      case 'Escape':
        this.clearSearch();
        event.preventDefault();
        break;
    }
  }

  constructor() {
    this.setupSearch();
  }

  private setupSearch() {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => (query ? this.tmdbService.searchMulti(query) : []))
      )
      .subscribe({
        next: results => {
          this.searchResults = results;
          this.selectedIndex = -1;
        },
        error: error => {
          console.error('Search error:', error);
          this.searchResults = [];
        },
      });
  }

  onSearchChange(query: string) {
    this.searchSubject.next(query);
  }

  onClickOutside() {
    if (!this.isHovered && !this.isInputFocused) {
      this.clearSearch();
    }
  }

  toggleSearch() {
    this.isSearchOpen = !this.isSearchOpen;
    if (!this.isSearchOpen) {
      this.searchResults = [];
      this.searchQuery = '';
    }
  }

  clearSearch() {
    this.searchResults = [];
    this.searchQuery = '';
    this.isSearchOpen = false;
    this.isInputFocused = false;
  }

  onInputFocus() {
    this.isInputFocused = true;
    this.isSearchOpen = true;
  }

  onInputBlur() {
    this.isInputFocused = false;
  }

  navigateTo(result: SearchResult) {
    const id = result.id;
    if (result.media_type === 'movie') {
      this.router.navigate([`/movie/${id}`]);
    } else if (result.media_type === 'tv') {
      this.router.navigate([`/tv/${id}`]);
    } else if (result.media_type === 'person') {
      this.router.navigate([`/person/${id}`]);
    }
    this.toggleSearch();
  }

  getMediaIcon(mediaType: MediaType): string {
    const icons: Record<MediaType, string> = {
      movie: 'theaters',
      tv: 'live_tv',
      person: 'person',
    };
    return icons[mediaType] || 'help';
  }

  getMediaType(mediaType: MediaType): string {
    const types: Record<MediaType, string> = {
      movie: 'Movie',
      tv: 'TV Show',
      person: 'Person',
    };
    return types[mediaType] || 'Unknown';
  }

  shouldShowSearchInput(): boolean {
    return this.isHovered || this.isInputFocused || !!this.searchQuery;
  }
}
