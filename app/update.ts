import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import { Linking, Platform } from "react-native";

export const RELEASES_LATEST_URL =
  "https://api.github.com/repos/LozanoTH/prueba_react_app/releases/latest";

export type ReleaseInfo = {
  latestVersion: string;
  htmlUrl: string | null;
  apkUrl: string | null;
};

export async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
  const response = await fetch(RELEASES_LATEST_URL, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "nexhax-app",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) return null;
  const data = await response.json();
  const latestTag = typeof data?.tag_name === "string" ? data.tag_name : data?.name ?? "";
  const latestVersion = normalizeVersion(latestTag);
  const assets = Array.isArray(data?.assets) ? data.assets : [];
  const asset =
    assets.find((a: any) => a?.name === "app-release.apk") ||
    assets.find((a: any) => typeof a?.name === "string" && a.name.endsWith(".apk"));
  const apkUrl = asset?.browser_download_url ?? null;
  const htmlUrl = data?.html_url ?? null;
  if (!latestVersion) return null;
  return { latestVersion, apkUrl, htmlUrl };
}

export function isNewerVersion(latest: string, current: string) {
  const l = toVersionParts(normalizeVersion(latest));
  const c = toVersionParts(normalizeVersion(current));
  const max = Math.max(l.length, c.length);
  for (let i = 0; i < max; i += 1) {
    const lv = l[i] ?? 0;
    const cv = c[i] ?? 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}

export async function downloadAndInstallApk(apkUrl: string) {
  if (Platform.OS !== "android") {
    await Linking.openURL(apkUrl);
    return;
  }
  const fileUri = FileSystem.cacheDirectory + "app-release.apk";
  const result = await FileSystem.downloadAsync(apkUrl, fileUri);
  const contentUri = await FileSystem.getContentUriAsync(result.uri);
  await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
    data: contentUri,
    flags: 1,
    type: "application/vnd.android.package-archive",
  });
}

function normalizeVersion(value: string) {
  return String(value)
    .trim()
    .replace(/^v/i, "")
    .replace(/[^0-9.]/g, "");
}

function toVersionParts(value: string) {
  return value
    .split(".")
    .filter(Boolean)
    .map((part) => parseInt(part, 10) || 0);
}
