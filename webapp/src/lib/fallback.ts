/** Empty initial states. Network failures must never manufacture people, courses or revenue. */
export const fallback = {
  teachers: [] as {
    id: number; initials: string; name: string; subjects: string; rating: number;
    reviews_count: number; location: string; price_per_hour: number;
  }[],
  courses: [] as {
    id: number; teacher_name: string; subject: string; level: string; day_label: string;
    day_num: string; time: string; price: number; badge: string; status: string;
    payment_status?: string; accepted?: boolean;
    student_name?: string; parent_name?: string;
  }[],
  progress: {
    average: "—", trend: "", goal: "Aucune progression disponible",
    subjects: [] as { subject: string; grade: string; fraction: number; warn: boolean }[],
  },
  notifications: [] as { text: string; time_ago: string; unread: boolean }[],
  wallet: {
    accounts: [] as { provider: string; number: string }[],
    transactions: [] as { title: string; amount: number; subtitle?: string }[],
  },
  teacherDashboard: {
    name: "", revenue: 0, trend: "", stats: [] as { value: string; label: string }[],
    pendingRequests: 0, needsConfirmed: false,
  },
  teacherRequests: [] as Record<string, unknown>[],
  teacherEarnings: {
    total: 0, trend: "", stats: [] as { value: string; label: string }[],
    payouts: [] as { provider: string; date: string; amount: number }[],
  },
  groups: [] as { id: number; title: string; detail: string; price: number; teacher_name: string }[],
  plans: [] as { name: string; detail: string; price: number; popular: boolean; suffix: string }[],
  referral: { code: "", referred: 0, earned: 0 },
  resources: [] as { id: number; type: string; title: string; level: string }[],
  needs: [] as Record<string, unknown>[],
  children: [] as Record<string, unknown>[],
};
