import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Project, Task, Comment, Issue, ErrorLog, UserCache, Feedback } from './database/entities';
import { EncryptionMiddleware } from './middleware/encryption.middleware';
import { GlobalExceptionFilter } from './common/exception.filter';
import { CloudinaryService } from './common/cloudinary.service';
import { AuthController } from './auth/auth.controller';
import { ProjectsController } from './projects/projects.controller';
import { ProjectsService } from './projects/projects.service';
import { TasksController } from './tasks/tasks.controller';
import { TasksService } from './tasks/tasks.service';
import { CommentsController } from './comments/comments.controller';
import { CommentsService } from './comments/comments.service';
import { IssuesController } from './issues/issues.controller';
import { IssuesService } from './issues/issues.service';
import { ErrorsController } from './errors/errors.controller';
import { ErrorsService } from './errors/errors.service';
import { FeedbackController } from './feedback/feedback.controller';
import { FeedbackService } from './feedback/feedback.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres', url: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false },
      entities: [Project, Task, Comment, Issue, ErrorLog, UserCache, Feedback],
      synchronize: true, logging: false,
    }),
    TypeOrmModule.forFeature([Project, Task, Comment, Issue, ErrorLog, UserCache, Feedback]),
  ],
  controllers: [AuthController, ProjectsController, TasksController, CommentsController, IssuesController, ErrorsController, FeedbackController],
  providers: [CloudinaryService, ProjectsService, TasksService, CommentsService, IssuesService, ErrorsService, FeedbackService, { provide: APP_FILTER, useClass: GlobalExceptionFilter }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) { consumer.apply(EncryptionMiddleware).forRoutes('*'); }
}
