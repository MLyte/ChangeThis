import { missingWidgetBundleResponse, readWidgetBundle, widgetBundleResponse } from "../../lib/widget-bundle";

export async function GET() {
  try {
    const widget = await readWidgetBundle();

    return widgetBundleResponse(widget);
  } catch {
    return missingWidgetBundleResponse();
  }
}
