import tiles from "../../tiles";

// TODO
// This is a POC; change this to a more efficient algorithm in the future
const DISPLACEMENT_CHECK_THRESHOLD = 2;
const DISPLACEMENT_ARRAY_SIZE = DISPLACEMENT_CHECK_THRESHOLD * 2 + 1;

const arrayDiff = (arr1: Uint8ClampedArray, arr2: Uint8ClampedArray) => {
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    let xor = arr1[i] ^ arr2[i];
    while (xor) {
      sum += xor & 1;
      xor >>= 1;
    }
  }
  return sum;
};

export const classify = ({
  src,
  srcWidth,
  crop,
}: {
  src: Uint8ClampedArray;
  srcWidth: number;
  srcHeight: number;
  crop: {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
  };
}) => {
  const { x1, x2, y1, y2 } = crop;
  const arr96by96Displaced = new Array(
    DISPLACEMENT_ARRAY_SIZE * DISPLACEMENT_ARRAY_SIZE
  )
    .fill(null)
    .map(() => new Uint8ClampedArray((96 * 96) / 8));

  if (x2 - x1 >= 96 || y2 - y1 >= 96) {
    for (let srcI = 0; srcI < x2 - x1; srcI++) {
      for (let srcJ = 0; srcJ < y2 - y1; srcJ++) {
        const dstI = Math.round((srcI * 96) / (x2 - x1));
        const dstJ = Math.round((srcJ * 96) / (y2 - y1));
        const srcIndex = (srcI + x1) * 4 + (srcJ + y1) * 4 * srcWidth;
        if (src[srcIndex + 3] === 255) {
          for (
            let dx = -DISPLACEMENT_CHECK_THRESHOLD;
            dx <= DISPLACEMENT_CHECK_THRESHOLD;
            dx++
          ) {
            if (dstI + dx < 0 || dstI + dx >= 96) continue;
            for (
              let dy = -DISPLACEMENT_CHECK_THRESHOLD;
              dy <= DISPLACEMENT_CHECK_THRESHOLD;
              dy++
            ) {
              if (dstJ + dy < 0 || dstJ + dy >= 96) continue;
              const dstIndexBase = (dstI + dx) * 96 + (dstJ + dy);
              const dstIndex = dstIndexBase >> 3;
              const dstBit = dstIndexBase & 0b111;
              arr96by96Displaced[
                (dx + DISPLACEMENT_CHECK_THRESHOLD) * DISPLACEMENT_ARRAY_SIZE +
                  (dy + DISPLACEMENT_CHECK_THRESHOLD)
              ][dstIndex] |= 1 << dstBit;
            }
          }
        }
      }
    }
  } else {
    for (let dstI = 0; dstI < 96; dstI++) {
      for (let dstJ = 0; dstJ < 96; dstJ++) {
        const srcI = Math.round((dstI * (x2 - x1)) / 96);
        const srcJ = Math.round((dstJ * (y2 - y1)) / 96);
        const srcIndex = (srcI + x1) * 4 + (srcJ + y1) * 4 * srcWidth;
        if (src[srcIndex + 3] === 255) {
          for (
            let dx = -DISPLACEMENT_CHECK_THRESHOLD;
            dx <= DISPLACEMENT_CHECK_THRESHOLD;
            dx++
          ) {
            if (dstI + dx < 0 || dstI + dx >= 96) continue;
            for (
              let dy = -DISPLACEMENT_CHECK_THRESHOLD;
              dy <= DISPLACEMENT_CHECK_THRESHOLD;
              dy++
            ) {
              if (dstJ + dy < 0 || dstJ + dy >= 96) continue;
              const dstIndexBase = (dstI + dx) * 96 + (dstJ + dy);
              const dstIndex = dstIndexBase >> 3;
              const dstBit = dstIndexBase & 0b111;
              arr96by96Displaced[
                (dx + DISPLACEMENT_CHECK_THRESHOLD) * DISPLACEMENT_ARRAY_SIZE +
                  (dy + DISPLACEMENT_CHECK_THRESHOLD)
              ][dstIndex] |= 1 << dstBit;
            }
          }
        }
      }
    }
  }

  let minDiff = Infinity;
  let minDiffClassification: string | null = "null";

  tiles.forEach((tile) => {
    const diff = arr96by96Displaced.reduce(
      (acc, cur) => Math.min(acc, arrayDiff(tile.data, cur)),
      Infinity
    );
    if (diff < minDiff) {
      minDiff = diff;
      minDiffClassification = tile.name;
    }
  });

  return minDiffClassification;
};
