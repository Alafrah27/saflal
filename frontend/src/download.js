export function getApkUrl(value = "") {
  const url = value.trim();
  if (url.startsWith("/") && !url.startsWith("//") && !url.includes("\\"))
    return url;
  try {
    return new URL(url).protocol === "https:" ? url : "";
  } catch {
    return "";
  }
}
