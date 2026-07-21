/* Données de repli (maquette) — même principe que les apps natives */
(function (global) {
  "use strict";

  global.MPP = global.MPP || {};
  global.MPP.Fallback = {
    teachers: [
      { id: 1, initials: "KN", name: "Koffi N'Guessan", subjects: "Maths · Physique-Chimie", rating: 4.9, reviews_count: 128, location: "Cocody", price_per_hour: 4000, accent: "green", verified: true },
      { id: 2, initials: "MT", name: "Mariam Touré", subjects: "Anglais · Espagnol", rating: 5.0, reviews_count: 74, location: "Plateau", price_per_hour: 4500, accent: "orange", verified: true },
    ],
    courses: [
      { id: 1, teacherName: "Koffi N'Guessan", subject: "Maths", level: "3ème", dayLabel: "SAM", dayNum: "22", time: "16h00", duration: "1h30", format: "home", location: "Cocody", price: 6000, status: "upcoming", badge: "Confirmé" },
    ],
    progress: {
      student: "Kouadio", average: "14,2", trend: "+0,8", goal: "Objectif : 15/20 au BEPC",
      subjects: [
        { subject: "Maths", grade: "15/20", fraction: 0.75, warn: false },
        { subject: "Français", grade: "13/20", fraction: 0.65, warn: false },
        { subject: "Physique", grade: "11/20", fraction: 0.55, warn: true },
      ],
    },
    notifications: [
      { icon: "calendar", accent: "green", text: "Rappel : cours de Maths demain à 16h", timeAgo: "il y a 2 h", unread: true, section: "today" },
      { icon: "wallet", accent: "green", text: "Paiement de 6 000 F confirmé", timeAgo: "il y a 6 h", unread: false, section: "today" },
    ],
    wallet: {
      accounts: [{ provider: "orange", label: "Orange Money", balance: 12500 }],
      transactions: [{ label: "Cours Maths", amount: -6000, date: "15 juin" }],
    },
    teacherDashboard: {
      name: "Koffi N'Guessan", revenue: 184000, trend: "+12%",
      stats: [{ value: "14", label: "cours / semaine" }, { value: "4,9", label: "note moyenne" }, { value: "3", label: "nouveaux élèves" }],
      pendingRequests: 2, needsConfirmed: true,
    },
    teacherRequests: [
      { courseId: 1, needId: 1, name: "Cocody", ago: "nouveau", price: 8500, netHourly: 4250, student: "Kouadio · 3ème", subject: "Maths", slot: "Cocody", format: "À domicile", isOpportunity: true },
    ],
    teacherEarnings: {
      total: 184000, trend: "+12%",
      weeks: [{ label: "S1", f: 0.48 }, { label: "S2", f: 0.66 }, { label: "S3", f: 0.58 }, { label: "S4", f: 0.88 }],
      stats: [{ value: "38", label: "cours donnés" }, { value: "52 h", label: "enseignées" }, { value: "3 800", label: "F / h moyen" }],
      payouts: [{ provider: "Retrait Wave", date: "15 juin", amount: 60000, color: "wave" }],
    },
    groups: [
      { id: 1, title: "Maths & Physique-Chimie", tag: "PRÉPA BAC", tag_accent: "orange", detail: "Terminale D · 8 semaines", price: 2000, teacher_name: "Koffi N'Guessan", places_left: 5 },
    ],
    plans: [
      { name: "Essentiel", detail: "1 matière", price: 15000, popular: false, suffix: "/ mois" },
      { name: "Famille", detail: "3 matières", price: 35000, popular: true, suffix: "/ mois" },
    ],
    referral: { code: "MP2-KOADIO", referred: 2, earned: 4000 },
    resources: [
      { id: 1, type: "course", title: "Fiche, Théorème de Thalès", subject_slug: "maths", level: "3eme", program: "standard" },
    ],
    needs: [],
    children: [],
  };
})(window);
