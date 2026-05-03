import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { PaginatedResponse } from "../models/api.model";
import { Application, Task, TaskCreatePayload, TaskDifficulty, TaskStatus } from "../models/task.model";

export interface TaskFilters {
  difficulty?: TaskDifficulty;
  status?: TaskStatus;
  min_budget?: number;
  max_budget?: number;
  max_hours?: number;
  skill?: string;
  q?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

@Injectable({ providedIn: "root" })
export class TasksService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(filters: TaskFilters = {}): Observable<PaginatedResponse<Task>> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        params = params.set(k, String(v));
      }
    });
    return this.http.get<PaginatedResponse<Task>>(`${this.base}/tasks/`, { params });
  }

  myTasks(): Observable<PaginatedResponse<Task>> {
    return this.http.get<PaginatedResponse<Task>>(`${this.base}/tasks/my/`);
  }

  detail(id: string): Observable<Task> {
    return this.http.get<Task>(`${this.base}/tasks/${id}/`);
  }

  create(payload: TaskCreatePayload): Observable<Task> {
    return this.http.post<Task>(`${this.base}/tasks/`, payload);
  }

  update(id: string, payload: Partial<TaskCreatePayload>): Observable<Task> {
    return this.http.patch<Task>(`${this.base}/tasks/${id}/`, payload);
  }

  cancel(id: string): Observable<Task> {
    return this.http.delete<Task>(`${this.base}/tasks/${id}/`);
  }

  apply(taskId: string, coverLetter: string): Observable<Application> {
    return this.http.post<Application>(`${this.base}/tasks/${taskId}/apply/`, {
      cover_letter: coverLetter
    });
  }

  applications(taskId: string): Observable<PaginatedResponse<Application>> {
    return this.http.get<PaginatedResponse<Application>>(
      `${this.base}/tasks/${taskId}/applications/`
    );
  }

  acceptApplication(taskId: string, applicationId: string): Observable<unknown> {
    return this.http.post(
      `${this.base}/tasks/${taskId}/applications/${applicationId}/accept/`,
      {}
    );
  }

  rejectApplication(taskId: string, applicationId: string): Observable<Application> {
    return this.http.post<Application>(
      `${this.base}/tasks/${taskId}/applications/${applicationId}/reject/`,
      {}
    );
  }

  myApplications(): Observable<PaginatedResponse<Application>> {
    return this.http.get<PaginatedResponse<Application>>(`${this.base}/applications/my/`);
  }

  withdrawApplication(applicationId: string): Observable<Application> {
    return this.http.post<Application>(
      `${this.base}/applications/${applicationId}/withdraw/`,
      {}
    );
  }
}
