import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../card/card.component';
import { TmdbService } from '../../services/tmdb.service';

@Component({
  selector: 'app-slider',
  standalone: true,
  imports: [CommonModule, CardComponent],
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SliderComponent {
  @Input() items: any[] = [];
  @Input() cardType: 'movies' | 'series' | 'person' | 'genreStudio' | 'studio' = 'movies';
  @Input() imageField = 'poster_path';
  @Input() titleField = 'first_air_date';
  @Input() subtitleField = 'name';
  @Input() overviewField = 'overview';
  isMobile = false;

  tmdbService = inject(TmdbService);

  ngOnInit(): void {
    this.isMobile = window.matchMedia('(max-width: 768px)').matches;
  }

  swiperOptions = {
    slidesPerView: 5,
    spaceBetween: 20,
    breakpoints: {
      320: {
        slidesPerView: 3,
        spaceBetween: 10,
      },
      480: {
        slidesPerView: 3,
        spaceBetween: 10,
      },
      640: {
        slidesPerView: 4,
        spaceBetween: 10,
      },
      768: {
        slidesPerView: 5,
        spaceBetween: 10,
      },
      1024: {
        slidesPerView: 8,
        spaceBetween: 10,
      },
      1440: {
        slidesPerView: 10,
        spaceBetween: 10,
      },
      2560: {
        slidesPerView: 13,
        spaceBetween: 10,
      },
      3440: {
        slidesPerView: 17,
        spaceBetween: 10,
      },
    },
    freeMode: true,
  };
}
