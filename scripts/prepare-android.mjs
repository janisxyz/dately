import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const url = (process.env.WEB_APP_URL || process.env.CAPACITOR_SERVER_URL || "").trim();

const config = {
  appId: "app.dately",
  appName: "Dately",
  webDir: "native/www",
  backgroundColor: "#0c0b0a",
  server: url
    ? { url, androidScheme: "https", cleartext: false }
    : { androidScheme: "https" },
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#0C0B0A",
      showSpinner: false,
    },
    StatusBar: { style: "DARK", backgroundColor: "#0C0B0A" },
  },
};

writeFileSync(resolve(root, "capacitor.config.json"), JSON.stringify(config, null, 2));
console.log(url ? `Capacitor will load ${url}` : "Capacitor will load native/www (set WEB_APP_URL for the live app)");

const tag = process.env.GITHUB_REF_NAME || "";
const match = /^v(\d+)\.(\d+)\.(\d+)/.exec(tag);
const versionName = match ? `${match[1]}.${match[2]}.${match[3]}` : "1.0.0";
const versionCode = match
  ? Number(match[1]) * 10000 + Number(match[2]) * 100 + Number(match[3])
  : Number(process.env.GITHUB_RUN_NUMBER || 1);

const gradlePath = resolve(root, "android/app/build.gradle");
if (existsSync(gradlePath)) {
  let gradle = readFileSync(gradlePath, "utf8");
  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${versionName}"`);
  gradle = gradle.replace(/applicationId\s+"[^"]+"/, 'applicationId "app.dately"');
  gradle = gradle.replace(/namespace\s+"[^"]+"/, 'namespace "app.dately"');
  writeFileSync(gradlePath, gradle);
  console.log(`Android version ${versionName} (${versionCode})`);
}
