import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL || process.env.WEB_APP_URL || "";

const config: CapacitorConfig = {
  appId: "app.dately",
  appName: "Dately",
  webDir: "native/www",
  backgroundColor: "#0c0b0a",
  server: serverUrl
    ? {
        url: serverUrl,
        androidScheme: "https",
        cleartext: false,
      }
    : {
        androidScheme: "https",
      },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#0C0B0A",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0C0B0A",
    },
  },
};

export default config;
