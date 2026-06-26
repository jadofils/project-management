import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Project, Task, Comment, Issue, ErrorLog, Feedback, User, ProjectMember, ProjectMessage } from './database/entities';
import { EncryptionMiddleware } from './middleware/encryption.middleware';
import { GlobalExceptionFilter } from './common/exception.filter';
import { CloudinaryService } from './common/cloudinary.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
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
import { MembersController } from './members/members.controller';
import { MembersService } from './members/members.service';
import { MessagesController } from './messages/messages.controller';
import { MessagesService } from './messages/messages.service';
import { MailService } from './mail/mail.service';

const ENTITIES = [Project, Task, Comment, Issue, ErrorLog, Feedback, User, ProjectMember, ProjectMessage];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      entities: ENTITIES,
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forFeature(ENTITIES),
  ],
  controllers: [
    AuthController,
    UsersController,
    ProjectsController,
    TasksController,
    CommentsController,
    IssuesController,
    ErrorsController,
    FeedbackController,
    MembersController,
    MessagesController,
  ],
  providers: [
    AuthService,
    UsersService,
    CloudinaryService,
    ProjectsService,
    TasksService,
    CommentsService,
    IssuesService,
    ErrorsService,
    FeedbackService,
    MembersService,
    MessagesService,
    MailService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) { consumer.apply(EncryptionMiddleware).forRoutes('*'); }
}
