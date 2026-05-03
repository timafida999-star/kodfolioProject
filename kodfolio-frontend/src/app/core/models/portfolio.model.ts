import { Skill } from "./user.model";
import { CompanyShort } from "./task.model";

export interface PortfolioReview {
  overall_score: string;
  feedback: string;
  code_quality: number;
  architecture: number;
  correctness: number;
  documentation: number;
}

export interface PortfolioEntry {
  id: string;
  task_title: string;
  task_description: string;
  task_difficulty: string;
  task_budget: string;
  skills_used: Skill[];
  company: CompanyShort;
  github_pr_url: string;
  demo_url: string;
  description: string;
  review: PortfolioReview | null;
  is_public: boolean;
  views_count: number;
  completed_at: string;
}
