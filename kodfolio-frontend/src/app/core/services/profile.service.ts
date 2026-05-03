import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import {
  CompanyProfile,
  Profile,
  ProfileSkill
} from "../models/user.model";

@Injectable({ providedIn: "root" })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getMyProfile(): Observable<Profile | CompanyProfile> {
    return this.http.get<Profile | CompanyProfile>(`${this.base}/profiles/me/`);
  }

  updateMyProfile(payload: Partial<Profile>): Observable<Profile>;
  updateMyProfile(payload: Partial<CompanyProfile>): Observable<CompanyProfile>;
  updateMyProfile(payload: Partial<Profile> | Partial<CompanyProfile>): Observable<Profile | CompanyProfile> {
    return this.http.patch<Profile | CompanyProfile>(`${this.base}/profiles/me/`, payload);
  }

  getPublicProfile(userId: string): Observable<Profile> {
    return this.http.get<Profile>(`${this.base}/profiles/${userId}/`);
  }

  addSkill(skillId: string, proficiency = 3): Observable<ProfileSkill> {
    return this.http.post<ProfileSkill>(`${this.base}/profiles/me/skills/`, {
      skill_id: skillId,
      proficiency
    });
  }

  removeSkill(skillId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/profiles/me/skills/${skillId}/`);
  }
}
