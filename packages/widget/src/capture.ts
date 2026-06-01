import type { CaptureArea, FeedbackType } from "@changethis/shared";

type CaptureFeedbackScreenshotParams = {
  type: FeedbackType;
  captureArea?: CaptureArea;
  captureViewport: (area?: CaptureArea) => Promise<string | undefined>;
  capturePageFeedbackPreview: () => Promise<string | undefined>;
  warn?: (message: string, error: unknown) => void;
};

export async function captureFeedbackScreenshot(params: CaptureFeedbackScreenshotParams): Promise<string | undefined> {
  try {
    if (params.type === "screenshot" && params.captureArea) {
      return await params.captureViewport(params.captureArea);
    }

    if (params.type === "pin") {
      return await params.captureViewport();
    }

    if (params.type === "comment") {
      return await params.capturePageFeedbackPreview();
    }
  } catch (error) {
    params.warn?.("[ChangeThis] Feedback screenshot skipped after capture failure", error);
  }

  return undefined;
}
