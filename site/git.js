import { exec } from "@actions/exec";
import path from "path";
import { fileURLToPath } from "url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const docs = path.join(DIR, "..", "docs");

const e = async (cmd) => exec("sh", ["-c", cmd], { cwd: DIR });

await Promise.all([
  e(`git config --local user.email "mgwalker@users.noreply.github.com"`),
  e(`git config --local user.name "site-updater"`),
  e(`git add ${docs}`),
]);

await e(`git commit -m "updating the site"`);
await e(
  `git push "https://mgwalker:$GITHUB_TOKEN@github.com/mgwalker/fat-bears.git" HEAD:main`
);
