import { HttpException, HttpStatus } from '@nestjs/common';

export class DatabaseException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super(message, status);
  }
}

export class BookNotFoundException extends DatabaseException {
  constructor(id: number) {
    super(`Book with ID ${id} not found`, HttpStatus.NOT_FOUND);
  }
}

export class DuplicateISBNException extends DatabaseException {
  constructor(isbn: string) {
    super(`Book with ISBN ${isbn} already exists`, HttpStatus.CONFLICT);
  }
}
