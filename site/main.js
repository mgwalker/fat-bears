import fs from "fs/promises";
import path from "path";
import { chromium } from "playwright-chromium";
import { fileURLToPath, pathToFileURL } from "url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const bracketPath = path.join(DIR, "..", "brackets");

const exists = async (path) => {
  try {
    await fs.access(path);
    return true;
  } catch (e) {
    return false;
  }
};

(async () => {
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { height: 1458, width: 2100 },
    });

    const url = pathToFileURL(path.join(DIR, "web", "index.html")).href;
    await page.goto(url);

    if (await exists(bracketPath)) {
      const dir = await fs.readdir(bracketPath);
      const bracketFiles = dir
        .filter((f) => f.endsWith(".json"))
        .map((f) => path.join(bracketPath, f));

      const allMatches = JSON.parse(
        await fs.readFile(path.join(DIR, "..", "docs/allMatchups.json"), {
          encoding: "utf-8",
        })
      );

      const outputDir = path.join(DIR, "..", "docs/brackets");

      for await (const bracketFile of bracketFiles) {
        const user = path.basename(bracketFile, ".json");
        const imagePath = path.join(outputDir, `${user}.png`);

        if (await exists(imagePath)) {
          continue;
        }

        const bracket = JSON.parse(await fs.readFile(bracketFile));
        const brackets = [bracket];

        const winners = {};
        while (brackets.length) {
          const bracket = brackets.pop();
          if (bracket.bracket) {
            winners[bracket.bracket.id] = bracket.bear ?? bracket.champion;
            brackets.push(bracket.bracket.left);
            brackets.push(bracket.bracket.right);
          }
        }

        Object.entries(winners).forEach(([match, bear]) => {
          if (!allMatches[match]) {
            allMatches[match] = {};
          }
          if (!allMatches[match][bear]) {
            allMatches[match][bear] = [];
          }
          if (!allMatches[match][bear].includes(user)) {
            allMatches[match][bear].push(user);
          }
        });

        const actualBracket = JSON.parse(
          await fs.readFile(path.join(DIR, "../docs/bracket.json"))
        );
        const actualWinners = {};
        const queue = [actualBracket.bracket.left, actualBracket.bracket.right];
        if (actualBracket.champion) {
          const match = actualBracket.bracket.id;
          actualWinners[match] = actualBracket.champion;
          queue.push(actualBracket.bracket.left, actualBracket.bracket.right);
        }

        while (queue.length) {
          const target = queue.pop();
          if (target.bracket) {
            if (target.bear) {
              actualWinners[target.bracket.id] = target.bear;
            }
            queue.push(target.bracket.left, target.bracket.right);
          }
        }

        await page.evaluate(
          ([w, a]) => {
            setWinners(w, a);
          },
          [winners, actualWinners]
        );

        const bb = await page.$("#bracket");
        await bb.screenshot({
          path: imagePath,
        });
      }

      await fs.writeFile(
        path.join(DIR, "..", "docs/allMatchups.json"),
        JSON.stringify(allMatches, null, 2)
      );
    }
  } catch (e) {
    console.log(e);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
