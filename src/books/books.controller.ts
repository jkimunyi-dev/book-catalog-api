import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { SearchBooksDto } from './dto/search-books.dto';
import { Book, BookCountByYear } from './interfaces/book.interface';

@Controller('books')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createBookDto: CreateBookDto): Promise<{
    statusCode: number;
    message: string;
    data: Book;
  }> {
    const bookInput = {
      title: createBookDto.title,
      author: createBookDto.author,
      publication_year: createBookDto.publicationYear,
      isbn: createBookDto.isbn,
    };
    const book = await this.booksService.create(bookInput);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Book created successfully',
      data: book,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() searchParams: SearchBooksDto): Promise<{
    statusCode: number;
    message: string;
    data: Book[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
    };
  }> {
    const books = await this.booksService.findAll(searchParams);
    return {
      statusCode: HttpStatus.OK,
      message: 'Books retrieved successfully',
      data: books,
      pagination: {
        limit: searchParams.limit || 10,
        offset: searchParams.offset || 0,
        total: books.length,
      },
    };
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  async searchByTitle(@Query('title') title: string): Promise<{
    statusCode: number;
    message: string;
    data: Book[];
  }> {
    if (!title) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Search title is required',
        data: [],
      };
    }

    const books = await this.booksService.searchBooksByTitle(title);
    return {
      statusCode: HttpStatus.OK,
      message: 'Books search completed',
      data: books,
    };
  }

  @Get('stats/by-year')
  @HttpCode(HttpStatus.OK)
  async getBookCountsByYear(): Promise<{
    statusCode: number;
    message: string;
    data: BookCountByYear[];
  }> {
    const counts = await this.booksService.getBookCountsByYear();
    return {
      statusCode: HttpStatus.OK,
      message: 'Book counts by year retrieved successfully',
      data: counts,
    };
  }

  @Get('stats/count/:year')
  @HttpCode(HttpStatus.OK)
  async countBooksByYear(@Param('year', ParseIntPipe) year: number): Promise<{
    statusCode: number;
    message: string;
    data: {
      year: number;
      count: number;
    };
  }> {
    const count = await this.booksService.countBooksByYear(year);
    return {
      statusCode: HttpStatus.OK,
      message: `Book count for year ${year} retrieved successfully`,
      data: {
        year,
        count,
      },
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id', ParseIntPipe) id: number): Promise<{
    statusCode: number;
    message: string;
    data: Book;
  }> {
    const book = await this.booksService.findById(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Book retrieved successfully',
      data: book,
    };
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookDto: UpdateBookDto,
  ): Promise<{
    statusCode: number;
    message: string;
    data: Book;
  }> {
    const book = await this.booksService.update(id, updateBookDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Book updated successfully',
      data: book,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.booksService.delete(id);
  }
}
