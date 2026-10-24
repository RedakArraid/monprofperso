export type Course = {
  id: number; user_id?: number; teacher_id?: number; teacher_name: string; parent_name?: string;
  student_name?: string; subject: string; level: string; day_label?: string; day_num?: string; time?: string;
  price: number; status: string; badge?: string | null; accepted: boolean; payment_status: string;
  participant_role: "parent" | "teacher" | "admin";
  lifecycle_status: string; starts_at: string | null; duration?: string; duration_minutes?: number;
  format: "home" | "online"; location?: string | null; private_address?: string | null;
  meeting_url?: string | null; access_notes?: string | null;
  commission_pct?: number; commission_amount?: number; teacher_net_amount?: number;
};
export type CourseFinance = {
  grossAmount: number; commissionPct: number | null; commissionAmount: number | null; teacherNetAmount: number | null;
  capturedAmount: number; refundAmount: number; refundPendingAmount: number; teacherDue: number | null;
  teacherReleasable: number; teacherReserved: number; teacherPaid: number; reviewRequired: boolean;
};
export type CourseDetail = {
  course: Course;
  contacts: { parentPhone: string | null; teacherPhone: string | null };
  scheduleRequests: { id: number; startAt: string; status: string; proposedBy: number; reason: string; createdAt: string }[];
  reports: { id: number; actorId: number; actorRole: string; outcome: string; note: string; progressSummary?: string; createdAt: string }[];
  events: { id: number; type: string; actorRole: string; createdAt: string; details?: Record<string, unknown> }[];
  review?: { id: number; rating: number; text: string; created_at?: string } | null;
  finance: CourseFinance; permissions: string[]; financialOperations: FinancialOperation[];
};
export type FinancialOperation = {
  id: number; kind: "refund" | "payout"; courseId: number | null; teacherId: number | null;
  amount: number; status: "requested" | "approved" | "verified" | "rejected" | "reversed";
  needsReview?: boolean; decisionReason?: string | null; reason: string; provider: string; beneficiaryPhone: string; providerReference: string | null;
  createdAt: string; verifiedAt: string | null;
};
export type Earnings = {
  total: number; trend: string; stats: { value: string; label: string }[];
  summary: { expected: number; due: number; releasable: number; reserved: number; paid: number };
  payoutRequests: FinancialOperation[];
};
