import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { TmdbService } from '@services/tmdb.service';
import { Series } from '@app/interfaces/series';
import { Movie } from '@app/interfaces/movies';


@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
})
export class CardComponent implements OnInit {
  @Input() imageUrl?: string | null = null;
  @Input() title?: string = '';
  @Input() subtitle?: string | null = null;
  @Input() type: 'movies' | 'series' | 'person' | 'genreStudio' | 'studio' | 'network' = 'movies';
  @Input() overview?: string | null = null;
  @Input() maxOverviewLength?: number = 100;
  @Input() item?: number | Series | Movie | null = null;
  @Input() icon?: string | null = null;
  @Input() index = 0;
  @Input() loading?: string = 'lazy';

  protected readonly tmdbService = inject(TmdbService);
  protected readonly router = inject(Router);

  isMobile = false;

  ngOnInit() {

    this.isMobile = window.innerWidth < 768;
  }

  getTruncatedText(text: string | null | undefined, maxLength: number | undefined): string {
    if (!text) return '';
    const length = maxLength ?? 100;
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  }
  onItemClicked(event: Event): void {
    let route: string[] = [];
    let queryParams = {};
    if (this.tmdbService.isSeries(this.item)) {
      route = ['/tv', this.item.id.toString()];
      this.tmdbService.markAsSeen('tv', this.item.id);
    } else if (this.tmdbService.isMovie(this.item)) {
      route = ['/movie', this.item.id.toString()];
      this.tmdbService.markAsSeen('movie', this.item.id);
    } else if (this.tmdbService.isGenre(this.item)) {
      route = ['/discover', this.item.type === 'movie' ? 'movies' : 'series'];
      queryParams = { genre: this.item.id };
    } else if (this.type === 'studio' && this.tmdbService.isStudio(this.item)) {
      route = ['/discover/movies'];
      queryParams = { studio: this.item.id };
    } else if (this.type === 'network'  && this.tmdbService.isNetwork(this.item)) {
      route = ['/discover/series'];
      queryParams = { studio: this.item.id };
    } else if (this.tmdbService.isPerson(this.item)) {
      route = ['/person', this.item.id.toString()];
    }

    if (event instanceof MouseEvent && (event.ctrlKey || event.metaKey)) {
      const url = this.router.serializeUrl(
        this.router.createUrlTree(route, { queryParams })
      );
      window.open(url, '_blank');
    } else {
      this.router.navigate(route, { queryParams });
    }
  }

  isContentSeen(): boolean {
    if (this.tmdbService.isSeries(this.item) || this.tmdbService.isMovie(this.item)) {
      if (!this.item?.id) return false;
      return this.tmdbService.isContentSeen(this.type === 'movies' ? 'movie' : 'tv', this.item.id);
    }
    return false;
  }
}
