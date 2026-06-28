import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Project, Task, Comment, Issue, ErrorLog, Feedback, FeedbackReply, User, ProjectMember, ProjectMessage, Subtask, TaskAssignmentLog, ProjectInvitation, EmailLog, Division, Department, JobPosition, EmployeeProfile, Office, AttendanceToken, AttendanceRecord, LeaveType, LeaveRequest, LeaveBalance, JobPosting, Application, ContentCategory, ContentTemplate, ContentDraft, ContentPassword } from './database/entities';
import { EncryptionMiddleware } from './middleware/encryption.middleware';
import { GlobalExceptionFilter } from './common/exception.filter';
import { CloudinaryService } from './common/cloudinary.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AdminOrPMGuard } from './auth/jwt.guard';
import { RolesGuard } from './auth/roles.guard';
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
import { MailController } from './mail/mail.controller';
import { HealthController } from './health/health.controller';
import { KeepAliveService } from './keep-alive/keep-alive.service';
import { SubtasksController } from './subtasks/subtasks.controller';
import { SubtasksService } from './subtasks/subtasks.service';
import { StatsController } from './stats/stats.controller';
import { StatsService } from './stats/stats.service';
import { AdminController } from './admin/admin.controller';
import { InvitationsController } from './invitations/invitations.controller';
import { InvitationsService } from './invitations/invitations.service';
import { ContributionsController } from './contributions/contributions.controller';
import { ContributionsService } from './contributions/contributions.service';
import { ChatGateway } from './chat/chat.gateway';
import { EmailLogsController } from './email-logs/email-logs.controller';
import { OrgController } from './org/org.controller';
import { OrgService } from './org/org.service';
import { AttendanceController } from './attendance/attendance.controller';
import { AttendanceService } from './attendance/attendance.service';
import { LeaveController } from './leave/leave.controller';
import { LeaveService } from './leave/leave.service';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';
import { RecruitmentController } from './recruitment/recruitment.controller';
import { RecruitmentService } from './recruitment/recruitment.service';
import { ContentController } from './content/content.controller';
import { ContentService } from './content/content.service';

const ENTITIES = [Project, Task, Comment, Issue, ErrorLog, Feedback, FeedbackReply, User, ProjectMember, ProjectMessage, Subtask, TaskAssignmentLog, ProjectInvitation, EmailLog, Division, Department, JobPosition, EmployeeProfile, Office, AttendanceToken, AttendanceRecord, LeaveType, LeaveRequest, LeaveBalance, JobPosting, Application, ContentCategory, ContentTemplate, ContentDraft, ContentPassword];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
        ? { rejectUnauthorized: true }
        : process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false'
          ? { rejectUnauthorized: false }
          : { rejectUnauthorized: process.env.NODE_ENV !== 'production' },
      entities: ENTITIES,
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
      logging: process.env.DB_LOGGING === 'true',
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
    MailController,
    HealthController,
    SubtasksController,
    StatsController,
    AdminController,
    InvitationsController,
    ContributionsController,
    EmailLogsController,
    OrgController,
    AttendanceController,
    LeaveController,
    ReportsController,
    RecruitmentController,
    ContentController,
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
    AdminOrPMGuard,
    RolesGuard,
    KeepAliveService,
    SubtasksService,
    StatsService,
    InvitationsService,
    ContributionsService,
    ChatGateway,
    OrgService,
    AttendanceService,
    LeaveService,
    ReportsService,
    RecruitmentService,
    ContentService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) { consumer.apply(EncryptionMiddleware).forRoutes('*'); }
}
