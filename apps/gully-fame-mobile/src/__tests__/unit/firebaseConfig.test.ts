/**
 * F5: the Firebase file must be for this app's package, or the Android build fails
 * ("No matching client found for package name") and push notifications never work.
 */
import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "../../..");
const appJson = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8")).expo;
const file = path.join(root, appJson.android.googleServicesFile || "./google-services.json");

const maybe = fs.existsSync(file) ? it : it.skip;

maybe("google-services.json has an Android client for the app's package", () => {
  const services = JSON.parse(fs.readFileSync(file, "utf8"));
  const packages: string[] = services.client.map((c: any) => c.client_info.android_client_info.package_name);
  expect(packages).toContain(appJson.android.package);
});
