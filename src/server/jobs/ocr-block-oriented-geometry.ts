import { type NormalizedOcrPage } from '@/server/provider-gateway/schema';

type OcrBlock = NormalizedOcrPage['blocks'][number];
type OcrOrientedGeometry = Required<
  Pick<
    OcrBlock,
    'angle' | 'orientedHeight' | 'orientedWidth' | 'orientedX' | 'orientedY'
  >
>;

type OcrPoint = {
  x: number;
  y: number;
};

type PlacementClipBounds = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

export function hasOcrBlockOrientedGeometry(
  block: OcrBlock
): block is OcrBlock & OcrOrientedGeometry {
  return (
    Number.isFinite(block.angle) &&
    block.orientedHeight != null &&
    Number.isFinite(block.orientedHeight) &&
    block.orientedHeight > 0 &&
    block.orientedWidth != null &&
    Number.isFinite(block.orientedWidth) &&
    block.orientedWidth > 0 &&
    block.orientedX != null &&
    Number.isFinite(block.orientedX) &&
    block.orientedY != null &&
    Number.isFinite(block.orientedY)
  );
}

export function mergeOcrBlockOrientedGeometry(
  blocks: readonly OcrBlock[]
): OcrOrientedGeometry | null {
  if (blocks.length === 0 || !blocks.every(hasOcrBlockOrientedGeometry)) {
    return null;
  }

  const angle = getRepresentativeOcrAngle(blocks.map((block) => block.angle));
  const points = blocks.flatMap(getOcrOrientedGeometryCorners);
  return getOcrOrientedGeometryFromPoints(points, angle);
}

export function scaleOcrBlockOrientedGeometryForPlacement(input: {
  block: OcrBlock;
  clipBounds: PlacementClipBounds;
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
}): OcrOrientedGeometry | null {
  if (
    !hasOcrBlockOrientedGeometry(input.block) ||
    !isOcrBlockFullyInsidePlacement(input)
  ) {
    return null;
  }

  const points = getOcrOrientedGeometryCorners(input.block).map((point) => ({
    x: (point.x - input.offsetX) * input.scaleX,
    y: (point.y - input.offsetY) * input.scaleY,
  }));
  const radians = (input.block.angle * Math.PI) / 180;
  const transformedHorizontalX = Math.cos(radians) * input.scaleX;
  const transformedHorizontalY = Math.sin(radians) * input.scaleY;
  const angle =
    (Math.atan2(transformedHorizontalY, transformedHorizontalX) * 180) /
    Math.PI;

  return getOcrOrientedGeometryFromPoints(points, angle);
}

function isOcrBlockFullyInsidePlacement(
  input: Parameters<typeof scaleOcrBlockOrientedGeometryForPlacement>[0]
) {
  const left = input.block.x - input.offsetX;
  const top = input.block.y - input.offsetY;
  const right = left + input.block.width;
  const bottom = top + input.block.height;
  const epsilon = 0.01;
  return (
    left >= input.clipBounds.left - epsilon &&
    top >= input.clipBounds.top - epsilon &&
    right <= input.clipBounds.right + epsilon &&
    bottom <= input.clipBounds.bottom + epsilon
  );
}

function getOcrOrientedGeometryCorners(
  geometry: OcrOrientedGeometry
): OcrPoint[] {
  const radians = (geometry.angle * Math.PI) / 180;
  const horizontalX = Math.cos(radians);
  const horizontalY = Math.sin(radians);
  const verticalX = -horizontalY;
  const verticalY = horizontalX;
  const centerX = geometry.orientedX + geometry.orientedWidth / 2;
  const centerY = geometry.orientedY + geometry.orientedHeight / 2;
  const halfWidth = geometry.orientedWidth / 2;
  const halfHeight = geometry.orientedHeight / 2;

  return [
    {
      x: centerX - horizontalX * halfWidth - verticalX * halfHeight,
      y: centerY - horizontalY * halfWidth - verticalY * halfHeight,
    },
    {
      x: centerX + horizontalX * halfWidth - verticalX * halfHeight,
      y: centerY + horizontalY * halfWidth - verticalY * halfHeight,
    },
    {
      x: centerX + horizontalX * halfWidth + verticalX * halfHeight,
      y: centerY + horizontalY * halfWidth + verticalY * halfHeight,
    },
    {
      x: centerX - horizontalX * halfWidth + verticalX * halfHeight,
      y: centerY - horizontalY * halfWidth + verticalY * halfHeight,
    },
  ];
}

function getOcrOrientedGeometryFromPoints(
  points: readonly OcrPoint[],
  angle: number
): OcrOrientedGeometry {
  const radians = (angle * Math.PI) / 180;
  const horizontalX = Math.cos(radians);
  const horizontalY = Math.sin(radians);
  const verticalX = -horizontalY;
  const verticalY = horizontalX;
  const horizontalCoordinates = points.map(
    (point) => point.x * horizontalX + point.y * horizontalY
  );
  const verticalCoordinates = points.map(
    (point) => point.x * verticalX + point.y * verticalY
  );
  const minHorizontal = Math.min(...horizontalCoordinates);
  const maxHorizontal = Math.max(...horizontalCoordinates);
  const minVertical = Math.min(...verticalCoordinates);
  const maxVertical = Math.max(...verticalCoordinates);
  const orientedWidth = Math.max(maxHorizontal - minHorizontal, 1);
  const orientedHeight = Math.max(maxVertical - minVertical, 1);
  const centerHorizontal = (minHorizontal + maxHorizontal) / 2;
  const centerVertical = (minVertical + maxVertical) / 2;
  const centerX = centerHorizontal * horizontalX + centerVertical * verticalX;
  const centerY = centerHorizontal * horizontalY + centerVertical * verticalY;

  return {
    angle: normalizeOcrAngle(angle),
    orientedHeight,
    orientedWidth,
    orientedX: centerX - orientedWidth / 2,
    orientedY: centerY - orientedHeight / 2,
  };
}

function getRepresentativeOcrAngle(angles: readonly number[]) {
  const radians = angles.map((angle) => (angle * Math.PI) / 180);
  const x = radians.reduce((sum, angle) => sum + Math.cos(angle), 0);
  const y = radians.reduce((sum, angle) => sum + Math.sin(angle), 0);
  return normalizeOcrAngle((Math.atan2(y, x) * 180) / Math.PI);
}

function normalizeOcrAngle(angle: number) {
  return ((((angle + 180) % 360) + 360) % 360) - 180;
}
