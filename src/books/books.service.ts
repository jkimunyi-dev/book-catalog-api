import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

export interface Book {
  id: number;
  title: string;
  author: string;
  publication_year: number;
  isbn: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class BooksService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(): Promise<Book[]> {
    try {
      const query = `
        SELECT id, title, author, publication_year, isbn, created_at, updated_at
        FROM books 
        ORDER BY created_at DESC
      `;
      const result = await this.databaseService.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch books: ${error.message}`);
    }
  }

  async findOne(id: number): Promise<Book> {
    try {
      const query = `
        SELECT id, title, author, publication_year, isbn, created_at, updated_at
        FROM books 
        WHERE id = $1
      `;
      const result = await this.databaseService.query(query, [id]);

      if (result.rows.length === 0) {
        throw new NotFoundException(`Book with ID ${id} not found`);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to fetch book: ${error.message}`);
    }
  }

  async create(createBookDto: CreateBookDto): Promise<Book> {
    try {
      const query = `
        INSERT INTO books (title, author, publication_year, isbn)
        VALUES ($1, $2, $3, $4)
        RETURNING id, title, author, publication_year, isbn, created_at, updated_at
      `;
      const values = [
        createBookDto.title,
        createBookDto.author,
        createBookDto.publicationYear,
        createBookDto.isbn,
      ];

      const result = await this.databaseService.query(query, values);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        throw new ConflictException(
          `Book with ISBN ${createBookDto.isbn} already exists`,
        );
      }
      throw new Error(`Failed to create book: ${error.message}`);
    }
  }

  async update(id: number, updateBookDto: UpdateBookDto): Promise<Book> {
    try {
      // First check if book exists
      await this.findOne(id);

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (updateBookDto.title !== undefined) {
        updates.push(`title = $${paramCount++}`);
        values.push(updateBookDto.title);
      }
      if (updateBookDto.author !== undefined) {
        updates.push(`author = $${paramCount++}`);
        values.push(updateBookDto.author);
      }
      if (updateBookDto.publicationYear !== undefined) {
        updates.push(`publication_year = $${paramCount++}`);
        values.push(updateBookDto.publicationYear);
      }
      if (updateBookDto.isbn !== undefined) {
        updates.push(`isbn = $${paramCount++}`);
        values.push(updateBookDto.isbn);
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE books 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, title, author, publication_year, isbn, created_at, updated_at
      `;

      const result = await this.databaseService.query(query, values);
      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.code === '23505') {
        // Unique constraint violation
        throw new ConflictException(
          `Book with ISBN ${updateBookDto.isbn} already exists`,
        );
      }
      throw new Error(`Failed to update book: ${error.message}`);
    }
  }

  async remove(id: number): Promise<void> {
    try {
      // First check if book exists
      await this.findOne(id);

      const query = `DELETE FROM books WHERE id = $1`;
      await this.databaseService.query(query, [id]);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to delete book: ${error.message}`);
    }
  }

  async countBooksByYear(year: number): Promise<number> {
    try {
      const query = `SELECT count_books_by_year($1) as count`;
      const result = await this.databaseService.query(query, [year]);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      throw new Error(`Failed to count books by year: ${error.message}`);
    }
  }
}
