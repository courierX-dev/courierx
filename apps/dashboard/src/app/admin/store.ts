import { create } from "zustand";

interface AdminState {
  apiKey: string | null;
  setApiKey: (key: string) => void;
  logout: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  apiKey: typeof window !== 'undefined' ? localStorage.getItem('cx_admin_key') : null,
  setApiKey: (key) => {
    localStorage.setItem('cx_admin_key', key);
    set({ apiKey: key });
  },
  logout: () => {
    localStorage.removeItem('cx_admin_key');
    set({ apiKey: null });
  },
}));
