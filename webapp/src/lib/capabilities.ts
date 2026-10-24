import { createContext, useContext } from "react";

export type Capabilities = {
  individualCourses: boolean; needs: boolean; courseOperations: boolean; groups: boolean;
  subscriptions: boolean; messaging: boolean; onlineCourses: boolean; integratedVideo: boolean;
  agenda: boolean; reviews: boolean; progress: boolean; referrals: boolean; payouts: boolean;
  accountDeletion: boolean; accountExport: boolean; serviceOpen?: boolean; demo?: boolean;
};
export const DISABLED: Capabilities = {
  individualCourses: false, needs: false, courseOperations: false, groups: false, subscriptions: false,
  messaging: false, onlineCourses: false, integratedVideo: false, agenda: false, reviews: false,
  progress: false, referrals: false, payouts: false, accountDeletion: false, accountExport: false,
};
export const CapabilitiesContext = createContext({ capabilities: DISABLED, loading: true, offline: false, reload: async () => {} });

export function useCapabilities() { return useContext(CapabilitiesContext); }
