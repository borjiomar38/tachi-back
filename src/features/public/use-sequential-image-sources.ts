import { useCallback, useMemo, useState } from 'react';

export interface UseSequentialImageSourcesOptions {
  sources: readonly string[];
}

export interface UseSequentialImageSourcesResult {
  sources: readonly (string | undefined)[];
  completeImage: (index: number) => void;
}

export const useSequentialImageSources = (
  options: UseSequentialImageSourcesOptions
): UseSequentialImageSourcesResult => {
  const [activeIndex, setActiveIndex] = useState(0);

  const sequencedSources = useMemo(
    () =>
      options.sources.map((source, index) =>
        index <= activeIndex ? source : undefined
      ),
    [activeIndex, options.sources]
  );

  const completeImage = useCallback(
    (index: number) => {
      setActiveIndex((currentIndex) =>
        currentIndex === index
          ? Math.min(index + 1, options.sources.length - 1)
          : currentIndex
      );
    },
    [options.sources.length]
  );

  return {
    completeImage,
    sources: sequencedSources,
  };
};
