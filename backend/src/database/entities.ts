import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, ManyToOne, JoinColumn,
} from 'typeorm';
import {
  SystemRole, TaskStatus, TaskPriority, DevPhase,
  ProjectRole, PermissionLevel, ProjectStatus,
  InvitationStatus, FeedbackStatus, EmailType,
  MessageType, IssueStatus, EmailStatus,
} from '../shared/enums';

export { SystemRole, TaskStatus, TaskPriority, DevPhase, ProjectRole, PermissionLevel, ProjectStatus, InvitationStatus, FeedbackStatus, EmailType, MessageType, IssueStatus, EmailStatus };

// ── User ─────────────────────────────────────────────────────────────────────
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 255, unique: true }) email!: string;
  @Column({ type: 'varchar', length: 255 }) password_hash!: string;
  @Column({ type: 'varchar', length: 100 }) first_name!: string;
  @Column({ type: 'varchar', length: 100 }) last_name!: string;
  @Column({ type: 'varchar', length: 500, nullable: true }) avatar_url!: string | null;
  @Column({ type: 'text', nullable: true }) bio!: string | null;
  @Column({ type: 'varchar', length: 30, nullable: true }) phone!: string | null;
  @Column({ type: 'varchar', length: 20, default: 'user' }) system_role!: SystemRole;
  @Column({ type: 'boolean', default: true }) is_active!: boolean;
  @Column({ type: 'boolean', default: false }) must_change_password!: boolean;
  @CreateDateColumn() created_at!: Date;
  @UpdateDateColumn() updated_at!: Date;
  @OneToMany(() => ProjectMember, (m: ProjectMember) => m.user) memberships!: ProjectMember[];
  @OneToMany(() => ProjectMessage, (m: ProjectMessage) => m.sender) messages!: ProjectMessage[];
}

// ── Project ───────────────────────────────────────────────────────────────────
@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 200 }) name!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ type: 'uuid' }) owner_id!: string;
  @Column({ type: 'uuid', nullable: true }) division_id!: string | null;
  @Column({ type: 'varchar', length: 200, nullable: true }) company_name!: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) company_email!: string | null;
  @Column({ type: 'varchar', length: 20, default: 'individual' }) type!: string;
  @Column({ type: 'varchar', length: 20, default: 'active' }) status!: string;
  @CreateDateColumn() created_at!: Date;
  @UpdateDateColumn() updated_at!: Date;
  @OneToMany(() => Task, (t: Task) => t.project) tasks!: Task[];
  @OneToMany(() => ProjectMember, (m: ProjectMember) => m.project) members!: ProjectMember[];
  @OneToMany(() => ProjectMessage, (m: ProjectMessage) => m.project) project_messages!: ProjectMessage[];
}

// ── Task ──────────────────────────────────────────────────────────────────────
@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) project_id!: string;
  @Column({ type: 'varchar', length: 300 }) title!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ type: 'varchar', length: 20, default: 'todo' }) status!: string;
  @Column({ type: 'varchar', length: 20, default: 'medium' }) priority!: string;
  @Column({ type: 'varchar', length: 30, nullable: true }) phase!: string | null;
  @Column({ type: 'uuid', nullable: true }) assignee_id!: string | null;
  @Column({ type: 'int', default: 0 }) sort_order!: number;
  @Column({ type: 'date', nullable: true }) due_date!: string | null;
  @Column({ type: 'date', nullable: true }) original_due_date!: string | null;
  @Column({ type: 'timestamp', nullable: true }) completed_at!: Date | null;
  @Column({ type: 'uuid', nullable: true }) completed_by!: string | null;
  @Column({ type: 'simple-json', nullable: true }) assignee_ids!: string[] | null;
  @Column({ type: 'simple-json', nullable: true }) liked_by!: string[] | null;
  @Column({ type: 'uuid', nullable: true }) created_by!: string | null;
  @Column({ type: 'varchar', length: 200, nullable: true }) module!: string | null;
  @Column({ type: 'int', default: 0 }) subtask_count!: number;
  @Column({ type: 'int', default: 0 }) subtasks_done!: number;
  @CreateDateColumn() created_at!: Date;
  @UpdateDateColumn() updated_at!: Date;
  @ManyToOne(() => Project, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'project_id' }) project!: Project;
  @OneToMany(() => Subtask, (s: Subtask) => s.task) subtasks!: Subtask[];
}

// ── Task Assignment Log ───────────────────────────────────────────────────────
@Entity('task_assignment_logs')
export class TaskAssignmentLog {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) task_id!: string;
  @Column({ type: 'uuid' }) project_id!: string;
  @Column({ type: 'varchar', length: 300 }) task_title!: string;
  @Column({ type: 'uuid', nullable: true }) user_id!: string | null;
  @Column({ type: 'varchar', length: 20 }) action!: string; // 'assigned' | 'unassigned'
  @Column({ type: 'uuid', nullable: true }) changed_by!: string | null;
  @Column({ type: 'text', nullable: true }) note!: string | null;
  @CreateDateColumn() created_at!: Date;
}

// ── Comment ───────────────────────────────────────────────────────────────────
@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) task_id!: string;
  @Column({ type: 'uuid' }) user_id!: string;
  @Column({ type: 'text' }) content!: string;
  @CreateDateColumn() created_at!: Date;
}

// ── Project Member ────────────────────────────────────────────────────────────
@Entity('project_members')
export class ProjectMember {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) project_id!: string;
  @Column({ type: 'uuid' }) user_id!: string;
  @Column({ type: 'varchar', length: 30, default: 'backend_dev' }) role!: ProjectRole;
  @Column({ type: 'simple-json', nullable: true }) roles!: ProjectRole[] | null;
  @Column({ type: 'varchar', length: 20, default: 'editor' }) permission_level!: string;
  @CreateDateColumn() joined_at!: Date;
  @ManyToOne(() => Project, (p: Project) => p.members, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'project_id' }) project!: Project;
  @ManyToOne(() => User, (u: User) => u.memberships, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'user_id' }) user!: User;
}

// ── Project Message ───────────────────────────────────────────────────────────
@Entity('project_messages')
export class ProjectMessage {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) project_id!: string;
  @Column({ type: 'uuid' }) sender_id!: string;
  @Column({ type: 'text' }) content!: string;
  @Column({ type: 'varchar', length: 20, default: 'text' }) type!: string;
  @Column({ type: 'varchar', length: 500, nullable: true }) file_url!: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) file_name!: string | null;
  @Column({ type: 'uuid', nullable: true }) reply_to_id!: string | null;
  @Column({ type: 'uuid', nullable: true }) task_id!: string | null;
  @CreateDateColumn() created_at!: Date;
  @ManyToOne(() => Project, (p: Project) => p.project_messages, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'project_id' }) project!: Project;
  @ManyToOne(() => User, (u: User) => u.messages, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'sender_id' }) sender!: User;
}

// ── Issue ─────────────────────────────────────────────────────────────────────
@Entity('issues')
export class Issue {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) project_id!: string;
  @Column({ type: 'uuid' }) reported_by!: string;
  @Column({ type: 'varchar', length: 300 }) title!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ type: 'varchar', length: 20, default: 'open' }) status!: string;
  @Column({ type: 'varchar', length: 20, default: 'medium' }) priority!: string;
  @CreateDateColumn() created_at!: Date;
  @UpdateDateColumn() updated_at!: Date;
}

// ── Error Log ─────────────────────────────────────────────────────────────────
@Entity('error_logs')
export class ErrorLog {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'int' }) status_code!: number;
  @Column({ type: 'varchar', length: 500 }) message!: string;
  @Column({ type: 'text', nullable: true }) stack!: string | null;
  @Column({ type: 'varchar', length: 300, nullable: true }) endpoint!: string | null;
  @Column({ type: 'varchar', length: 10, nullable: true }) method!: string | null;
  @Column({ type: 'uuid', nullable: true }) user_id!: string | null;
  @Column({ type: 'varchar', length: 20, default: 'unread' }) status!: string;
  @CreateDateColumn() created_at!: Date;
}

// ── Feedback ──────────────────────────────────────────────────────────────────
@Entity('feedbacks')
export class Feedback {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) user_id!: string;
  @Column({ type: 'uuid', nullable: true }) project_id!: string | null;
  @Column({ type: 'varchar', length: 300 }) title!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ type: 'varchar', length: 30, default: 'other' }) category!: string;
  @Column({ type: 'varchar', length: 500, nullable: true }) page_url!: string | null;
  @Column({ type: 'text', nullable: true }) screenshot_url!: string | null;
  @Column({ type: 'varchar', length: 20, default: 'open' }) status!: string;
  @Column({ type: 'uuid', nullable: true }) assigned_to!: string | null;
  @Column({ type: 'int', default: 0 }) reply_count!: number;
  @CreateDateColumn() created_at!: Date;
  @UpdateDateColumn() updated_at!: Date;
}

// ── Feedback Reply ────────────────────────────────────────────────────────────
@Entity('feedback_replies')
export class FeedbackReply {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) feedback_id!: string;
  @Column({ type: 'uuid' }) user_id!: string;
  @Column({ type: 'text' }) content!: string;
  @CreateDateColumn() created_at!: Date;
}

// ── Project Invitation ────────────────────────────────────────────────────────
@Entity('project_invitations')
export class ProjectInvitation {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) project_id!: string;
  @Column({ type: 'uuid', nullable: true }) invited_by!: string | null;
  @Column({ type: 'varchar', length: 255 }) email!: string;
  @Column({ type: 'varchar', length: 30, default: 'backend_dev' }) role!: string;
  @Column({ type: 'varchar', length: 20, default: 'editor' }) permission_level!: string;
  @Column({ type: 'varchar', length: 100, unique: true }) token!: string;
  @Column({ type: 'varchar', length: 20, default: 'pending' }) status!: string;
  @Column({ type: 'timestamp', nullable: true }) expires_at!: Date | null;
  @Column({ type: 'uuid', nullable: true }) accepted_by!: string | null;
  @CreateDateColumn() created_at!: Date;
}

// ── Email Log ─────────────────────────────────────────────────────────────────
@Entity('email_logs')
export class EmailLog {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 30 }) type!: string;
  @Column({ type: 'uuid', nullable: true }) sender_id!: string | null;
  @Column({ type: 'varchar', length: 500 }) recipient!: string;
  @Column({ type: 'varchar', length: 300 }) subject!: string;
  @Column({ type: 'uuid', nullable: true }) project_id!: string | null;
  @Column({ type: 'uuid', nullable: true }) related_id!: string | null;
  @Column({ type: 'varchar', length: 20, default: 'sent' }) status!: string;
  @Column({ type: 'text', nullable: true }) error_message!: string | null;
  @CreateDateColumn() created_at!: Date;
}

// ── Subtask ───────────────────────────────────────────────────────────────────
@Entity('subtasks')
export class Subtask {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) task_id!: string;
  @Column({ type: 'varchar', length: 500 }) title!: string;
  @Column({ type: 'boolean', default: false }) completed!: boolean;
  @Column({ type: 'uuid', nullable: true }) completed_by!: string | null;
  @Column({ type: 'int', default: 0 }) sort_order!: number;
  @CreateDateColumn() created_at!: Date;
  @ManyToOne(() => Task, (t: Task) => t.subtasks, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'task_id' }) task!: Task;
}

// ── Organization Structure ─────────────────────────────────────────────────────
@Entity('divisions')
export class Division {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 200 }) name!: string;
  @Column({ type: 'varchar', length: 20, unique: true }) code!: string;
  @Column({ type: 'uuid', nullable: true }) head_user_id!: string | null;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @CreateDateColumn() created_at!: Date;
}

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) division_id!: string;
  @Column({ type: 'varchar', length: 200 }) name!: string;
  @Column({ type: 'uuid', nullable: true }) head_user_id!: string | null;
  @CreateDateColumn() created_at!: Date;
}

@Entity('job_positions')
export class JobPosition {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 200 }) title!: string;
  @Column({ type: 'uuid', nullable: true }) division_id!: string | null;
  @Column({ type: 'varchar', length: 20, nullable: true }) grade!: string | null;
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true }) min_salary!: number | null;
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true }) max_salary!: number | null;
  @CreateDateColumn() created_at!: Date;
}

@Entity('employee_profiles')
export class EmployeeProfile {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid', unique: true }) user_id!: string;
  @Column({ type: 'uuid', nullable: true }) department_id!: string | null;
  @Column({ type: 'uuid', nullable: true }) job_position_id!: string | null;
  @Column({ type: 'varchar', length: 30, nullable: true }) phone!: string | null;
  @Column({ type: 'varchar', length: 50, nullable: true }) national_id!: string | null;
  @Column({ type: 'date', nullable: true }) date_of_birth!: string | null;
  @Column({ type: 'date', nullable: true }) hire_date!: string | null;
  @Column({ type: 'varchar', length: 20, nullable: true }) contract_type!: string | null;
  @Column({ type: 'varchar', length: 20, default: 'active' }) employment_status!: string;
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true }) salary_band!: number | null;
  @CreateDateColumn() created_at!: Date;
}

// ── Attendance ─────────────────────────────────────────────────────────────────
@Entity('offices')
export class Office {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 200 }) name!: string;
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true }) latitude!: number | null;
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true }) longitude!: number | null;
  @Column({ type: 'int', default: 100 }) radius_meters!: number;
  @CreateDateColumn() created_at!: Date;
}

@Entity('attendance_tokens')
export class AttendanceToken {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) user_id!: string;
  @Column({ type: 'varchar', length: 64 }) token_hash!: string;
  @Column({ type: 'timestamp' }) expires_at!: Date;
  @Column({ type: 'boolean', default: false }) used!: boolean;
  @CreateDateColumn() created_at!: Date;
}

@Entity('attendance_records')
export class AttendanceRecord {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) user_id!: string;
  @Column({ type: 'date' }) date!: string;
  @Column({ type: 'timestamp', nullable: true }) clock_in!: Date | null;
  @Column({ type: 'timestamp', nullable: true }) clock_out!: Date | null;
  @Column({ type: 'varchar', length: 10, default: 'qr' }) method!: string;
  @Column({ type: 'varchar', length: 45, nullable: true }) ip_address!: string | null;
  @Column({ type: 'uuid', nullable: true }) office_id!: string | null;
  @Column({ type: 'varchar', length: 20, default: 'present' }) status!: string;
  @Column({ type: 'boolean', default: true }) verified!: boolean;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @CreateDateColumn() created_at!: Date;
}

// ── Leave Management ───────────────────────────────────────────────────────────
@Entity('leave_types')
export class LeaveType {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 100 }) name!: string;
  @Column({ type: 'int' }) days_per_year!: number;
  @Column({ type: 'boolean', default: false }) carry_over!: boolean;
  @Column({ type: 'boolean', default: true }) paid!: boolean;
  @Column({ type: 'varchar', length: 7, default: '#10b981' }) color!: string;
  @CreateDateColumn() created_at!: Date;
}

@Entity('leave_requests')
export class LeaveRequest {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) user_id!: string;
  @Column({ type: 'uuid' }) leave_type_id!: string;
  @Column({ type: 'date' }) start_date!: string;
  @Column({ type: 'date' }) end_date!: string;
  @Column({ type: 'int' }) days!: number;
  @Column({ type: 'text', nullable: true }) reason!: string | null;
  @Column({ type: 'varchar', length: 20, default: 'pending' }) status!: string;
  @Column({ type: 'uuid', nullable: true }) approved_by!: string | null;
  @Column({ type: 'timestamp', nullable: true }) approved_at!: Date | null;
  @Column({ type: 'text', nullable: true }) rejection_reason!: string | null;
  @CreateDateColumn() created_at!: Date;
}

@Entity('leave_balances')
export class LeaveBalance {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) user_id!: string;
  @Column({ type: 'uuid' }) leave_type_id!: string;
  @Column({ type: 'int' }) year!: number;
  @Column({ type: 'int', default: 0 }) allocated!: number;
  @Column({ type: 'int', default: 0 }) used!: number;
  @Column({ type: 'int', default: 0 }) remaining!: number;
  @CreateDateColumn() created_at!: Date;
}

// ── Recruitment ────────────────────────────────────────────────────────────────
@Entity('job_postings')
export class JobPosting {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 200 }) title!: string;
  @Column({ type: 'uuid', nullable: true }) division_id!: string | null;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ type: 'text', nullable: true }) requirements!: string | null;
  @Column({ type: 'date', nullable: true }) deadline!: string | null;
  @Column({ type: 'varchar', length: 20, default: 'open' }) status!: string;
  @Column({ type: 'uuid' }) created_by!: string;
  @CreateDateColumn() created_at!: Date;
}

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) posting_id!: string;
  @Column({ type: 'varchar', length: 200 }) applicant_name!: string;
  @Column({ type: 'varchar', length: 255 }) email!: string;
  @Column({ type: 'varchar', length: 30, nullable: true }) phone!: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) cv_url!: string | null;
  @Column({ type: 'text', nullable: true }) cover_letter!: string | null;
  @Column({ type: 'varchar', length: 20, default: 'new' }) status!: string;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @CreateDateColumn() created_at!: Date;
}

// ── Content Creation ──────────────────────────────────────────────────────────
@Entity('content_categories')
export class ContentCategory {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 100 }) name!: string;
  @Column({ type: 'varchar', length: 50, unique: true }) slug!: string;
  @Column({ type: 'varchar', length: 50 }) icon!: string;
  @Column({ type: 'varchar', length: 7 }) color!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @CreateDateColumn() created_at!: Date;
}

@Entity('content_templates')
export class ContentTemplate {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) category_id!: string;
  @Column({ type: 'varchar', length: 200 }) name!: string;
  @Column({ type: 'varchar', length: 20 }) format!: string;
  @Column({ type: 'text', nullable: true }) preview!: string | null;
  @CreateDateColumn() created_at!: Date;
}

@Entity('content_drafts')
export class ContentDraft {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) user_id!: string;
  @Column({ type: 'uuid' }) category_id!: string;
  @Column({ type: 'varchar', length: 300 }) title!: string;
  @Column({ type: 'text' }) body!: string;
  @Column({ type: 'varchar', length: 10, default: 'en' }) language!: string;
  @Column({ type: 'varchar', length: 30, nullable: true }) background!: string | null;
  @Column({ type: 'varchar', length: 20, default: 'draft' }) status!: string;
  @Column({ type: 'uuid', nullable: true }) project_id!: string | null;
  @CreateDateColumn() created_at!: Date;
}

@Entity('content_passwords')
export class ContentPassword {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 255 }) password_hash!: string;
  @Column({ type: 'uuid' }) updated_by!: string;
  @CreateDateColumn() created_at!: Date;
}
