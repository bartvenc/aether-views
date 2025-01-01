import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

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

  getTruncatedText(text: string | null | undefined, maxLength: number): string {
    if (!text) return ''; // Handle null or undefined gracefully
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}
