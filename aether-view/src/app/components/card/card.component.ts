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


  onItemClicked(): void {
    console.log(this.type, ' Item clicked:', this.item);
    if (this.tmdbService.isSeries(this.item)) {
      this.router.navigate(['/tv', this.item.id]);
    } else if (this.tmdbService.isMovie(this.item)) {
      this.router.navigate(['/movie', this.item.id]);
    } else if (this.tmdbService.isGenre(this.item) && this.item.type === 'movie') {
      this.router.navigate(['/discover/movies'], { queryParams: { genre: this.item.id } });
    } else if (this.tmdbService.isGenre(this.item) && this.item.type === 'series') {
      this.router.navigate(['/discover/series'], { queryParams: { genre: this.item.id } });
    } else if (this.tmdbService.isStudio(this.item)) {
      this.router.navigate(['/discover/movies'], { queryParams: { studio: this.item.id } });
    } else if (this.tmdbService.isPerson(this.item) && this.type === 'person') {
      console.log('movie Person:', this.item);
      this.router.navigate(['/person', this.item.id]);
    } else {
      console.warn('Unknown item type:', this.item);
    }
  }
}
