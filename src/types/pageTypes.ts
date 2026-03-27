// types/pageTypes.ts

export interface Page {
  title: string;
  slug: string;
  content: string;
  image: string | null;
}

export interface PagesResponse {
  code: number;
  message: string;
  data: Page[];
}
