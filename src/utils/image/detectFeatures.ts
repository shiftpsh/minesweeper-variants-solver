export type Feature = string | null;
export type FeatureMatrix = Feature[][];

const EDGE_THRESHOLD = 0.05;

const colorDistance = (
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
) => {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return dr * dr + dg * dg + db * db;
};

export const detectFeatures = ({
  src,
  width,
  height,
  edgesX,
  edgesY,
}: {
  src: Uint8ClampedArray;
  width: number;
  height: number;
  edgesX: number[];
  edgesY: number[];
}) => {
  const n = edgesX.length - 1;
  const xOffset = edgesX[0];
  const yOffset = edgesY[0];
  const xSize = edgesX[n] - edgesX[0];
  const ySize = edgesY[n] - edgesY[0];

  const newImage = new Uint8ClampedArray(xSize * ySize * 4);
  const features: FeatureMatrix = new Array(n)
    .fill(null)
    .map(() => new Array(n).fill(null));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      // Cell is bounded by [x1..x2] * [y1..y2]
      const x1 = edgesX[i];
      const x2 = edgesX[i + 1];
      const y1 = edgesY[j];
      const y2 = edgesY[j + 1];

      // Separate background from object
      const colorCounts = new Map<number, number>();

      const edgePixels = Math.ceil(EDGE_THRESHOLD * Math.max(x2 - x1, y2 - y1));

      // Ignore the edges
      for (let x = x1 + edgePixels; x < x2 - edgePixels; x++) {
        for (let y = y1 + edgePixels; y < y2 - edgePixels; y++) {
          const srcIndex = x * 4 + y * 4 * width;
          const r = src[srcIndex];
          const g = src[srcIndex + 1];
          const b = src[srcIndex + 2];
          const color = (r << 16) | (g << 8) | b;
          colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
        }
      }

      // Find the most common color
      let maxColor: number | null = null;
      let secondMaxColor: number | null = null;
      let maxCount = 0;
      let secondMaxCount = 0;
      for (const [color, count] of colorCounts) {
        if (count > maxCount) {
          secondMaxColor = maxColor;
          secondMaxCount = maxCount;
          maxColor = color;
          maxCount = count;
        } else if (count > secondMaxCount) {
          secondMaxColor = color;
          secondMaxCount = count;
        }
      }

      const maxR = (maxColor! >> 16) & 0xff;
      const maxG = (maxColor! >> 8) & 0xff;
      const maxB = maxColor! & 0xff;
      const secondMaxR = (secondMaxColor! >> 16) & 0xff;
      const secondMaxG = (secondMaxColor! >> 8) & 0xff;
      const secondMaxB = secondMaxColor! & 0xff;

      for (let x = x1 + edgePixels; x < x2 - edgePixels; x++) {
        for (let y = y1 + edgePixels; y < y2 - edgePixels; y++) {
          const srcIndex = x * 4 + y * 4 * width;
          const dstIndex = (x - xOffset) * 4 + (y - yOffset) * 4 * xSize;
          const r = src[srcIndex];
          const g = src[srcIndex + 1];
          const b = src[srcIndex + 2];
          if (
            colorDistance(r, g, b, maxR, maxG, maxB) >
            colorDistance(r, g, b, secondMaxR, secondMaxG, secondMaxB)
          ) {
            newImage[dstIndex] = 0;
            newImage[dstIndex + 1] = 0;
            newImage[dstIndex + 2] = 0;
            newImage[dstIndex + 3] = 255;
            features[i][j] = "object";
          } else {
            newImage[dstIndex] = 200;
            newImage[dstIndex + 1] = 200;
            newImage[dstIndex + 2] = 200;
            newImage[dstIndex + 3] = 255;
            features[i][j] = "background";
          }
        }
      }
    }
  }

  return {
    features,
    dstWidth: xSize,
    dstHeight: ySize,
    debugImage: newImage,
  };
};
