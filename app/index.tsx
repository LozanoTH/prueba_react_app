import Constants from "expo-constants";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { WebView } from "react-native-webview";
import { useTheme } from "./theme-context";
import { downloadAndInstallApk, fetchLatestRelease, isNewerVersion } from "./update";
export default function HomeScreen() {
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const colors = isDark
    ? {
        surface: "#1C1B1F",
        surfaceVariant: "#2B2930",
        onSurface: "#E6E1E5",
        primary: "#D0BCFF",
        onPrimary: "#381E72",
      }
    : {
        surface: "#FFFBFE",
        surfaceVariant: "#F3EDF7",
        onSurface: "#1C1B1F",
        primary: "#6750A4",
        onPrimary: "#FFFFFF",
      };
  const [html, setHtml] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "offline">("home");
  const [apkUrl, setApkUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const remoteUrl = "https://lozanoth.xzipser.workers.dev";
  const [barWidth, setBarWidth] = useState(0);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const transition = useRef(new Animated.Value(1)).current;
  const tabIndex = useMemo(() => {
    if (activeTab === "offline") return 0;
    if (activeTab === "home") return 1;
    return 2;
  }, [activeTab]);

  useEffect(() => {
    if (!barWidth) return;
    const padding = 18;
    const itemWidth = (barWidth - padding * 2) / 3;
    const target = padding + tabIndex * itemWidth + itemWidth / 2 - 9;
    Animated.timing(indicatorX, {
      toValue: target,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [barWidth, indicatorX, tabIndex]);

  useEffect(() => {
    let isMounted = true;
    const loadHtml = async () => {
      const asset = Asset.fromModule(require("../web/index.html"));
      await asset.downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      return FileSystem.readAsStringAsync(uri);
    };
    const checkOnline = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      try {
        const response = await fetch(remoteUrl, {
          method: "GET",
          signal: controller.signal,
        });
        return response.ok;
      } catch {
        return false;
      } finally {
        clearTimeout(timeout);
      }
    };
    const decideSource = async () => {
      try {
        const htmlString = await loadHtml();
        if (!isMounted) return;
        setHtml(htmlString);
        const online = await checkOnline();
        if (!isMounted) return;
        setActiveTab(online ? "home" : "offline");
        Animated.timing(transition, {
          toValue: online ? 1 : 0,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      } catch {
        if (!isMounted) return;
        setHtml("<h1>Contenido no disponible</h1>");
        setActiveTab("offline");
        Animated.timing(transition, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
    };
    decideSource();
    return () => {
      isMounted = false;
    };
  }, []);
  useEffect(() => {
    let isMounted = true;
    const checkUpdate = async () => {
      try {
        const latest = await fetchLatestRelease();
        if (!latest) return;
        const { latestVersion, apkUrl: latestApkUrl, htmlUrl } = latest;
        const currentVersion = Constants.expoConfig?.version ?? "0.0.0";
        if (isMounted) {
          setApkUrl(latestApkUrl);
        }
        if (!isMounted || !latestVersion) return;
        const isNewer = isNewerVersion(latestVersion, currentVersion);
        if (isMounted) setUpdateAvailable(isNewer && !!latestApkUrl);
        if (isNewer) {
          Alert.alert(
            "Actualizacion disponible",
            `Version nueva: ${latestVersion}\nTu version: ${currentVersion}`,
            [
              {
                text: "Ver release",
                onPress: () => {
                  if (htmlUrl) Linking.openURL(htmlUrl);
                },
              },
              { text: "Luego", style: "cancel" },
            ]
          );
        }
      } catch {
        // ignore network errors
      }
    };
    checkUpdate();
    return () => {
      isMounted = false;
    };
  }, []);
  const downloadAndInstall = async () => {
    if (!apkUrl) {
      Alert.alert("No hay APK", "No se encontro el archivo app-release.apk en el release.");
      return;
    }
    try {
      setDownloading(true);
      await downloadAndInstallApk(apkUrl);
    } catch {
      Alert.alert("Error", "No se pudo descargar o abrir el instalador.");
    } finally {
      setDownloading(false);
    }
  };
  const switchTab = (next: "home" | "offline") => {
    if (next === activeTab) return;
    setActiveTab(next);
    Animated.timing(transition, {
      toValue: next === "home" ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={[styles.container, isDark ? styles.containerDark : styles.containerLight]}>
      <Animated.View
        style={[styles.webviewWrap, { opacity: transition }]}
        pointerEvents={activeTab === "home" ? "auto" : "none"}
      >
        <WebView
          originWhitelist={["*"]}
          source={{ uri: remoteUrl }}
          cacheEnabled
          injectedJavaScriptBeforeContentLoaded={`
            (function() {
              var meta = document.querySelector('meta[name="viewport"]');
              if (!meta) {
                meta = document.createElement('meta');
                meta.name = 'viewport';
                document.head.appendChild(meta);
              }
              meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
            })();
          `}
          scalesPageToFit={false}
          setBuiltInZoomControls={false}
          setDisplayZoomControls={false}
          style={styles.webview}
        />
      </Animated.View>
      <Animated.View
        style={[styles.webviewWrap, { opacity: Animated.subtract(1, transition) }]}
        pointerEvents={activeTab === "offline" ? "auto" : "none"}
      >
        <WebView
          originWhitelist={["*"]}
          source={html ? { html } : undefined}
          injectedJavaScriptBeforeContentLoaded={`
            (function() {
              var meta = document.querySelector('meta[name="viewport"]');
              if (!meta) {
                meta = document.createElement('meta');
                meta.name = 'viewport';
                document.head.appendChild(meta);
              }
              meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
            })();
          `}
          scalesPageToFit={false}
          setBuiltInZoomControls={false}
          setDisplayZoomControls={false}
          style={styles.webview}
        />
      </Animated.View>
      <View style={styles.bottomBar} pointerEvents="box-none">
        <View
          style={[
            styles.bottomBarInner,
            { backgroundColor: colors.surface, borderColor: colors.surfaceVariant },
          ]}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        >
          <Pressable
            style={styles.bottomItem}
            onPress={() => {
              if (html) switchTab("offline");
            }}
          >
            <Text style={[styles.bottomText, { color: colors.onSurface }]}>Offline</Text>
          </Pressable>
          <Pressable
            style={styles.bottomItem}
            onPress={() => switchTab("home")}
          >
            <Text style={[styles.bottomText, { color: colors.onSurface }]}>Home</Text>
          </Pressable>
          <Pressable
            style={styles.bottomItem}
            onPress={() => router.push("/ajustes")}
          >
            <Text style={[styles.bottomText, { color: colors.onSurface }]}>Ajustes</Text>
          </Pressable>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.activeDot,
              { transform: [{ translateX: indicatorX }], backgroundColor: colors.primary },
            ]}
          />
        </View>
      </View>
      {updateAvailable ? (
        <View style={styles.updateWrap} pointerEvents="box-none">
          <Pressable
            style={[
              styles.updateButton,
              { backgroundColor: colors.primary },
              downloading && styles.updateButtonDisabled,
            ]}
            onPress={downloadAndInstall}
            disabled={downloading}
          >
            <Text style={[styles.updateText, { color: colors.onPrimary }]}>
              {downloading ? "Descargando..." : "Descargar update"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerLight: {
    backgroundColor: "#FFFBFE",
  },
  containerDark: {
    backgroundColor: "#121212",
  },
  webview: {
    flex: 1,
    width: "100%",
    backgroundColor: "transparent",
  },
  webviewWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 8,
  },
  bottomBarInner: {
    flexDirection: "row",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 18,
    justifyContent: "space-between",
    position: "relative",
    borderWidth: 1,
  },
  bottomItem: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
  },
  bottomText: {
    fontWeight: "600",
  },
  activeDot: {
    position: "absolute",
    bottom: 4,
    width: 18,
    height: 3,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  updateWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: "center",
  },
  updateButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateText: {
    fontWeight: "600",
  },
});
