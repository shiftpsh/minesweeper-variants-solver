// Since the game is letter/pillarboxed, we can almost always safely ignore:
// top 18%, bottom 5%, left 28%, right 28%
// This is a rough estimate w/out the window title, etc.

const CROP_TOP = 0.18;
const CROP_BOTTOM = 0.05;
const CROP_LEFT = 0.28;
const CROP_RIGHT = 0.28;

export const cropAndDetectEdges = ({
  src,
  width: srcWidth,
  height: srcHeight,
}: {
  src: Uint8ClampedArray;
  width: number;
  height: number;
}) => {
  // Detect edges, and then collect diffs in X and Y
  const cropTopPixels = Math.round(srcHeight * CROP_TOP);
  const cropBottomPixels = Math.round(srcHeight * CROP_BOTTOM);
  const cropLeftPixels = Math.round(srcWidth * CROP_LEFT);
  const cropRightPixels = Math.round(srcWidth * CROP_RIGHT);

  const dstWidth = Math.round(srcWidth - cropLeftPixels - cropRightPixels);
  const dstHeight = Math.round(srcHeight - cropTopPixels - cropBottomPixels);
  const newImage = new Uint8ClampedArray(dstWidth * dstHeight * 4);

  const diffsX = new Uint16Array(dstWidth);
  const diffsY = new Uint16Array(dstHeight);

  for (let dstI = 1; dstI < dstWidth; dstI++) {
    const srcI = dstI + cropLeftPixels;
    for (let dstJ = 1; dstJ < dstHeight; dstJ++) {
      const srcJ = dstJ + cropTopPixels;

      const srcIndex = srcI * 4 + srcJ * 4 * srcWidth;
      const dstIndex = dstI * 4 + dstJ * 4 * dstWidth;
      const left = (srcI - 1) * 4 + srcJ * 4 * srcWidth;
      const top = srcI * 4 + (srcJ - 1) * 4 * srcWidth;
      let mx = 0;
      for (let k = 0; k < 2; k++) {
        const xdiff = Math.abs(src[srcIndex + k] - src[left + k]);
        const ydiff = Math.abs(src[srcIndex + k] - src[top + k]);
        const diff = Math.max(xdiff, ydiff);
        mx = Math.max(mx, diff);
      }
      const isDifferent = mx > 10;
      if (isDifferent) {
        newImage[dstIndex] = 255;
        newImage[dstIndex + 1] = 255;
        newImage[dstIndex + 2] = 255;
        newImage[dstIndex + 3] = 255;

        diffsX[dstI]++;
        diffsY[dstJ]++;
      } else {
        newImage[dstIndex] = 0;
        newImage[dstIndex + 1] = 0;
        newImage[dstIndex + 2] = 0;
        newImage[dstIndex + 3] = 255;
      }
    }
  }

  // Since cropping the top 18% of the screen will almost likely
  // crop off the window title, we can assue that the diffsX / diffsY
  // value of the edges are likely close to max{...diffsX, ...diffsY}.

  // We choose diffsX as the reference value since there are less
  // text artifacts on the X axis.

  const likelyEdgeValue = Math.max(...diffsX);
  const EDGE_DETECT_THRESHOLD = 0.6;

  const edgeCandidatesX = new Array(dstWidth)
    .fill(0)
    .map((_, i) => i)
    .filter((i) => diffsX[i] > likelyEdgeValue * EDGE_DETECT_THRESHOLD);
  const edgeCandidatesY = new Array(dstHeight)
    .fill(0)
    .map((_, i) => i)
    .filter((i) => diffsY[i] > likelyEdgeValue * EDGE_DETECT_THRESHOLD);

  // Edge itself has a width; so for one real edge, there are 1 or 2 edge candidates.
  // So we 'merge' close edge candidates to get the real edge.
  // We assume that the size of one cell is at most min{ 8% dstHeight, 8% dstWidth },
  // and that the edge candidates are at most 1 cell apart.

  // For safety measures, use 6% instead of 8%.
  const ESTIMATED_CELL_SIZE = Math.min(dstHeight, dstWidth) * 0.06;

  const reducedCandidatesX: number[] = [];
  let lastEdgeX = -1;
  for (const edge of edgeCandidatesX) {
    if (lastEdgeX === -1 || edge - lastEdgeX > ESTIMATED_CELL_SIZE) {
      reducedCandidatesX.push(edge);
      lastEdgeX = edge;
    }
  }

  const reducedCandidatesY: number[] = [];
  let lastEdgeY = -1;
  for (const edge of edgeCandidatesY) {
    if (lastEdgeY === -1 || edge - lastEdgeY > ESTIMATED_CELL_SIZE) {
      reducedCandidatesY.push(edge);
      lastEdgeY = edge;
    }
  }

  // None found?
  if (reducedCandidatesX.length === 0 || reducedCandidatesY.length === 0) {
    return {
      edgesX: [],
      edgesY: [],
      dstWidth,
      dstHeight,
      debugImage: newImage,
      boardSize: 0,
      cellSize: 0,
      cellCount: 0,
    };
  }

  // At this stage, with high probability,
  // reducedCandidatesX is the correct edges in X axis.
  const cellCount = reducedCandidatesX.length - 1;
  const boardSize = reducedCandidatesX[cellCount - 1] - reducedCandidatesX[0];
  const cellSize = boardSize / cellCount;

  // For Y, find (cellCount + 1) lines that spans approximately (boardSize).
  // We can assume that the board is a square.
  let yBestStart = -1;
  let yBestSpanValue = Infinity;
  for (let i = 0; i + cellCount < reducedCandidatesY.length; i++) {
    const spanPixels =
      reducedCandidatesY[i + cellCount] - reducedCandidatesY[i];
    if (Math.abs(boardSize - spanPixels) < yBestSpanValue) {
      yBestStart = i;
      yBestSpanValue = Math.abs(boardSize - spanPixels);
    }
  }

  if (yBestStart === -1) {
    return {
      edgesX: [],
      edgesY: [],
      dstWidth,
      dstHeight,
      debugImage: newImage,
      boardSize: 0,
      cellSize: 0,
      cellCount: 0,
    };
  }

  const edgesX = reducedCandidatesX;
  const edgesY = reducedCandidatesY.slice(
    yBestStart,
    yBestStart + cellCount + 1
  );

  for (const edge of edgesX) {
    for (let j = 0; j < dstHeight; j++) {
      const index = edge * 4 + j * 4 * dstWidth;
      newImage[index] = 255;
      newImage[index + 1] = 0;
      newImage[index + 2] = 0;
      newImage[index + 3] = 255;
    }
  }
  for (const edge of edgesY) {
    for (let i = 0; i < dstWidth; i++) {
      const index = i * 4 + edge * 4 * dstWidth;
      newImage[index] = 255;
      newImage[index + 1] = 0;
      newImage[index + 2] = 0;
      newImage[index + 3] = 255;
    }
  }

  return {
    edgesX,
    edgesY,
    dstWidth,
    dstHeight,
    debugImage: newImage,
    boardSize,
    cellSize,
    cellCount,
  };
};
