import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { PaginatedResponse } from "../models/api.model";
import { Review, Submission } from "../models/submission.model";

export interface SubmissionCreatePayload {
  github_pr_url: string;
  demo_url?: string;
  description: string;
}

export interface ReviewCreatePayload {
  code_quality: number;
  architecture: number;
  correctness: number;
  documentation: number;
  feedback: string;
  requested_revision?: boolean;
}

@Injectable({ providedIn: "root" })
export class SubmissionsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  listForTask(taskId: string): Observable<Submission[]> {
    return this.http.get<Submission[]>(`${this.base}/tasks/${taskId}/submissions/`);
  }

  create(taskId: string, payload: SubmissionCreatePayload): Observable<Submission> {
    return this.http.post<Submission>(`${this.base}/tasks/${taskId}/submissions/`, payload);
  }

  detail(id: string): Observable<Submission> {
    return this.http.get<Submission>(`${this.base}/submissions/${id}/`);
  }

  mine(): Observable<PaginatedResponse<Submission>> {
    return this.http.get<PaginatedResponse<Submission>>(`${this.base}/submissions/my/`);
  }

  pendingReview(): Observable<PaginatedResponse<Submission>> {
    return this.http.get<PaginatedResponse<Submission>>(
      `${this.base}/submissions/pending-review/`
    );
  }

  review(submissionId: string, payload: ReviewCreatePayload): Observable<Review> {
    return this.http.post<Review>(
      `${this.base}/submissions/${submissionId}/reviews/`,
      payload
    );
  }

  approve(submissionId: string): Observable<Submission> {
    return this.http.post<Submission>(`${this.base}/submissions/${submissionId}/approve/`, {});
  }

  reject(submissionId: string, reason = ""): Observable<Submission> {
    return this.http.post<Submission>(`${this.base}/submissions/${submissionId}/reject/`, {
      reason
    });
  }

  myReviews(): Observable<PaginatedResponse<Review>> {
    return this.http.get<PaginatedResponse<Review>>(`${this.base}/reviews/my/`);
  }
}
