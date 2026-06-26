import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, ManyToOne, JoinColumn,
} from 'typeorm';

// ── Enums ────────────────────────────────────────────────────────────────────
export type ProjectRole =
  | 'project_manager' | 'backend_dev' | 'frontend_dev'
  | 'documentalist' | 'tester' | 'qa_tester';

export type SystemRole = 'admin' | 'user';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type DevPhase = 'backend' | 'frontend' | 'documentation' | 'qa_testing' | 'data_analyst';

// ── User ─────────────────────────────────────────────────────────────────────
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 255, unique: true }) email!: string;
  @Column({ type: 'varchar', length: 255 }) password_hash!: string;
  @Column({ type: 'varchar', length: 100 }) first_name!: string;
  @Column({ type: 'varchar', length: 100 }) last_name!: string;
  @Column({ type: 'varchar', length: 500, nullable: true }) avatar_url!: string | null;
  @Column({ type: 'varchar', length: 20, default: 'user' }) system_role!: SystemRole;
  @Column({ type: 'boolean', default: true }) is_active!: boolean;
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
  @CreateDateColumn() created_at!: Date;
  @UpdateDateColumn() updated_at!: Date;
  @ManyToOne(() => Project, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'project_id' }) project!: Project;
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
  @Column({ type: 'varchar', length: 300 }) title!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ type: 'varchar', length: 30, default: 'other' }) category!: string;
  @Column({ type: 'varchar', length: 500, nullable: true }) page_url!: string | null;
  @Column({ type: 'text', nullable: true }) screenshot_url!: string | null;
  @Column({ type: 'varchar', length: 20, default: 'open' }) status!: string;
  @Column({ type: 'uuid', nullable: true }) assigned_to!: string | null;
  @CreateDateColumn() created_at!: Date;
  @UpdateDateColumn() updated_at!: Date;
}
