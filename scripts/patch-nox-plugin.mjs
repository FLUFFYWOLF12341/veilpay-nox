import { readFile, writeFile } from "node:fs/promises";

const files = [
  "node_modules/@iexec-nox/nox-hardhat-plugin/src/nox-config.ts",
  "node_modules/@iexec-nox/nox-hardhat-plugin/dist/src/nox-config.js",
];

for (const file of files) {
  const source = await readFile(file, "utf8");
  if (source.includes("executable: { standalone: true }")) continue;

  const marker = "  log: false,\n";
  if (!source.includes(marker)) {
    throw new Error(`Unable to patch Nox Compose configuration in ${file}`);
  }

  await writeFile(
    file,
    source.replace(marker, `${marker}  executable: { standalone: true },\n`),
  );
}
