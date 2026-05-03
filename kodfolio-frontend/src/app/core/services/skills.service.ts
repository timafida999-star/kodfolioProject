import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { Skill } from "../models/user.model";

@Injectable({ providedIn: "root" })
export class SkillsService {
  private readonly http = inject(HttpClient);

  list(): Observable<Skill[]> {
    return this.http.get<Skill[]>(`${environment.apiUrl}/skills/`);
  }
}
