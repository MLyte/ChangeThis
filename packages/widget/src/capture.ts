import type { CaptureArea, FeedbackType, PinTarget } from "@changethis/shared";

type CaptureViewportOptions = {
  pinTargets?: PinTarget[];
};

type CaptureFeedbackScreenshotParams = {
  type: FeedbackType;
  captureArea?: CaptureArea;
  pinTargets?: PinTarget[];
  captureViewport: (area?: CaptureArea, options?: CaptureViewportOptions) => Promise<string | undefined>;
  capturePageFeedbackPreview: () => Promise<string | undefined>;
  warn?: (message: string, error: unknown) => void;
};

export async function captureFeedbackScreenshot(params: CaptureFeedbackScreenshotParams): Promise<string | undefined> {
  try {
    if (params.type === "screenshot" && params.captureArea) {
      return await params.captureViewport(params.captureArea);
    }

    if (params.type === "pin") {
      return await params.captureViewport(undefined, { pinTargets: params.pinTargets });
    }

    if (params.type === "comment") {
      return await params.capturePageFeedbackPreview();
    }
  } catch (error) {
    params.warn?.("[ChangeThis] Feedback screenshot skipped after capture failure", error);
  }

  return undefined;
}
