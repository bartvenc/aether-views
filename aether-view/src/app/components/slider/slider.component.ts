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
  @Input() cardType: 'movieSeries' | 'person' | 'genreStudio' = 'movieSeries'; 
  @Input() imageField: string = 'poster_path'; 
  @Input() titleField: string = 'first_air_date'; 
  @Input() subtitleField: string = 'name'; 
  @Input() overviewField: string = 'overview';

  tmdbService = inject(TmdbService);

  swiperOptions = {
    slidesPerView: 1,
    spaceBetween: 10,
    breakpoints: {
      640: {
        slidesPerView: 2,
        spaceBetween: 15,
      },
      768: {
        slidesPerView: 3,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 5,
        spaceBetween: 25,
      },
    },
    freeMode: true,
  };
}
