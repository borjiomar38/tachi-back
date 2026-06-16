import { create } from 'zustand';

import type { Outputs } from '@/server/router';

type MetadataValue =
  Outputs['contentPolicy']['metadataTranslationGate']['blockedValues'][number];

interface ContentPolicySelectionStore {
  selectedKeys: Set<string>;
  setSelectedValues: (values: readonly MetadataValue[]) => void;
  toggleValue: (value: MetadataValue) => void;
  selectValues: (values: readonly MetadataValue[]) => void;
  clearValues: () => void;
}

export const useContentPolicySelectionStore =
  create<ContentPolicySelectionStore>((set) => ({
    selectedKeys: new Set<string>(),
    setSelectedValues: (values) => {
      set({
        selectedKeys: new Set(
          values.map((value) => buildMetadataValueKey(value))
        ),
      });
    },
    toggleValue: (value) => {
      set((state) => {
        const selectedKeys = new Set(state.selectedKeys);
        const key = buildMetadataValueKey(value);

        if (selectedKeys.has(key)) {
          selectedKeys.delete(key);
        } else {
          selectedKeys.add(key);
        }

        return {
          selectedKeys,
        };
      });
    },
    selectValues: (values) => {
      set((state) => {
        const selectedKeys = new Set(state.selectedKeys);

        for (const value of values) {
          selectedKeys.add(buildMetadataValueKey(value));
        }

        return {
          selectedKeys,
        };
      });
    },
    clearValues: () => {
      set({
        selectedKeys: new Set<string>(),
      });
    },
  }));

export function buildMetadataValueKey(input: {
  field: string;
  normalizedValue: string;
}) {
  return `${input.field}:${input.normalizedValue}`;
}
