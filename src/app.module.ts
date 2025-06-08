import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';
import { BooksModule } from './books/books.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [BooksModule, DatabaseModule],
  controllers: [AppController],
  providers: [AppService, DatabaseService],
})
export class AppModule {}
