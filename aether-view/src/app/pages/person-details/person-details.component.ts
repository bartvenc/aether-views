import { Component, OnInit, inject, Signal, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TmdbService } from '../../services/tmdb.service';
import { Person } from '../../interfaces/common-interfaces';
import { Movie } from '../../interfaces/movies';
import { Series } from '../../interfaces/series';
import { CardComponent } from '../../components/card/card.component';
import { SlicePipe } from '@angular/common';

@Component({
  selector: 'app-person-details',
  standalone: true,
  imports: [CardComponent, SlicePipe],
  templateUrl: './person-details.component.html',
})
export class PersonDetailsComponent implements OnInit {
  route = inject(ActivatedRoute);
  tmdbService = inject(TmdbService);

  person = signal<Person | null>(null);
  movies = signal<Movie[]>([]);
  series = signal<Series[]>([]);

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
    });
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
