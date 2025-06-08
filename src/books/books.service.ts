import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  Book,
  BookCreateInput,
  BookUpdateInput,
  BookSearchParams,
  BookCountByYear,
} from './interfaces/book.interface';
import {
  BookNotFoundException,
  DuplicateISBNException,
  DatabaseException,
} from '../common/exceptions/database.exception';

@Injectable()
export class BooksService {
  private readonly logger = new Logger(BooksService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async create(bookData: BookCreateInput): Promise<Book> {
    try {
      const query = `
        INSERT INTO books (title, author, publication_year, isbn)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const values = [
        bookData.title,
        bookData.author,
        bookData.publication_year,
        bookData.isbn,
      ];

      const result = await this.databaseService.query<Book>(query, values);

      if (result.rows.length === 0) {
        throw new DatabaseException('Failed to create book');
      }

      this.logger.log(`Book created with ID: ${result.rows[0].id}`);
      return result.rows[0];
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        'constraint' in error &&
        error.code === '23505' &&
        error.constraint === 'books_isbn_key'
      ) {
        throw new DuplicateISBNException(bookData.isbn);
      }
      this.logger.error('Error creating book', error);
      throw new DatabaseException('Failed to create book');
    }
  }

  async findAll(searchParams?: BookSearchParams): Promise<Book[]> {
    try {
      let query = `
        SELECT * FROM books
        WHERE 1=1
      `;

      const values: any[] = [];
      let paramIndex = 1;

      // Add search filters
      if (searchParams?.title) {
        query += ` AND title ILIKE $${paramIndex}`;
        values.push(`%${searchParams.title}%`);
        paramIndex++;
      }

      if (searchParams?.author) {
        query += ` AND author ILIKE $${paramIndex}`;
        values.push(`%${searchParams.author}%`);
        paramIndex++;
      }

      if (searchParams?.publication_year) {
        query += ` AND publication_year = $${paramIndex}`;
        values.push(searchParams.publication_year);
        paramIndex++;
      }

      // Add ordering and pagination
      query += ' ORDER BY created_at DESC';

      if (searchParams?.limit) {
        query += ` LIMIT $${paramIndex}`;
        values.push(searchParams.limit);
        paramIndex++;
      }

      if (searchParams?.offset) {
        query += ` OFFSET $${paramIndex}`;
        values.push(searchParams.offset);
      }

      const result = await this.databaseService.query<Book>(query, values);
      return result.rows;
    } catch (error) {
      this.logger.error('Error finding books', error);
      throw new DatabaseException('Failed to retrieve books');
    }
  }

  async findById(id: number): Promise<Book> {
    try {
      const query = 'SELECT * FROM books WHERE id = $1';
      const result = await this.databaseService.query<Book>(query, [id]);

      if (result.rows.length === 0) {
        throw new BookNotFoundException(id);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof BookNotFoundException) {
        throw error;
      }
      this.logger.error(`Error finding book with ID ${id}`, error);
      throw new DatabaseException('Failed to retrieve book');
    }
  }

  async update(id: number, updateData: BookUpdateInput): Promise<Book> {
    try {
      // First check if book exists
      await this.findById(id);

      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      if (updateData.title !== undefined) {
        updateFields.push(`title = $${paramIndex}`);
        values.push(updateData.title);
        paramIndex++;
      }

      if (updateData.author !== undefined) {
        updateFields.push(`author = $${paramIndex}`);
        values.push(updateData.author);
        paramIndex++;
      }

      if (updateData.publication_year !== undefined) {
        updateFields.push(`publication_year = $${paramIndex}`);
        values.push(updateData.publication_year);
        paramIndex++;
      }

      if (updateData.isbn !== undefined) {
        updateFields.push(`isbn = $${paramIndex}`);
        values.push(updateData.isbn);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new DatabaseException('No fields to update');
      }

      values.push(id); // Add ID as the last parameter

      const query = `
        UPDATE books 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.databaseService.query<Book>(query, values);

      this.logger.log(`Book updated with ID: ${id}`);
      return result.rows[0];
    } catch (error) {
      if (
        error instanceof BookNotFoundException ||
        error instanceof DatabaseException
      ) {
        throw error;
      }
      if (
        error instanceof Error &&
        'code' in error &&
        'constraint' in error &&
        error.code === '23505' &&
        error.constraint === 'books_isbn_key'
      ) {
        throw new DuplicateISBNException(updateData.isbn!);
      }
      this.logger.error(`Error updating book with ID ${id}`, error);
      throw new DatabaseException('Failed to update book');
    }
  }

  async delete(id: number): Promise<void> {
    try {
      // First check if book exists
      await this.findById(id);

      const query = 'DELETE FROM books WHERE id = $1';
      await this.databaseService.query(query, [id]);

      this.logger.log(`Book deleted with ID: ${id}`);
    } catch (error) {
      if (error instanceof BookNotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting book with ID ${id}`, error);
      throw new DatabaseException('Failed to delete book');
    }
  }

  async countBooksByYear(year: number): Promise<number> {
    try {
      const query = 'SELECT count_books_by_year($1) as count';
      const result = await this.databaseService.query<{ count: number }>(
        query,
        [year],
      );

      return result.rows[0].count;
    } catch (error) {
      this.logger.error(`Error counting books for year ${year}`, error);
      throw new DatabaseException('Failed to count books by year');
    }
  }

  async getBookCountsByYear(): Promise<BookCountByYear[]> {
    try {
      const query = `
        SELECT publication_year, COUNT(*) as count
        FROM books
        GROUP BY publication_year
        ORDER BY publication_year DESC
      `;

      const result = await this.databaseService.query<BookCountByYear>(query);
      return result.rows;
    } catch (error) {
      this.logger.error('Error getting book counts by year', error);
      throw new DatabaseException('Failed to get book counts by year');
    }
  }

  async searchBooksByTitle(searchTerm: string): Promise<Book[]> {
    try {
      const query = `
        SELECT * FROM books
        WHERE to_tsvector('english', title) @@ plainto_tsquery('english', $1)
        ORDER BY ts_rank(to_tsvector('english', title), plainto_tsquery('english', $1)) DESC
      `;

      const result = await this.databaseService.query<Book>(query, [
        searchTerm,
      ]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error searching books by title', error);
      throw new DatabaseException('Failed to search books');
    }
  }
}
