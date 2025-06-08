export interface Book {
  id: number;
  title: string;
  author: string;
  publication_year: number;
  isbn: string;
  created_at: Date;
  updated_at: Date;
}

export interface BookCreateInput {
  title: string;
  author: string;
  publication_year: number;
  isbn: string;
}

export interface BookUpdateInput {
  title?: string;
  author?: string;
  publication_year?: number;
  isbn?: string;
}

export interface BookSearchParams {
  title?: string;
  author?: string;
  publication_year?: number;
  limit?: number;
  offset?: number;
}

export interface BookCountByYear {
  publication_year: number;
  count: number;
}
