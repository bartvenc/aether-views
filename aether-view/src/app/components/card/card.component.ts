import { Component, inject, Input } from '@angular/core';
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
export class CardComponent {
  @Input() imageUrl?: string | null = null; 
  @Input() title?: string = ''; 
  @Input() subtitle?: string | null = null; 
  @Input() type: 'movieSeries' | 'person' | 'genreStudio' | 'studio' = 'movieSeries'; // Card type
  @Input() overview?: string | null = null; // Overview/Summary
  @Input() maxOverviewLength?: number = 100;
  @Input() item?: number | null = null; // ID of the item

  tmdbService = inject(TmdbService);
  router = inject(Router);

  getTruncatedText(text: string | null | undefined, maxLength: number): string {
    if (!text) return ''; // Handle null or undefined gracefully
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  onItemClicked(): void {
    console.log('Item clicked:', this.item);
    if (this.tmdbService.isSeries(this.item)) {
      this.router.navigate(['/tv', this.item.id]);
    } else if (this.tmdbService.isMovie(this.item)) {
      this.router.navigate(['/movie', this.item.id]);
    } else {
      console.warn('Unknown item type:', this.item);
    }
  }
}
