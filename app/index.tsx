import Constants from "expo-constants";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import { useEffect, useState } from "react";
import { Alert, Linking, StyleSheet, useColorScheme, View } from "react-native";
import { WebView } from "react-native-webview";
export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadHtml = async () => {
      const asset = Asset.fromModule(require("../web/index.html"));
      await asset.downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      const htmlString = await FileSystem.readAsStringAsync(uri);
      if (isMounted) {
        setHtml(htmlString);
      }
    };
    loadHtml();
    return () => {
      isMounted = false;
    };
  }, []);
  useEffect(() => {
    let isMounted = true;
    const checkUpdate = async () => {
      try {
        const response = await fetch(
          "https://api.github.com/repos/LozanoTH/prueba_react_app/releases/latest",
          { headers: { Accept: "application/vnd.github+json" } }
        );
        if (!response.ok) return;
        const data = await response.json();
        const latestTag = typeof data?.tag_name === "string" ? data.tag_name : "";
        const latestVersion = latestTag.replace(/^v/i, "");
        const currentVersion = Constants.expoConfig?.version ?? "0.0.0";
        if (!isMounted || !latestVersion) return;
        if (latestVersion !== currentVersion) {
          Alert.alert(
            "Actualizacion disponible",
            `Version nueva: ${latestVersion}\nTu version: ${currentVersion}`,
            [
              {
                text: "Ver release",
                onPress: () => {
                  if (data?.html_url) {
                    Linking.openURL(data.html_url);
                  }
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
  return (
    <View style={[styles.container, isDark ? styles.containerDark : styles.containerLight]}>
      <WebView
        originWhitelist={["*"]}
        source={html ? { html } : undefined}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerLight: {
    backgroundColor: "#FFFFFF",
  },
  containerDark: {
    backgroundColor: "#0B0B0B",
  },
  webview: {
    flex: 1,
    width: "100%",
    backgroundColor: "transparent",
  },
});
