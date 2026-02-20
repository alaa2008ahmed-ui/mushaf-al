import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AppSettingsState {
  showSajda: boolean;
  showMarquee: boolean;
  toggleSajda: () => void;
  toggleMarquee: () => void;
}

export const useAppSettings = create<AppSettingsState>()(
  persist(
    (set) => ({
      showSajda: true,
      showMarquee: true,
      toggleSajda: () => set((state) => ({ showSajda: !state.showSajda })),
      toggleMarquee: () => set((state) => ({ showMarquee: !state.showMarquee })),
    }),
    {
      name: 'app-settings-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
