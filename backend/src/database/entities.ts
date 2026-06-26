import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type DevPhase = 'backend' | 'frontend' | 'documentation' | 'qa_testing' | 'data_analyst';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ length: 200 }) name!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ type: 'uuid' }) owner_id!: string;
  @Column({ length: 20, default: 'active' }) status!: string;
  @CreateDateColumn() created_at!: Date;
  @UpdateDateColumn() updated_at!: Date;
  @OneToMany(() => Task, t => t.project) tasks!: Task[];
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) project_id!: string;
  @Column({ length: 300 }) title!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ length: 20, default: 'todo' }) status!: string;
  @Column({ length: 20, default: 'medium' }) priority!: string;
  @Column({ length: 30, nullable: true }) phase!: string | null;
  @Column({ type: 'uuid', nullable: true }) assignee_id!: string | null;
  @Column({ type: 'int', default: 0 }) sort_order!: number;
  @Column({ type: 'date', nullable: true }) due_date!: string | null;
  @CreateDateColumn() created_at!: Date;
  @UpdateDateColumn() updated_at!: Date;
  @ManyToOne(() => Project, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'project_id' }) project!: Project;
}

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) task_id!: string;
  @Column({ type: 'uuid' }) user_id!: string;
  @Column({ type: 'text' }) content!: string;
  @CreateDateColumn() created_at!: Date;
}

@Entity('issues')
export class Issue {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) project_id!: string;
  @Column({ type: 'uuid' }) reported_by!: string;
  @Column({ length: 300 }) title!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ length: 20, default: 'open' }) status!: string;
  @Column({ length: 20, default: 'medium' }) priority!: string;
  @CreateDateColumn() created_at!: Date;
  @UpdateDateColumn() updated_at!: Date;
}

@Entity('error_logs')
export class ErrorLog {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'int' }) status_code!: number;
  @Column({ length: 500 }) message!: string;
  @Column({ type: 'text', nullable: true }) stack!: string | null;
  @Column({ length: 300, nullable: true }) endpoint!: string | null;
  @Column({ length: 10, nullable: true }) method!: string | null;
  @Column({ type: 'uuid', nullable: true }) user_id!: string | null;
  @Column({ length: 50, default: 'bwenge' }) source!: string;
  @Column({ length: 20, default: 'unread' }) status!: string;
  @CreateDateColumn() created_at!: Date;
}

@Entity('user_cache')
export class UserCache {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid', unique: true }) user_id!: string;
  @Column({ length: 100 }) first_name!: string;
  @Column({ length: 100 }) last_name!: string;
  @Column({ length: 255 }) email!: string;
  @Column({ length: 500, nullable: true }) avatar_url!: string | null;
  @Column() last_synced!: Date;
}

@Entity('feedbacks')
export class Feedback {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) user_id!: string;
  @Column({ length: 300 }) title!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ length: 30, default: 'other' }) category!: string;
  @Column({ length: 500, nullable: true }) page_url!: string | null;
  @Column({ type: 'text', nullable: true }) screenshot_url!: string | null;
  @Column({ length: 20, default: 'open' }) status!: string;
  @Column({ type: 'uuid', nullable: true }) assigned_to!: string | null;
  @CreateDateColumn() created_at!: Date;
  @UpdateDateColumn() updated_at!: Date;
}
