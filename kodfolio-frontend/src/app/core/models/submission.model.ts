export type SubmissionStatus = "in_review" | "approved" | "rejected" | "revision_requested";

export interface Review {
  id: string;
  mentor_email: string;
  mentor_name: string;
  code_quality: number;
  architecture: number;
  correctness: number;
  documentation: number;
  overall_score: string;
  feedback: string;
  requested_revision: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubmissionTaskShort {
  id: string;
  title: string;
  budget: string;
  difficulty: string;
  status: string;
}

export interface SubmissionStudentShort {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  github_username: string;
}

export interface Submission {
  id: string;
  task: SubmissionTaskShort;
  student: SubmissionStudentShort;
  github_pr_url?: string;
  demo_url?: string;
  description?: string;
  status: SubmissionStatus;
  revision_number: number;
  submitted_at: string;
  reviewed_at: string | null;
  finalized_at: string | null;
  reviews?: Review[];
  reviews_count?: number;
  avg_score?: number | null;
}
