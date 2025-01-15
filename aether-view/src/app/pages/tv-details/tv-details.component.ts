import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TmdbService } from '../../services/tmdb.service';
import { Series, Season, Episode } from '../../interfaces/series';
import { CommonModule, DatePipe } from '@angular/common';
import { SliderComponent } from '../../components/slider/slider.component';
import { forkJoin } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-tv-details',
  imports: [CommonModule, SliderComponent, DatePipe, RouterLink],
  templateUrl: './tv-details.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TvDetailsComponent implements OnInit {
  tmdbService = inject(TmdbService);
  route = inject(ActivatedRoute);

  series = signal<Series | undefined>(undefined);
  openSeasons: Set<number> = new Set();
  allSeasonsOpen = false;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (!id) {
        console.error('Invalid series ID');
        return;
      }
      this.getSeriesDetails(id);
    });
  }

  getSeriesDetails(id: number): void {
    this.tmdbService.getSeriesDetailsById(id).subscribe((seriesData: Series) => {
      if (!seriesData || !seriesData.seasons) {
        console.error('Invalid or missing series data');
        return;
      }
  
      // Order seasons by most recent air_date (descending)
      const orderedSeasons = [...seriesData.seasons].sort((a, b) =>
        new Date(b.air_date || '').getTime() - new Date(a.air_date || '').getTime()
      );
  
      // Update the series data with ordered seasons
      this.series.set({
        ...seriesData,
        seasons: orderedSeasons,
      });
  
      // Fetch detailed episode data for all seasons
      const seasonRequests = orderedSeasons.map((season) =>
        this.tmdbService.getSeasonDetails(id, season.season_number)
      );
  
      forkJoin(seasonRequests).subscribe({
        next: (seasonDetails: Season[]) => {
          this.series.update((currentSeries) => {
            if (!currentSeries) return currentSeries;
  
            return {
              ...currentSeries,
              seasons: seasonDetails.map((season) => ({
                ...season,
                // Order episodes by most recent air_date (descending)
                episodes: [...(season.episodes || [])].sort((a, b) =>
                  new Date(b.air_date || '').getTime() - new Date(a.air_date || '').getTime()
                ),
              })),
            };
          });
        },
        error: (error) => console.error('Error fetching season details:', error),
      });
    });
  }

  toggleSeason(seasonId: number): void {
    if (this.openSeasons.has(seasonId)) {
      this.openSeasons.delete(seasonId);
    } else {
      this.openSeasons.add(seasonId);
    }
  }
  stringifyKeyword(keyword: any): string {
    return JSON.stringify(keyword);
  }
  isSeasonOpen(seasonId: number): boolean {
    return this.openSeasons.has(seasonId);
  }

  toggleAllSeasons(): void {
    this.allSeasonsOpen = !this.allSeasonsOpen;
    if (!this.allSeasonsOpen) {
      this.openSeasons.clear();
    }
  }

  isEpisodeAired(airDate: string | undefined): boolean {
    if (!airDate) return false;
    const today = new Date();
    return new Date(airDate) <= today;
  }

  isSeasonFinished(season: any): boolean {
    console.log(season);
    if (season.episodes) {
      const airDate = season.episodes[0]?.air_date;
      if (!airDate) return false;

      const today = new Date();
      return new Date(airDate) <= today;
    }
    return false;
  }
}
