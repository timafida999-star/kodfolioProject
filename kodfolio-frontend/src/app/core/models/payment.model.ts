export type PaymentStatus = "pending" | "held" | "released" | "refunded" | "failed";

export type TransactionType =
  | "escrow_fund"
  | "platform_fee"
  | "mentor_payout"
  | "student_payout"
  | "refund";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: string;
  user_email: string | null;
  description: string;
  stripe_transfer_id: string;
  created_at: string;
}

export interface Payment {
  id: string;
  task_id: string;
  task_title: string;
  amount: string;
  platform_fee: string;
  mentor_fee: string;
  student_payout: string;
  status: PaymentStatus;
  is_mock: boolean;
  held_at: string | null;
  released_at: string | null;
  refunded_at: string | null;
  created_at: string;
  transactions: Transaction[];
}

export interface SplitsPreview {
  amount: string;
  platform_fee: string;
  mentor_fee: string;
  student_payout: string;
  platform_fee_pct: string;
  mentor_fee_pct: string;
}
