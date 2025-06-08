import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateBookDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  author: string;

  @IsNotEmpty()
  @IsNumber()
  publicationYear: number;

  @IsNotEmpty()
  @IsString()
  isbn: string;
}
