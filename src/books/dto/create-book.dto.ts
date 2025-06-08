import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsISBN,
  Min,
  Max,
  Length,
} from 'class-validator';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  title: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  author: string;

  @IsNumber()
  @Min(1000)
  @Max(new Date().getFullYear() + 10)
  publicationYear: number;

  @IsString()
  @IsNotEmpty()
  @IsISBN()
  isbn: string;
}
