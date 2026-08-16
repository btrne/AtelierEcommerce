import forge from "node-forge";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const certDir = path.join(projectRoot, "certificates");

const CA_KEY_FILE = path.join(certDir, "rootCA-key.pem");
const CA_FILE = path.join(certDir, "rootCA.pem");
const KEY_FILE = path.join(certDir, "localhost-key.pem");
const CERT_FILE = path.join(certDir, "localhost.pem");

const fileExists = (file) => {
  try {
    fs.accessSync(file);
    return true;
  } catch {
    return false;
  }
};

if (
  fileExists(CA_KEY_FILE) &&
  fileExists(CA_FILE) &&
  fileExists(KEY_FILE) &&
  fileExists(CERT_FILE)
) {
  console.log("Certificates already exist. Skipping generation.");
  process.exit(0);
}

const pki = forge.pki;

const createCA = () => {
  const keys = pki.rsa.generateKeyPair(2048);
  const cert = pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  const now = new Date();
  cert.validity.notBefore = now;
  cert.validity.notAfter = new Date(
    now.getFullYear() + 10,
    now.getMonth(),
    now.getDate()
  );
  cert.setSubject([{ name: "commonName", value: "Atelier Local CA" }]);
  cert.setIssuer(cert.subject.attributes);
  cert.setExtensions([
    { name: "basicConstraints", cA: true },
    { name: "keyUsage", keyCertSign: true, cRLSign: true },
    { name: "subjectKeyIdentifier" },
  ]);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  return { cert, keys };
};

const createServerCert = (caCert, caKeys) => {
  const keys = pki.rsa.generateKeyPair(2048);
  const cert = pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = forge.util.bytesToHex(forge.random.getBytesSync(8));
  const now = new Date();
  cert.validity.notBefore = now;
  cert.validity.notAfter = new Date(
    now.getFullYear() + 2,
    now.getMonth(),
    now.getDate()
  );
  cert.setSubject([{ name: "commonName", value: "localhost" }]);
  cert.setIssuer(caCert.subject.attributes);
  cert.setExtensions([
    { name: "basicConstraints", cA: false },
    {
      name: "keyUsage",
      digitalSignature: true,
      keyEncipherment: true,
      nonRepudiation: true,
    },
    { name: "extKeyUsage", serverAuth: true },
    { name: "subjectKeyIdentifier" },
    {
      name: "subjectAltName",
      altNames: [
        { type: 2, value: "localhost" },
        { type: 7, ip: "127.0.0.1" },
        { type: 7, ip: "::1" },
      ],
    },
  ]);
  cert.sign(caKeys.privateKey, forge.md.sha256.create());
  return { cert, keys };
};

fs.mkdirSync(certDir, { recursive: true });

const ca = createCA();
const server = createServerCert(ca.cert, ca.keys);

fs.writeFileSync(CA_KEY_FILE, pki.privateKeyToPem(ca.keys.privateKey));
fs.writeFileSync(CA_FILE, pki.certificateToPem(ca.cert));
fs.writeFileSync(KEY_FILE, pki.privateKeyToPem(server.keys.privateKey));
fs.writeFileSync(CERT_FILE, pki.certificateToPem(server.cert));

console.log(`Certificates written to ${certDir}`);

try {
  execFileSync("certutil", ["-user", "-addstore", "Root", CA_FILE], {
    stdio: "ignore",
  });
  console.log(
    "Local CA imported into the current user's trusted root store."
  );
} catch (err) {
  console.error(
    "Failed to import CA into the user trust store (may already exist):",
    err.message
  );
}
