import tiles from "../../tiles";

const arrayDiff = (arr1: number[], arr2: number[]) => {
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) sum++;
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
  const arr96by96 = new Array(96 * 96).fill(0);

  if (x2 - x1 >= 96 || y2 - y1 >= 96) {
    for (let srcI = 0; srcI < x2 - x1; srcI++) {
      for (let srcJ = 0; srcJ < y2 - y1; srcJ++) {
        const dstI = Math.round((srcI * 96) / (x2 - x1));
        const dstJ = Math.round((srcJ * 96) / (y2 - y1));
        const srcIndex = (srcI + x1) * 4 + (srcJ + y1) * 4 * srcWidth;
        const dstIndex = dstI * 96 + dstJ;
        if (src[srcIndex + 3] === 255) arr96by96[dstIndex] = 1;
      }
    }
  } else {
    for (let dstI = 0; dstI < 96; dstI++) {
      for (let dstJ = 0; dstJ < 96; dstJ++) {
        const srcI = Math.round((dstI * (x2 - x1)) / 96);
        const srcJ = Math.round((dstJ * (y2 - y1)) / 96);
        const srcIndex = (srcI + x1) * 4 + (srcJ + y1) * 4 * srcWidth;
        const dstIndex = dstI * 96 + dstJ;
        if (src[srcIndex + 3] === 255) arr96by96[dstIndex] = 1;
      }
    }
  }

  let minDiff = Infinity;
  let minDiffClassification: string | null = "null";

  tiles.forEach((tile) => {
    const diff = arrayDiff(tile.data, arr96by96);
    if (tile.name === "10" || tile.name === "null") {
      console.log(arr96by96);
      console.log(tile.name, diff);
    }
    if (diff < minDiff) {
      minDiff = diff;
      minDiffClassification = tile.name;
    }
  });

  return minDiffClassification;
};
