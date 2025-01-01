import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, Input } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../card/card.component';
import { TmdbService } from '../../services/tmdb.service';
import { Series } from '../../interfaces/series';
import { Movie } from '../../interfaces/movies';
import { Studio } from '../../../../public/assets/studios';
import { Genre } from '../../interfaces/common-interfaces';

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
  @Input() cardType: 'movieSeries' | 'person' | 'genreStudio' | 'studio' = 'movieSeries'; 
  @Input() imageField: string = 'poster_path'; 
  @Input() titleField: string = 'first_air_date'; 
  @Input() subtitleField: string = 'name'; 
  @Input() overviewField: string = 'overview';

  tmdbService = inject(TmdbService);
  router = inject(Router);

  onItemClicked(item: any): void {
    if (this.tmdbService.isSeries(item)) {
      this.router.navigate(['/tv', item.id]);
    } else if (this.tmdbService.isMovie(item)) {
      this.router.navigate(['/movie', item.id]);
    } else if (this.tmdbService.isGenre(item)) {
      this.router.navigate(['/genre', item.id]);
    } else {
      console.warn('Unknown item type:', item);
    }
  }

  swiperOptions = {
    slidesPerView: 1,
    spaceBetween: 10,
    breakpoints: {
      320: {
        slidesPerView: 2,
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
        slidesPerView: 15,
        spaceBetween: 10,
      },
      3440: {
        slidesPerView: 20,
        spaceBetween: 10,
      }
    },
    freeMode: true,
  };

  
}
