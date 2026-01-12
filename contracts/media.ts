export interface MediaItem {
  id: string;
  title: string;
  thumbnail: string;
  description?: string;
}

export interface MediaResponse<T = MediaItem> {
  items: T[];
}
