import { Skill } from "./user.model";

export type TaskDifficulty = "easy" | "medium" | "hard";
export type TaskStatus = "draft" | "open" | "in_progress" | "review" | "completed" | "cancelled";

export interface CompanyShort {
  id: string;
  company_name: string;
  logo_url: string;
  is_verified: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  company: CompanyShort;
  assignee?: string | null;
  difficulty: TaskDifficulty;
  budget: string;
  estimated_hours: number;
  status: TaskStatus;
  skills_required: Skill[];
  deadline: string | null;
  applications_count?: number;
  has_applied?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface TaskCreatePayload {
  title: string;
  description: string;
  difficulty: TaskDifficulty;
  budget: number | string;
  estimated_hours: number;
  deadline?: string | null;
  skill_ids?: string[];
}

export type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export interface ApplicationStudent {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  rating: number;
  github_username: string;
}

export interface Application {
  id: string;
  task_id: string;
  task_title: string;
  student: ApplicationStudent;
  cover_letter: string;
  status: ApplicationStatus;
  applied_at: string;
}
