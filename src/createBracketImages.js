const fs = require("fs/promises");
const path = require("path");
const { chromium } = require("playwright-chromium");
const { pathToFileURL } = require("url");

const DIR = __dirname;
const bracketPath = path.join(DIR, "..", "brackets");
const dataPath = path.join(DIR, "data");
const docsPath = path.join(DIR, "..", "docs");

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
      viewport: { height: 3300, width: 2555 },
    });

    const url = pathToFileURL(path.join(dataPath, "bracket.html")).href;
    await page.goto(url);

    if (await exists(bracketPath)) {
      const dir = await fs.readdir(bracketPath);
      const bracketFiles = dir
        .filter((f) => f.endsWith(".json"))
        .map((f) => path.join(bracketPath, f));

      // const allMatches = JSON.parse(
      //   await fs.readFile(path.join(DIR, "..", "docs/allMatchups.json"), {
      //     encoding: "utf-8",
      //   })
      // );

      const outputDir = path.join(docsPath, "2023", "brackets");

      const { bears } = JSON.parse(
        await fs.readFile(path.join(dataPath, "bracket.json"))
      );
      const results = JSON.parse(
        await fs.readFile(path.join(dataPath, "results.json"))
      );

      for await (const bracketFile of bracketFiles) {
        const user = path.basename(bracketFile, ".json");
        const imagePath = path.join(outputDir, `${user}.png`);

        if (await exists(imagePath)) {
          continue;
        }

        const bracket = JSON.parse(await fs.readFile(bracketFile));
        // const brackets = [bracket];

        // const winners = {};
        // while (brackets.length) {
        //   const bracket = brackets.pop();
        //   if (bracket.bracket) {
        //     winners[bracket.bracket.id] = bracket.bear ?? bracket.champion;
        //     brackets.push(bracket.bracket.left);
        //     brackets.push(bracket.bracket.right);
        //   }
        // }

        // Object.entries(winners).forEach(([match, bear]) => {
        //   if (!allMatches[match]) {
        //     allMatches[match] = {};
        //   }
        //   if (!allMatches[match][bear]) {
        //     allMatches[match][bear] = [];
        //   }
        //   if (!allMatches[match][bear].includes(user)) {
        //     allMatches[match][bear].push(user);
        //   }
        // });

        // const actualWinners = {};
        // const queue = [blankBracket.bracket.left, blankBracket.bracket.right];
        // if (blankBracket.champion) {
        //   const match = blankBracket.bracket.id;
        //   actualWinners[match] = blankBracket.champion;
        //   queue.push(blankBracket.bracket.left, blankBracket.bracket.right);
        // }

        // while (queue.length) {
        //   const target = queue.pop();
        //   if (target.bracket) {
        //     if (target.bear) {
        //       actualWinners[target.bracket.id] = target.bear;
        //     }
        //     queue.push(target.bracket.left, target.bracket.right);
        //   }
        // }

        const picks = Object.entries(bracket).map(([match, { winner }]) => {
          const bear = bears[winner];
          let name = `${winner} ${bear.name}`;

          if (bear.name === winner) {
            name = winner;
          } else if (/\D/.test(winner)) {
            name = bear.name;
          }

          return [match, winner, name];
        });

        await page.evaluate(
          ([w, a]) => {
            setWinners(w, a);
          },
          [picks, results]
        );

        const bb = await page.$("#bracket");
        await bb.screenshot({
          path: imagePath,
        });
      }

      // await fs.writeFile(
      //   path.join(DIR, "..", "docs/allMatchups.json"),
      //   JSON.stringify(allMatches, null, 2)
      // );
    }
  } catch (e) {
    console.log(e);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
