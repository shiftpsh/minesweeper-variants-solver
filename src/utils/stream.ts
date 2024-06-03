interface FixedMediaDevices extends MediaDevices {
  getDisplayMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
}

interface FixedMediaTrackConstraints extends MediaTrackConstraints {
  cursor: ConstrainDOMString;
}

interface FixedMediaStreamConstraints extends MediaStreamConstraints {
  video?: FixedMediaTrackConstraints | boolean;
  audio?: FixedMediaTrackConstraints | boolean;
}

const DISPLAY_MEDIA_OPTIONS: FixedMediaStreamConstraints = {
  video: {
    cursor: "always",
  },
  audio: false,
};

interface Configuration {
  onDestroy?: () => void;
}

export default class StreamDisplay {
  static readonly DEFAULT_SCAN_INTERVAL_MS = 1000;

  private video: HTMLVideoElement;

  private canvas: HTMLCanvasElement;

  private canvasContext: CanvasRenderingContext2D;

  private options?: Configuration;

  private isCapturingPrivate: boolean = false;

  streamHeight: number = 0;

  streamWidth: number = 0;

  constructor(options?: Configuration) {
    this.video = document.createElement("video");
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("willReadFrequently", "true");
    this.options = options;

    const contextLarge = this.canvas.getContext("2d");
    if (contextLarge === null) {
      throw new Error("Cannot initialize canvas context");
    }

    this.canvasContext = contextLarge;
    this.video.addEventListener("resize", this.setupCanvas);
  }

  startCapture = async (callback?: (image: ImageData) => void) => {
    const devices = navigator.mediaDevices as FixedMediaDevices;
    try {
      this.video.srcObject = await devices.getDisplayMedia(
        DISPLAY_MEDIA_OPTIONS
      );

      this.video.play();
      this.video.srcObject.getTracks().forEach((track) => {
        // track.addEventListener('mute', () => {
        // console.error('[srcObject] track muted');
        // this.stopCapture();
        // });
        track.addEventListener("ended", () => {
          console.error("[srcObject] track ended");
          this.stopCapture();
        });
      });
      // this.video.srcObject.addEventListener('inactive', () => {
      // console.error('[srcObject] inactive');
      // this.stopCapture();
      // });
      this.video.srcObject.addEventListener("removetrack", () => {
        console.error("[srcObject] removetrack");
        this.stopCapture();
      });

      this.setupCanvas();
      this.capture();
      this.isCapturingPrivate = true;
      if (callback !== undefined) {
        callback(this.capture());
      }
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") {
          alert("Please allow screen sharing.");
        }
      }
      console.error(err);
      this.stopCapture();
    }
  };

  capture = () => {
    this.drawVideoToCanvas();
    return this.getImageData();
  };

  captureBlob = (): Promise<Blob | null> => {
    this.drawVideoToCanvas();
    return new Promise((resolve: BlobCallback) => {
      this.canvas.toBlob(resolve);
    });
  };

  renderToCanvas = (propCanvas: HTMLCanvasElement) => {
    const { streamHeight, streamWidth, video } = this;
    const propCanvasContext = propCanvas.getContext("2d");
    if (propCanvasContext !== null) {
      let scale = 1;
      let originalMaxOfWidthAndHeight = Math.max(streamWidth, streamHeight);
      while (originalMaxOfWidthAndHeight > 2400) {
        scale *= 2;
        originalMaxOfWidthAndHeight /= 2;
      }
      propCanvas.width = streamWidth / scale;
      propCanvas.height = streamHeight / scale;
      propCanvasContext.drawImage(
        video,
        0,
        0,
        propCanvas.width,
        propCanvas.height
      );
    }
  };

  stopCapture = () => {
    if (this.options?.onDestroy !== undefined) {
      this.options.onDestroy();
    }
    if (this.video.srcObject === null) return;
    const videoSource = this.video.srcObject as MediaStream;
    const tracks = videoSource.getTracks();

    tracks.forEach((track) => track.stop());
    this.isCapturingPrivate = false;
  };

  get isCapturing() {
    return this.isCapturingPrivate;
  }

  private setupCanvas = () => {
    const videoSource = this.video.srcObject as MediaStream;
    const videoTrack = videoSource.getVideoTracks()[0];

    const { height, width } = videoTrack.getSettings();

    // XXX
    this.streamWidth = width || 1920;
    this.streamHeight = height || 1080;

    this.canvas.height = this.streamHeight;
    this.canvas.width = this.streamWidth;

    while (this.canvas.width > 1920) {
      this.canvas.width /= 2;
      this.canvas.height /= 2;
    }
  };

  private drawVideoToCanvas() {
    const { video, canvasContext: canvasContextLarge } = this;
    canvasContextLarge.drawImage(
      video,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
  }

  private getImageData(): ImageData {
    const {
      streamHeight,
      streamWidth,
      canvasContext: canvasContextLarge,
    } = this;
    return canvasContextLarge.getImageData(0, 0, streamWidth, streamHeight);
  }
}
