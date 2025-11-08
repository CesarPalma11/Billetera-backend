import admin from "firebase-admin";
import fs from "fs";
import path from "path";

// Ruta absoluta a tu archivo de credenciales
const serviceAccountPath = path.resolve("./serviceAccountKey.json");
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
