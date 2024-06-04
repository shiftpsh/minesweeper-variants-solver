import styled from "@emotion/styled";
import { useEffect, useRef, useState } from "react";
import DebugCell from "./DebugCell";
import { cropAndDetectEdges } from "./utils/image/cropAndDetectEdges";
import { FeatureMatrix, detectFeatures } from "./utils/image/detectFeatures";
import { useScreenRecord } from "./utils/useScreenRecording";

const SplitCanvasRow = styled.div`
  width: 100%;
  display: flex;
  gap: 16px;
  align-items: center;
`;

const Screen = styled.canvas`
  flex: 1;
  min-width: 0;
`;

const DebugScreenContainer = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
`;

const DebugTableOverlay = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
`;

const DebugTable = styled.table`
  flex: 1;
  max-width: 100%;
  max-height: 100%;
  aspect-ratio: 1;
  text-align: center;
  border-collapse: collapse;
  border-spacing: 0;
  table-layout: fixed;
`;

function App() {
  const screen = useScreenRecord();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasDebugRef = useRef<HTMLCanvasElement>(null);

  const [board, setBoard] = useState<FeatureMatrix | null>(null);

  useEffect(() => {
    if (!screen.isRecording) return undefined;
    const interval = setInterval(() => {
      if (!screen.isRecording || !canvasRef.current) return;
      screen.updateToCanvas(canvasRef.current);
    }, 30);
    return () => clearInterval(interval);
  }, [screen.isRecording, canvasRef, screen]);

  useEffect(() => {
    if (!canvasDebugRef.current) return undefined;
    const interval = setInterval(() => {
      const promise = () =>
        new Promise<void>((resolve) => {
          if (!canvasDebugRef.current) return undefined;
          if (!screen.isRecording || !canvasRef.current) return;

          const canvasImage = canvasRef.current
            .getContext("2d")
            ?.getImageData(
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height
            );

          if (!canvasImage) return console.error("No canvas image");

          const srcWidth = canvasRef.current.width;
          const srcHeight = canvasRef.current.height;

          const {
            dstEdgesX,
            dstEdgesY,
            dstWidth: edgeDetectionWidth,
            dstHeight: edgeDetectionHeight,
            debugImage: edgeDetectionImage,
          } = cropAndDetectEdges({
            src: canvasImage.data,
            width: srcWidth,
            height: srcHeight,
          });

          const {
            features,
            dstWidth,
            dstHeight,
            debugImage: newImage,
          } = detectFeatures({
            src: edgeDetectionImage,
            width: edgeDetectionWidth,
            height: edgeDetectionHeight,
            edgesX: dstEdgesX,
            edgesY: dstEdgesY,
          });

          setBoard(features);

          canvasDebugRef.current.width = dstWidth;
          canvasDebugRef.current.height = dstHeight;
          canvasDebugRef.current
            .getContext("2d")
            ?.putImageData(
              new ImageData(
                new Uint8ClampedArray(newImage),
                dstWidth,
                dstHeight
              ),
              0,
              0
            );

          canvasRef.current.style.aspectRatio = `${srcWidth}/${srcHeight}`;
          canvasDebugRef.current.style.aspectRatio = `${dstWidth}/${dstHeight}`;

          resolve();
        });

      promise();
    }, 100);
    return () => clearInterval(interval);
  });

  return (
    <>
      <button onClick={() => screen.startRecording()}>Start Recording</button>
      <SplitCanvasRow>
        <Screen ref={canvasRef} />
        <DebugScreenContainer>
          <Screen ref={canvasDebugRef} />
          <DebugTableOverlay>
            {board ? (
              <>
                <DebugTable>
                  <tbody>
                    {board.map((row, i) => (
                      <tr
                        key={i}
                        style={{ height: `calc(100% / ${board.length})` }}
                      >
                        {row.map((cell, j) => (
                          <DebugCell
                            key={j}
                            style={{
                              width: `calc(100% / ${row.length})`,
                            }}
                            tile={cell}
                          />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </DebugTable>
              </>
            ) : (
              <>No board found.</>
            )}
          </DebugTableOverlay>
        </DebugScreenContainer>
      </SplitCanvasRow>
      <h1>Vite + React</h1>
      <div className="card">
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
