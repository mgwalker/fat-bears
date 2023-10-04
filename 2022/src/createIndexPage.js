const fs = require("fs/promises");
const mustache = require("mustache");
const path = require("path");

const DIR = __dirname;
const bracketPath = path.join(DIR, "..", "brackets");
const dataPath = path.join(DIR, "data");
const docsPath = path.join(DIR, "..", "docs");

(async () => {
  const bracketPaths = await fs.readdir(bracketPath);
  const template = await fs.readFile(path.join(dataPath, "index.mustache"), {
    encoding: "utf-8",
  });

  const { bears, matches: bracketMatches } = JSON.parse(
    await fs.readFile(path.join(dataPath, "bracket.json"), {
      encoding: "utf-8",
    })
  );

  const completedMatches = Object.values(bracketMatches).filter(
    (match) => !!match.winner
  ).length;

  // Array of objects, { user: 'string', bracket: { 'match id': <bracket> }}
  const userBrackets = await Promise.all(
    bracketPaths
      .filter((p) => p.endsWith(".json"))
      .map((p) => [p.slice(0, -5), path.join(bracketPath, p)])
      .map(async ([user, bracketPath]) => {
        const bracket = JSON.parse(
          await fs.readFile(bracketPath, { encoding: "utf-8" })
        );

        const wins = Object.entries(bracket)
          .map(([matchId, { winner }]) => ({
            matchId,
            winner,
          }))
          .map(
            ({ matchId, winner }) => bracketMatches[matchId].winner === winner
          )
          .filter((w) => w).length;

        winPercentage = Math.round((100 * wins) / completedMatches);

        return { user: user, bracket, winPercentage };
      })
  );
  const matches = new Map(
    Object.entries(bracketMatches)
      .filter(([, { bears }]) => bears.length === 2)
      .sort(([a], [b]) => +a - +b)
  );

  const matchesForTemplate = [];
  for (const [id, { bears: contenders }] of matches) {
    const matchBears = [];
    const bearMap = new Map(
      contenders.map((bearId) => {
        const newBearInfo = {
          id: bearId,
          name: bears[bearId].name,
          choosers: [],
        };
        matchBears.push(newBearInfo);
        return [bearId, newBearInfo];
      })
    );

    const wrongBracket = [];
    for (const user of userBrackets) {
      if (bearMap.has(user.bracket[id].winner)) {
        bearMap
          .get(user.bracket[id].winner)
          .choosers.push({ user: user.user, wins: user.winPercentage });
      } else {
        wrongBracket.push({ user: user.user, wins: user.winPercentage });
      }
    }

    matchesForTemplate.push({ id, bears: matchBears, wrongBracket });
  }

  for (const match of matchesForTemplate) {
    for (const bear of match.bears) {
      bear.choosers.sort(({ wins: a }, { wins: b }) => b - a);
    }
    match.wrongBracket.sort(({ wins: a }, { wins: b }) => b - a);
  }

  const upcoming = matchesForTemplate.filter(
    ({ id }) => !matches.get(id).winner
  );

  const completed = matchesForTemplate
    .filter(({ id }) => !!matches.get(id).winner)
    .map((match) => {
      const winner = matches.get(match.id).winner;

      return {
        ...match,
        bears: match.bears.map((b) => ({ ...b, winner: b.id === winner })),
      };
    })
    .reverse();

  const categories = [];
  if (upcoming.length) {
    categories.push({ name: "Upcoming", matches: upcoming });
  }
  if (completed.length) {
    categories.push({ name: "Completed", matches: completed });
  }

  const html = mustache.render(template, { categories });
  await fs.writeFile(path.join(docsPath, "index.html"), html);
})();
