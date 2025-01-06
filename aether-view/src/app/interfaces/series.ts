import {
  ProductionCompany,
  ProductionCountry,
  SpokenLanguage,
  Video,
  Keyword,
  Person,
  ContentRating,
  Credits,
  RecommendationResponse,
  SimilarResponse,
  Image,
} from './common-interfaces';

export interface Episode {
  id: number;
  name: string;
  overview: string;
  vote_average: number;
  vote_count: number;
  air_date: string;
  episode_number: number;
  episode_type: string;
  production_code: string;
  runtime: number;
  season_number: number;
  show_id: number;
  still_path: string | null;
}

export interface Network {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
}

export interface Season {
  air_date: string;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  vote_average: number;
}

export interface Series {
  id: number;
  name: string;
  original_name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string;
  last_air_date?: string;
  homepage?: string;
  in_production?: boolean;
  languages?: string[];
  episode_run_time?: number[];
  number_of_episodes?: number;
  number_of_seasons?: number;
  origin_country?: string[];
  original_language?: string;
  overview?: string;
  popularity?: number;
  status?: string;
  tagline?: string;
  type?: string;
  vote_average?: number;
  vote_count?: number;
  adult?: boolean;
  credits?: Credits;

  created_by?: Person[];
  genres?: { id: number; name: string }[];
  genre_ids?: number[];
  networks?: Network[];
  production_companies?: ProductionCompany[];
  production_countries?: ProductionCountry[];
  seasons?: Season[];
  spoken_languages: SpokenLanguage[];

  last_episode_to_air?: Episode | null;
  next_episode_to_air?: Episode | null;

  images?: {
    backdrops?: Image[];
    logos?: Image[];
    posters?: Image[];
  };
  videos?: {
    results: Video[];
  };
  keywords?: {
    results?: Keyword[];
  };
  recommendations?: RecommendationResponse;
  similar?: SimilarResponse;
  content_ratings?: {
    results?: ContentRating[];
  };

  media_type?: 'tv';
}
