import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;

  constructor() {
    const config: DatabaseConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'book_catalog_user',
      password: process.env.DB_PASSWORD || 'book_catalog_user',
      database: process.env.DB_NAME || 'book_catalog',
    };

    this.pool = new Pool({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
      connectionTimeoutMillis: 2000, // How long to wait for a connection
    });

    // Handle pool errors
    this.pool.on('error', (err: Error) => {
      this.logger.error('Unexpected error on idle client', err);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.logger.log('Database connection established successfully');

      // Initialize database schema
      await this.initializeSchema();
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
    this.logger.log('Database connection pool closed');
  }

  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[],
  ): Promise<QueryResult<T>> {
    const start = Date.now();

    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;

      this.logger.debug(`Query completed in ${duration}ms: ${text}`);
      return result;
    } catch (error) {
      this.logger.error(`Query failed: ${text}`, error);
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  private async initializeSchema(): Promise<void> {
    try {
      // Create books table
      await this.query(`
        CREATE TABLE IF NOT EXISTS books (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          author VARCHAR(255) NOT NULL,
          publication_year INTEGER NOT NULL,
          isbn VARCHAR(13) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create index on title for faster searches
      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_books_title 
        ON books USING gin(to_tsvector('english', title))
      `);

      // Create additional index on publication_year for the stored procedure
      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_books_publication_year 
        ON books (publication_year)
      `);

      // Create stored procedure to count books by publication year
      await this.query(`
        CREATE OR REPLACE FUNCTION count_books_by_year(target_year INTEGER)
        RETURNS INTEGER AS $$
        DECLARE
          book_count INTEGER;
        BEGIN
          SELECT COUNT(*) INTO book_count
          FROM books
          WHERE publication_year = target_year;
          
          RETURN book_count;
        END;
        $$ LANGUAGE plpgsql;
      `);

      // Create trigger to update updated_at timestamp
      await this.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await this.query(`
        DROP TRIGGER IF EXISTS update_books_updated_at ON books;
        CREATE TRIGGER update_books_updated_at
        BEFORE UPDATE ON books
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `);

      this.logger.log('Database schema initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database schema', error);
      throw error;
    }
  }
}
