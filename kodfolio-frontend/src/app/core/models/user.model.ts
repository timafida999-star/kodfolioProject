export type UserRole = "student" | "company" | "mentor" | "admin";

export interface Skill {
  id: string;
  name: string;
  slug: string;
  category: string;
  icon: string;
}

export interface ProfileSkill {
  skill_id: string;
  name: string;
  category: string;
  icon: string;
  proficiency: number;
}

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  avatar_url: string;
  bio: string;
  experience_years: number;
  github_username: string;
  rating: string;
  badges_count: number;
  skills: ProfileSkill[];
  created_at: string;
  updated_at: string;
}

export interface CompanyProfile {
  id: string;
  email: string;
  company_name: string;
  logo_url: string;
  website: string;
  industry: string;
  description: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  is_verified: boolean;
  date_joined: string;
  profile: Profile | null;
  company_profile: CompanyProfile | null;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}
