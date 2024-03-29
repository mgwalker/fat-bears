const fs = require("fs/promises");
const util = require("./util");
const { matches } = require("./data/bracket.json");

(async () => {
  if (process.argv.length < 3) {
    process.exit(0);
  }

  const userBracket = (() => {
    try {
      return JSON.parse(process.argv[2]);
    } catch (e) {
      return false;
    }
  })();

  if (userBracket === false) {
    process.exit(0);
  }

  // Fill in the matches with the user's picks.
  for ([id, match] of Object.entries(matches)) {
    if (userBracket[id]) {
      if (match.next) {
        matches[match.next].bears.push(userBracket[id]);
      }
      matches[id].winner = userBracket[id];
    }
  }

  // Make sure every match has a selected winner. If they do, write the bracket
  // out to file and commit it to the repo.
  if (Object.values(matches).every((m) => !!m.winner)) {
    const bracketUser = await util.getUser();
    await fs.writeFile(
      `./brackets/${bracketUser}.json`,
      JSON.stringify(matches, null, 2),
      { encoding: "utf-8" }
    );
  }
})();
