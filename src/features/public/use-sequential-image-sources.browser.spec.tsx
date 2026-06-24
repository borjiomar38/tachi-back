import { act } from 'react';
import { expect, test } from 'vitest';

import { useSequentialImageSources } from '@/features/public/use-sequential-image-sources';
import { page, render } from '@/tests/utils';

const imageSources = ['/first.webp', '/second.webp', '/third.webp'] as const;

const SequentialImagesTest = () => {
  const sequencedImages = useSequentialImageSources({ sources: imageSources });

  return (
    <div>
      {sequencedImages.sources.map((source, index) => (
        <img
          key={imageSources[index]}
          data-testid={`image-${index}`}
          src={source}
          alt={`Image ${index + 1}`}
          onLoad={() => sequencedImages.completeImage(index)}
          onError={() => sequencedImages.completeImage(index)}
        />
      ))}
    </div>
  );
};

const getImage = (testId: string): HTMLImageElement =>
  page.getByTestId(testId).element() as HTMLImageElement;

const completeImage = (image: HTMLImageElement, eventName: 'error' | 'load') => {
  act(() => {
    image.dispatchEvent(new Event(eventName, { bubbles: true }));
  });
};

test('does not assign later image src values until the previous image loads', async () => {
  render(<SequentialImagesTest />);

  expect(getImage('image-0').getAttribute('src')).toBe(imageSources[0]);
  expect(getImage('image-1').getAttribute('src')).toBeNull();
  expect(getImage('image-2').getAttribute('src')).toBeNull();

  completeImage(getImage('image-0'), 'load');
  await expect
    .poll(() => getImage('image-1').getAttribute('src'))
    .toBe(imageSources[1]);
  expect(getImage('image-2').getAttribute('src')).toBeNull();

  completeImage(getImage('image-1'), 'load');
  await expect
    .poll(() => getImage('image-2').getAttribute('src'))
    .toBe(imageSources[2]);
});

test('continues the sequence when an image fails to load', async () => {
  render(<SequentialImagesTest />);

  completeImage(getImage('image-0'), 'error');
  await expect
    .poll(() => getImage('image-1').getAttribute('src'))
    .toBe(imageSources[1]);

  completeImage(getImage('image-1'), 'error');
  await expect
    .poll(() => getImage('image-2').getAttribute('src'))
    .toBe(imageSources[2]);
});
