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


  onItemClicked(event: MouseEvent): void {
    let route: string[] = [];
    let queryParams = {};
   
    // Determine the route and params based on item type
    if (this.tmdbService.isSeries(this.item)) {
      route = ['/tv', this.item.id.toString()];
    } else if (this.tmdbService.isMovie(this.item)) {
      route = ['/movie', this.item.id.toString()];
    } else if (this.tmdbService.isGenre(this.item)) {
      route = ['/discover', this.item.type === 'movie' ? 'movies' : 'series'];
      queryParams = { genre: this.item.id };
    } else if (this.tmdbService.isStudio(this.item)) {
      route = ['/discover/movies'];
      queryParams = { studio: this.item.id };
    } else if (this.tmdbService.isPerson(this.item)) {
      route = ['/person', this.item.id.toString()];
    }

    // Generate the full URL
    const url = this.router.serializeUrl(
      this.router.createUrlTree(route, { queryParams })
    );

    // Open in new tab if ctrl/cmd key is pressed, otherwise navigate normally
    if (event.ctrlKey || event.metaKey) {
      window.open(url, '_blank');
    } else {
      this.router.navigate(route, { queryParams });
    }
  }
}
