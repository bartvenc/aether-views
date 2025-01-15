import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { TmdbService } from '../../services/tmdb.service';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink,
    MatMenuModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    FormsModule,
    ClickOutsideDirective
  ],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  searchQuery = ''; // Placeholder for the search input value
  searchResults: any[] = [];
  private searchSubject = new Subject<string>();
  tmdbService = inject(TmdbService);
  router = inject(Router);

  constructor() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => this.tmdbService.searchMulti(query))
    ).subscribe(results => this.searchResults = results);
  }

  onSearchChange(query: string) {
    this.searchSubject.next(query);
  }

  toggleSearch() {
    this.searchResults = [];
    this.searchQuery = '';
  }

  clearResults() {
    this.searchResults = [];
  }

  navigateTo(result: any) {
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

  getMediaIcon(mediaType: string): string {
    switch (mediaType) {
      case 'movie':
        return 'theaters';
      case 'tv':
        return 'live_tv';
      case 'person':
        return 'person';
      default:
        return 'help';
    }
  }

  getMediaType(mediaType: string): string {
    switch (mediaType) {
      case 'movie':
        return 'Movie';
      case 'tv':
        return 'TV Show';
      case 'person':
        return 'Person';
      default:
        return 'Unknown';
    }
  }

  
}
