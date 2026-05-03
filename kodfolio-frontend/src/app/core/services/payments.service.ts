import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { PaginatedResponse } from "../models/api.model";
import { Payment, SplitsPreview, Transaction } from "../models/payment.model";

@Injectable({ providedIn: "root" })
export class PaymentsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  myPayments(): Observable<PaginatedResponse<Payment>> {
    return this.http.get<PaginatedResponse<Payment>>(`${this.base}/payments/`);
  }

  myTransactions(): Observable<PaginatedResponse<Transaction>> {
    return this.http.get<PaginatedResponse<Transaction>>(
      `${this.base}/payments/transactions/`
    );
  }

  splitsPreview(amount: number, hasReviews = true): Observable<SplitsPreview> {
    return this.http.post<SplitsPreview>(`${this.base}/payments/splits-preview/`, {
      amount: amount.toFixed(2),
      has_reviews: hasReviews
    });
  }
}
