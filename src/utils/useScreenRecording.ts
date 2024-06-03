import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import StreamDisplay from "./stream";

export const useScreenRecord = () => {
  const screen = useRef<StreamDisplay | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  const handleDestroy = () => {
    setIsRecording(false);
  };

  useEffect(() => {
    screen.current = new StreamDisplay({
      onDestroy: handleDestroy,
    });
  }, []);

  const handleRecordingStart = (callback?: () => void) => {
    screen.current?.startCapture(() => {
      setIsRecording(true);
      if (callback !== undefined) callback();
    });
  };

  const handleRecordingStop = useCallback(() => {
    screen.current?.stopCapture();
    handleDestroy();
  }, []);

  const handleCaptureBlob = async () => {
    const captureBlob = screen.current?.captureBlob();
    if (captureBlob === undefined) return null;
    return captureBlob;
  };

  const handleUpdateCanvas = (canvas: HTMLCanvasElement) => {
    screen.current?.renderToCanvas(canvas);
  };

  const values = useMemo(
    () => ({
      isRecording,
      startRecording: handleRecordingStart,
      stopRecording: handleRecordingStop,
      captureBlob: handleCaptureBlob,
      updateToCanvas: handleUpdateCanvas,
    }),
    [handleRecordingStop, isRecording]
  );

  return values;
};
