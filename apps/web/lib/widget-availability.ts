export function isChangeThisWidgetEnabled(value = process.env.ENABLE_CHANGETHIS_WIDGET): boolean {
  const flag = value?.trim().toLowerCase();
  return flag !== "false" && flag !== "0";
}
