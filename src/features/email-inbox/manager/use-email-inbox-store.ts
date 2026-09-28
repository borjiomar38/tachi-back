import { create } from 'zustand';

export type EmailInboxLiveState =
  | 'connecting'
  | 'databaseOnly'
  | 'live'
  | 'reconnecting';

interface EmailInboxStore {
  liveState: EmailInboxLiveState;
  selectedThreadId?: string;
  selectThread: (selectedThreadId?: string) => void;
  setLiveState: (liveState: EmailInboxLiveState) => void;
}

export const useEmailInboxStore = create<EmailInboxStore>((set) => ({
  liveState: 'connecting',
  selectThread: (selectedThreadId) => set({ selectedThreadId }),
  selectedThreadId: undefined,
  setLiveState: (liveState) => set({ liveState }),
}));
