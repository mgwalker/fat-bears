const fs = require("fs/promises");
const path = require("path");

const DIR = __dirname;
const dataPath = path.join(DIR, "data");

(async () => {
  const { bears, matches } = JSON.parse(
    await fs.readFile(path.join(dataPath, "bracket.json"))
  );
  const results = JSON.parse(
    await fs.readFile(path.join(dataPath, "results.json"))
  );

  for (const [matchId, winner] of Object.entries(results)) {
    const match = matches[matchId];
    match.winner = winner;
    if (match.next) {
      matches[match.next].bears.push(winner);
    }
  }

  await fs.writeFile(
    path.join(dataPath, "bracket.json"),
    JSON.stringify({ bears, matches }, null, 2)
  );
})();
