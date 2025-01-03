import { CommonModule, DatePipe } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, signal } from '@angular/core';
import { SliderComponent } from '../../components/slider/slider.component';
import { TmdbService } from '../../services/tmdb.service';
import { ActivatedRoute } from '@angular/router';
import { Movie } from '../../interfaces/movies';

@Component({
  selector: 'app-movie-details',
  standalone: true,
  imports: [CommonModule, SliderComponent, DatePipe],
  templateUrl: './movie-details.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MovieDetailsComponent implements OnInit {
  tmdbService = inject(TmdbService);
  route = inject(ActivatedRoute);

  movie = signal<Movie | undefined>(undefined);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      this.getMovieDetails(id);
    });
  }

  getMovieDetails(id: number): void {
    this.tmdbService.getMovieDetailsById(id).subscribe(data => {
      console.log(data);
      this.movie.set(data);
    });
  }
}
