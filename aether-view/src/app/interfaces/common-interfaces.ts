import { Movie } from './movies';
import { Series } from './series';

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

export interface Genre {
  id: number;
  name: string;
  posterUrl?: string;
}

export interface Images {
  backdrops: Image[];
  logos: Image[];
  posters: Image[];
}

export interface Image {
  aspect_ratio?: number;
  file_path: string;
  height?: number;
  iso_639_1?: string;
  vote_average?: number;
  vote_count?: number;
  width?: number;
}

export interface KeywordsResult {
  results: Keyword[];
}

export interface VideoResult {
  results: Video[];
}

export interface Keyword {
  id: number;
  name: string;
}

export interface Person {
  id: number;
  credit_id: string;
  name: string;
  original_name: string;
  gender: number;
  profile_path: string | null;
  character: string;
}

export interface ContentRating {
  descriptors: string[];
  iso_3166_1: string;
  rating: string;
}

export interface Cast {
  adult: boolean;
  gender: number;
  id: number;
  known_for_department: string;
  name: string;
  original_name: string;
  popularity: number;
  profile_path: string | null;
  cast_id: number;
  character: string;
  credit_id: string;
  order: number;
}

export interface Crew {
  adult: boolean;
  gender: number;
  id: number;
  known_for_department: string;
  name: string;
  original_name: string;
  popularity: number;
  profile_path: string | null;
  credit_id: string;
  department: string;
  job: string;
}

export interface Credits {
  cast: Cast[];
  crew: Crew[];
}

export interface RecommendationResponse {
  page: number;
  results: Series[] | Movie[];
  total_pages: number;
  total_results: number;
}

export interface SimilarResponse {
  page: number;
  results: Series[] | Movie[];
  total_pages: number;
  total_results: number;
}
