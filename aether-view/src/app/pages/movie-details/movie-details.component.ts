import { CommonModule, DatePipe } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { SliderComponent } from '@components/slider/slider.component';
import { TmdbService } from '@services/tmdb.service';

import { Movie } from '../../interfaces/movies';

@Component({
  selector: 'app-movie-details',
  standalone: true,
  imports: [CommonModule, SliderComponent, DatePipe],
  templateUrl: './movie-details.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MovieDetailsComponent implements OnInit {
  protected readonly tmdbService = inject(TmdbService);
  protected readonly router = inject(Router);
  protected readonly route = inject(ActivatedRoute);

  movie = signal<Movie | undefined>(undefined);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      this.getMovieDetails(id);
    });
  }

  getMovieDetails(id: number): void {
    this.tmdbService.getMovieDetailsById(id).subscribe(data => {
      this.movie.set(data);
    });
  }
  stringifyKeyword(keyword: any): string {
    return JSON.stringify(keyword);
  }

  handleClick(event: MouseEvent, type: 'genre' | 'keyword', item: any) {
    event.preventDefault();
    const route = ['/discover', 'movies'];
    const queryParams = type === 'genre' ? { genre: item.id } : { keyword: this.stringifyKeyword(item) };
    
    if (event.ctrlKey || event.metaKey) {
      const url = this.router.serializeUrl(
        this.router.createUrlTree(route, { queryParams })
      );
      window.open(url, '_blank');
    } else {
      this.router.navigate(route, { queryParams });
    }
  }
}
