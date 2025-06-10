-- Create books table
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    publication_year INTEGER NOT NULL,
    isbn VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on title for faster searches
CREATE INDEX idx_books_title ON books(title);

-- Create stored procedure to count books by publication year
CREATE OR REPLACE FUNCTION count_books_by_year(year_param INTEGER)
RETURNS INTEGER AS $$
DECLARE
    book_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO book_count
    FROM books
    WHERE publication_year = year_param;
    
    RETURN book_count;
END;
$$ LANGUAGE plpgsql;

-- Procedure 1: Search books with full-text search and ranking
CREATE OR REPLACE FUNCTION search_books(search_term TEXT)
RETURNS TABLE (
    id INTEGER,
    title VARCHAR(255),
    author VARCHAR(255),
    publication_year INTEGER,
    isbn VARCHAR(20),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    rank FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id, b.title, b.author, b.publication_year, b.isbn, b.created_at, b.updated_at,
        ts_rank(
            to_tsvector('english', b.title || ' ' || b.author), 
            plainto_tsquery('english', search_term)
        ) AS rank
    FROM books b
    WHERE 
        to_tsvector('english', b.title || ' ' || b.author) @@ 
        plainto_tsquery('english', search_term)
    ORDER BY rank DESC;
END;
$$ LANGUAGE plpgsql;

-- Procedure 2: Get book statistics by decade
CREATE OR REPLACE FUNCTION get_books_by_decade()
RETURNS TABLE (
    decade TEXT,
    book_count INTEGER,
    avg_books_per_year NUMERIC(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (FLOOR(publication_year / 10) * 10)::TEXT || 's' AS decade,
        COUNT(*) AS book_count,
        ROUND(COUNT(*)::NUMERIC / 
            (COUNT(DISTINCT publication_year))::NUMERIC, 2) AS avg_books_per_year
    FROM books
    GROUP BY FLOOR(publication_year / 10)
    ORDER BY decade;
END;
$$ LANGUAGE plpgsql;

-- Procedure 3: Upsert book with automatic timestamp handling
CREATE OR REPLACE PROCEDURE upsert_book(
    p_title VARCHAR(255),
    p_author VARCHAR(255),
    p_publication_year INTEGER,
    p_isbn VARCHAR(20),
    INOUT p_id INTEGER DEFAULT NULL
) AS $$
BEGIN
    IF p_id IS NULL THEN
        -- Insert new book
        INSERT INTO books (title, author, publication_year, isbn)
        VALUES (p_title, p_author, p_publication_year, p_isbn)
        RETURNING id INTO p_id;
    ELSE
        -- Update existing book
        UPDATE books
        SET 
            title = p_title,
            author = p_author,
            publication_year = p_publication_year,
            isbn = p_isbn,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_id;
        
        -- Check if book exists
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Book with ID % not found', p_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample data
INSERT INTO books (title, author, publication_year, isbn) VALUES
('The Great Gatsby', 'F. Scott Fitzgerald', 1925, '978-0-7432-7356-5'),
('To Kill a Mockingbird', 'Harper Lee', 1960, '978-0-06-112008-4'),
('1984', 'George Orwell', 1949, '978-0-452-28423-4'),
('Pride and Prejudice', 'Jane Austen', 1813, '978-0-14-143951-8'),
('The Catcher in the Rye', 'J.D. Salinger', 1951, '978-0-316-76948-0');
