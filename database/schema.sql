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

-- Insert some sample data
INSERT INTO books (title, author, publication_year, isbn) VALUES
('The Great Gatsby', 'F. Scott Fitzgerald', 1925, '978-0-7432-7356-5'),
('To Kill a Mockingbird', 'Harper Lee', 1960, '978-0-06-112008-4'),
('1984', 'George Orwell', 1949, '978-0-452-28423-4'),
('Pride and Prejudice', 'Jane Austen', 1813, '978-0-14-143951-8'),
('The Catcher in the Rye', 'J.D. Salinger', 1951, '978-0-316-76948-0');