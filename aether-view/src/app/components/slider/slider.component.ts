import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, Input, OnInit } from '@angular/core';
import { Series } from '../../interfaces/series'; // Update path if needed
import 'swiper/element/bundle';
import { CommonModule } from '@angular/common';
import { TmdbService } from '../../services/tmdb.service';

@Component({
  selector: 'app-slider',
  standalone: true,
  imports:[CommonModule],
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SliderComponent implements OnInit {
  @Input() seriesList: Series[] = [];
  tmdbService = inject(TmdbService)

  // Swiper options
  swiperOptions = {
    slidesPerView: 1,
    spaceBetween: 10,
    breakpoints: {
      640: {
        slidesPerView: 2,
        spaceBetween: 15
      },
      768: {
        slidesPerView: 3,
        spaceBetween: 20
      },
      1024: {
        slidesPerView: 5,
        spaceBetween: 25
      }
    },
    freeMode: true,
  };

  ngOnInit(): void {
    if (!this.seriesList || this.seriesList.length === 0) {
      console.warn('SliderComponent: seriesList input is empty.');
    }
  }
}
