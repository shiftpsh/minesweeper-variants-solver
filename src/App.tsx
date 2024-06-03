import styled from "@emotion/styled";
import { useEffect, useRef } from "react";
import { useScreenRecord } from "./utils/useScreenRecording";
import { cropAndDetectEdges } from "./utils/image/cropAndDetectEdges";

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

function App() {
  const screen = useScreenRecord();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasDebugRef = useRef<HTMLCanvasElement>(null);

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
      if (!canvasDebugRef.current) return undefined;
      if (!screen.isRecording || !canvasRef.current) return;

      const canvasImage = canvasRef.current
        .getContext("2d")
        ?.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);

      if (!canvasImage) return console.error("No canvas image");

      const srcWidth = canvasRef.current.width;
      const srcHeight = canvasRef.current.height;

      const { edgesX, edgesY, dstWidth, dstHeight, debugImage } =
        cropAndDetectEdges({
          src: canvasImage.data,
          width: srcWidth,
          height: srcHeight,
        });

      canvasDebugRef.current.width = dstWidth;
      canvasDebugRef.current.height = dstHeight;
      canvasDebugRef.current
        .getContext("2d")
        ?.putImageData(new ImageData(debugImage, dstWidth, dstHeight), 0, 0);

      canvasRef.current.style.aspectRatio = `${srcWidth}/${srcHeight}`;
      canvasDebugRef.current.style.aspectRatio = `${dstWidth}/${dstHeight}`;
    }, 100);
    return () => clearInterval(interval);
  });

  return (
    <>
      <button onClick={() => screen.startRecording()}>Start Recording</button>
      <SplitCanvasRow>
        <Screen ref={canvasRef} />
        <Screen ref={canvasDebugRef} />
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
