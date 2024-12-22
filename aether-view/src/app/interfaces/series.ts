export interface Person {
  id: number;
  credit_id: string;
  name: string;
  original_name: string;
  gender: number;
  profile_path: string | null;
}

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

export interface ProductionCompany {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
}

export interface ProductionCountry {
  iso_3166_1: string;
  name: string;
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

export interface SpokenLanguage {
  english_name: string;
  iso_639_1: string;
  name: string;
}

export interface Video {
  iso_639_1: string;
  iso_3166_1: string;
  name: string;
  key: string;
  site: string;
  size: number;
  type: string;
  official: boolean;
  published_at: string;
  id: string;
}

export interface Keyword {
  id: number;
  name: string;
}

export interface ContentRating {
  descriptors: string[];
  iso_3166_1: string;
  rating: string;
}

export interface RecommendationResponse {
  page: number;
  results: Series[];
  total_pages: number;
  total_results: number;
}

export interface SimilarResponse {
  page: number;
  results: Series[];
  total_pages: number;
  total_results: number;
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
  credits?: {
    cast?: { results: Person[]; }
    crew?: { results: Person[]; }
  };

  created_by?: Person[];
  genres?: { id: number; name: string; }[];
  genre_ids?: number[];
  networks?: Network[];
  production_companies?: ProductionCompany[];
  production_countries?: ProductionCountry[];
  seasons?: Season[];
  spoken_languages: SpokenLanguage[];

  last_episode_to_air?: Episode | null;
  next_episode_to_air?: Episode | null;

  images?: {
    backdrops?: any[];
    logos?: any[];
    posters?: any[];
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
}