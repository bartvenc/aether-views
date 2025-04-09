import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { CardComponent } from '@components/card/card.component';
import { FormsModule } from '@angular/forms';
import { AnalyticsService } from '@services/analytics.service';
import { PopularContent } from '@app/interfaces/analytics';
import { TmdbService } from '@services/tmdb.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, MatButtonToggleModule, CardComponent, FormsModule],
  templateUrl: './analytics.component.html',
  styles: [`
    .analytics-container {
      padding: 1rem;
    }
    
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 2rem;
    }
    
    .results-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 1rem;
    }
    
    @media (min-width: 768px) {
      .results-container {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      }
    }

    .section-title {
      @apply text-2xl font-bold mb-6;
    }
    
    .content-count {
      position: absolute;
      top: 8px;
      right: 8px;
      background-color: rgba(32, 26, 35, 0.8);
      color: white;
      border-radius: 9999px;
      padding: 0.25rem 0.5rem;
      font-weight: 600;
    }
  `]
})
export class AnalyticsComponent implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);
  readonly tmdbService = inject(TmdbService)
  
  readonly popularContent = signal<PopularContent[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly selectedType = signal<string>('all');
  readonly selectedTimeRange = signal<string>('week');
  
  ngOnInit(): void {
    this.fetchAnalytics();
  }
  
  updateFilter(): void {
    this.fetchAnalytics();
  }
  
  fetchAnalytics(): void {
    this.isLoading.set(true);
    
    this.analyticsService.getClickStatistics(
      this.selectedType() === 'all' ? undefined : this.selectedType(), 
      this.selectedTimeRange()
    ).subscribe({
      next: (data) => {
        // Sort by click count (descending)
        this.popularContent.set(data.sort((a, b) => b.clickCount - a.clickCount));
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching analytics data:', err);
        this.isLoading.set(false);
      }
    });
  }
  
  getContentTypeBadge(type: string): string {
    return type === 'movie' ? 'theaters' : 'live_tv';
  }
}
