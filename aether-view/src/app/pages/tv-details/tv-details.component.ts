import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TmdbService } from '../../services/tmdb.service';
import { Series } from '../../interfaces/series';
import 'swiper/element/bundle';
import { CommonModule, DatePipe } from '@angular/common';
import { SliderComponent } from '../../components/slider/slider.component';


@Component({
  standalone: true,
  selector: 'app-tv-details',
  imports: [CommonModule, SliderComponent, DatePipe],
  templateUrl: './tv-details.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TvDetailsComponent implements OnInit {

  tmdbService = inject(TmdbService);
  route = inject(ActivatedRoute);

  series = signal<Series | undefined>(undefined);

  constructor() { }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      this.getSeriesDetails(id);
    });
  }

  getSeriesDetails(id: number): void {
    this.tmdbService.getSeriesDetailsById(id).subscribe((data) => {
      console.log(data);
      this.series.set(data);
    });
  }

  getPosterUrl(path: string | null | undefined): string {
    return path ? `https://image.tmdb.org/t/p/w500${path}` : '';
  }

  getBackDrop(path: string | null | undefined): string {
    return path ? `https://image.tmdb.org/t/p/original${path}` : '';
  }

  getTrailerUrl(): string | null {
    const videos = this.series()?.videos?.results;
    return videos?.length ? `https://www.youtube.com/watch?v=${videos[0].key}` : null;
  }
}

