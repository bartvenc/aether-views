import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TmdbService } from '../../services/tmdb.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
})
export class CardComponent implements OnInit {
  @Input() imageUrl?: string | null = null;
  @Input() title?: string = '';
  @Input() subtitle?: string | null = null;
  @Input() type: 'movies' | 'series' | 'person' | 'genreStudio' | 'studio' = 'movies'; // Card type
  @Input() overview?: string | null = null; // Overview/Summary
  @Input() maxOverviewLength?: number = 100;
  @Input() item?: number | null = null; // ID of the item
  @Input() icon?: string | null = null; // Icon to display on the card
  @Input() index = 0;
  @Input() loading?: string = 'lazy';

  tmdbService = inject(TmdbService);
  router = inject(Router);

  isMobile = false;

  ngOnInit() {
    // Check mobile once instead of using media queries in template
    this.isMobile = window.innerWidth < 768;
  }

  getTruncatedText(text: string | null | undefined, maxLength: number | undefined): string {
    if (!text) return ''; // Handle null or undefined gracefully
    const length = maxLength ?? 100; // Default to 100 if maxLength is undefined
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  }
  onItemClicked(event: Event): void {
    let route: string[] = [];
    let queryParams = {};

    if (this.tmdbService.isSeries(this.item)) {
      route = ['/tv', this.item.id.toString()];
      this.tmdbService.markAsSeen('tv', this.item.id);
    } else if (this.tmdbService.isMovie(this.item)) {
      route = ['/movie', this.item.id.toString()];
      this.tmdbService.markAsSeen('movie', this.item.id);
    }

    // Handle ctrl/cmd click only for MouseEvent
    if (event instanceof MouseEvent && (event.ctrlKey || event.metaKey)) {
      const url = this.router.serializeUrl(
        this.router.createUrlTree(route, { queryParams })
      );
      window.open(url, '_blank');
    } else {
      this.router.navigate(route, { queryParams });
    }
  }

  isContentSeen(): boolean {
    if (this.tmdbService.isSeries(this.item) || this.tmdbService.isMovie(this.item)) {
      if (!this.item?.id) return false;
      return this.tmdbService.isContentSeen(this.type === 'movies' ? 'movie' : 'tv', this.item.id);
    }
    return false;
  }
}
