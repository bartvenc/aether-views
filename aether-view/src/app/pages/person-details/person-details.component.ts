import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { TmdbService } from '@services/tmdb.service';
import { Person } from '@interfaces/common-interfaces';
import { Movie } from '@interfaces/movies';
import { Series } from '@interfaces/series';
import { CardComponent } from '@components/card/card.component';

@Component({
  selector: 'app-person-details',
  standalone: true,
  imports: [CardComponent],
  templateUrl: './person-details.component.html',
})
export class PersonDetailsComponent implements OnInit, OnDestroy {
  protected readonly route = inject(ActivatedRoute);
  protected readonly tmdbService = inject(TmdbService);

  person = signal<Person | null>(null);
  movies = signal<Movie[]>([]);
  series = signal<Series[]>([]);

  private backdropInterval: any;
  currentBackdropIndex = signal<number>(0);
  isBioExpanded = signal<boolean>(false);
  allBackdrops = signal<string[]>([]);

  ngOnInit(): void {
    const personId = this.route.snapshot.params['id'];

    // Fetch person details
    this.tmdbService.getPersonDetails(personId).subscribe(person => {
      this.person.set(person);
    });

    // Fetch combined credits and split into movies and series
    this.tmdbService.getPersonCombinedCredits(personId).subscribe(credits => {
      const movies = credits.filter(credit => credit.media_type === 'movie') as Movie[];
      const series = credits.filter(credit => credit.media_type === 'tv') as Series[];
      this.movies.set(movies);
      this.series.set(series);

      // Collect all backdrop images
      const backdrops = [...movies.map(m => m.backdrop_path), ...series.map(s => s.backdrop_path)].filter(backdrop => backdrop != null);

      this.allBackdrops.set(backdrops);
      this.startBackdropRotation();
    });
  }

  ngOnDestroy(): void {
    if (this.backdropInterval) {
      clearInterval(this.backdropInterval);
    }
  }

  private startBackdropRotation(): void {
    this.backdropInterval = setInterval(() => {
      const nextIndex = (this.currentBackdropIndex() + 1) % this.allBackdrops().length;
      this.currentBackdropIndex.set(nextIndex);
    }, 3000);
  }

  get currentBackdrop(): string | null {
    const backdrops = this.allBackdrops();
    return backdrops.length > 0 ? this.tmdbService.getBackDrop(backdrops[this.currentBackdropIndex()]) : this.backdropImage;
  }

  toggleBio(): void {
    this.isBioExpanded.update(current => !current);
  }

  get backdropImage(): string | null {
    return this.person()?.profile_path ? this.tmdbService.getPosterUrl(this.person()?.profile_path) : null;
  }

  get hasMovies(): boolean {
    return this.movies().length > 0;
  }

  get hasSeries(): boolean {
    return this.series().length > 0;
  }
}
