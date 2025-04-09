export interface AggregatedClick {
  itemId: number;
  itemType: string;
  clickCount: number;
}

export interface PopularContent {
  id: number;
  title?: string;
  name?: string;
  media_type: 'movie' | 'tv';
  poster_path?: string;
  release_date?: string;
  first_air_date?: string;
  clickCount: number;
}