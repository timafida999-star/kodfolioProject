import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { PaginatedResponse } from "../models/api.model";
import { PortfolioEntry } from "../models/portfolio.model";

@Injectable({ providedIn: "root" })
export class PortfolioService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  myPortfolio(): Observable<PaginatedResponse<PortfolioEntry>> {
    return this.http.get<PaginatedResponse<PortfolioEntry>>(`${this.base}/portfolio/me/`);
  }

  publicPortfolio(userId: string): Observable<PaginatedResponse<PortfolioEntry>> {
    return this.http.get<PaginatedResponse<PortfolioEntry>>(
      `${this.base}/portfolio/${userId}/`
    );
  }

  toggleVisibility(entryId: string, isPublic: boolean): Observable<PortfolioEntry> {
    return this.http.patch<PortfolioEntry>(
      `${this.base}/portfolio/entries/${entryId}/`,
      { is_public: isPublic }
    );
  }
}
