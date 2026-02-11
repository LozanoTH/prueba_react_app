import Constants from "expo-constants";
import { useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "./theme-context";
import { downloadAndInstallApk, fetchLatestRelease, isNewerVersion } from "./update";

const REPO_URL = "https://github.com/LozanoTH/prueba_react_app";

export default function AjustesScreen() {
  const { preference, resolvedScheme, setPreference } = useTheme();
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const isDark = resolvedScheme === "dark";
  const colors = isDark
    ? {
        surface: "#1C1B1F",
        surfaceVariant: "#2B2930",
        onSurface: "#E6E1E5",
        primary: "#D0BCFF",
        onPrimary: "#381E72",
        outline: "#49454F",
      }
    : {
        surface: "#FFFBFE",
        surfaceVariant: "#F3EDF7",
        onSurface: "#1C1B1F",
        primary: "#6750A4",
        onPrimary: "#FFFFFF",
        outline: "#79747E",
      };
  const currentVersion = Constants.expoConfig?.version ?? "0.0.0";

  const handleCheckUpdate = async () => {
    try {
      setChecking(true);
      const latest = await fetchLatestRelease();
      if (!latest) {
        Alert.alert("Actualizacion", "No se pudo consultar el release.");
        return;
      }
      setLatestVersion(latest.latestVersion);
      const isNewer = isNewerVersion(latest.latestVersion, currentVersion);
      if (!isNewer) {
        Alert.alert("Actualizacion", "Ya tienes la version mas reciente.");
        return;
      }
      Alert.alert(
        "Actualizacion disponible",
        `Version nueva: ${latest.latestVersion}\nTu version: ${currentVersion}`,
        [
          latest.apkUrl
            ? {
                text: "Descargar",
                onPress: async () => {
                  try {
                    await downloadAndInstallApk(latest.apkUrl as string);
                  } catch {
                    Alert.alert("Error", "No se pudo descargar o instalar.");
                  }
                },
              }
            : { text: "OK" },
          latest.htmlUrl
            ? { text: "Ver release", onPress: () => Linking.openURL(latest.htmlUrl as string) }
            : { text: "Cerrar", style: "cancel" },
        ]
      );
    } catch {
      Alert.alert("Actualizacion", "Error de red o API de GitHub.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={[styles.container, isDark ? styles.containerDark : styles.containerLight]}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.onSurface }]}>Ajustes</Text>
          <Text style={[styles.subtitle, { color: colors.onSurface }]}>
            Personaliza tu experiencia
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Tema</Text>
          <View style={styles.row}>
            <Pressable
              style={[
                styles.chip,
                { backgroundColor: colors.surfaceVariant },
                preference === "auto" && { backgroundColor: colors.primary },
              ]}
              onPress={() => setPreference("auto")}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: colors.onSurface },
                  preference === "auto" && { color: colors.onPrimary },
                ]}
              >
                Auto
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.chip,
                { backgroundColor: colors.surfaceVariant },
                preference === "light" && { backgroundColor: colors.primary },
              ]}
              onPress={() => setPreference("light")}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: colors.onSurface },
                  preference === "light" && { color: colors.onPrimary },
                ]}
              >
                Claro
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.chip,
                { backgroundColor: colors.surfaceVariant },
                preference === "dark" && { backgroundColor: colors.primary },
              ]}
              onPress={() => setPreference("dark")}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: colors.onSurface },
                  preference === "dark" && { color: colors.onPrimary },
                ]}
              >
                Oscuro
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Version</Text>
          <Text style={[styles.text, { color: colors.onSurface }]}>
            Actual: {currentVersion}
          </Text>
          <Text style={[styles.text, { color: colors.onSurface }]}>
            Release: {latestVersion ?? "sin consultar"}
          </Text>
        </View>

        <View style={styles.spacer} />

        <View style={styles.updateSection}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
            Actualizaciones
          </Text>
          <View style={styles.actions}>
            <Pressable
              style={[
                styles.button,
                { backgroundColor: colors.primary },
                checking && styles.buttonDisabled,
              ]}
              onPress={handleCheckUpdate}
              disabled={checking}
            >
              <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
                {checking ? "Buscando..." : "Buscar actualizacion"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.buttonSecondary, { borderColor: colors.outline }]}
              onPress={() => Linking.openURL(REPO_URL)}
            >
              <Text style={[styles.buttonTextSecondary, { color: colors.onSurface }]}>
                GitHub
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  containerLight: {
    backgroundColor: "#FFFBFE",
  },
  containerDark: {
    backgroundColor: "#121212",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  header: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  text: {},
  section: {
    marginBottom: 18,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  spacer: {
    flex: 1,
    minHeight: 16,
  },
  updateSection: {
    marginTop: "auto",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  chipText: {
    fontWeight: "600",
  },
  actions: {
    marginTop: 12,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  buttonSecondary: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  buttonTextSecondary: {
    fontWeight: "600",
  },
});
