import { create } from 'zustand';

import type { Outputs } from '@/server/router';

type ContactStatus = Outputs['contact']['getById']['status'];

interface ContactWorkflowStore {
  internalNotes: string;
  setInternalNotes: (internalNotes: string) => void;
  setStatus: (status: ContactStatus) => void;
  status: ContactStatus;
  hydrate: (input: {
    internalNotes: string | null | undefined;
    status: ContactStatus;
  }) => void;
}

export const useContactWorkflowStore = create<ContactWorkflowStore>((set) => ({
  hydrate: (input) =>
    set({
      internalNotes: input.internalNotes ?? '',
      status: input.status,
    }),
  internalNotes: '',
  setInternalNotes: (internalNotes) => set({ internalNotes }),
  setStatus: (status) => set({ status }),
  status: 'unread',
}));
