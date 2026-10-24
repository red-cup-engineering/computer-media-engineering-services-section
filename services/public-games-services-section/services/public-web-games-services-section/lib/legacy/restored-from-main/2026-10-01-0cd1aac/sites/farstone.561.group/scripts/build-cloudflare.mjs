import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCloudflareWorker } from "@red-cup-engineering/computer-web-platform/build-cloudflare-worker";
import { farstoneDocuments, farstoneStaticFiles } from "../src/farstone-tufte.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "dist");
const result = await buildCloudflareWorker({
  entry: join(root, "src/worker.mjs"),
  outdir: output,
  documents: farstoneDocuments(),
  assets: farstoneStaticFiles(),
});

console.log(`Farstone Worker: ${result.workerPath}`);
console.log(`Farstone browser assets: ${result.publicRoot}`);
