import {
  ProductionCompany,
  ProductionCountry,
  SpokenLanguage,
  Image,
  Genre,
  VideoResult,
  Credits,
  RecommendationResponse,
  SimilarResponse,
  Keyword,
} from './common-interfaces';

export interface BelongsToCollection {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

export interface Movie {
  adult: boolean;
  backdrop_path: string | null;
  belongs_to_collection: BelongsToCollection | null;
  budget: number;
  genres: Genre[];
  homepage: string | null;
  id: number;
  imdb_id: string | null;
  origin_country: string[];
  original_language: string;
  original_title: string;
  overview: string | null;
  popularity: number;
  poster_path: string | null;
  production_companies: ProductionCompany[];
  production_countries: ProductionCountry[];
  release_date: string;
  revenue: number;
  runtime: number | null;
  spoken_languages: SpokenLanguage[];
  status: string;
  tagline: string | null;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
  images: Image;
  keywords?: {
    keywords?: Keyword[];
  };
  videos: VideoResult;
  credits: Credits;
  recommendations?: RecommendationResponse;
  similar?: SimilarResponse;
}
