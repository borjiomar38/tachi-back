import { create } from 'zustand';

interface ReleaseHistoryState {
  locales: Record<string, string>;
  setLocale: (id: string, locale: string) => void;
}

export const useReleaseHistoryStore = create<ReleaseHistoryState>((set) => ({
  locales: {},
  setLocale: (id, locale) =>
    set((state) => ({ locales: { ...state.locales, [id]: locale } })),
}));
