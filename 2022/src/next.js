const util = require("./util");
const { bears, matches } = require("./data/bracket.json");

Object.entries(bears).forEach(([number, bear]) => {
  bear.display = bear.name ? `${number} - ${bear.name}` : number;
});

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
      matches[id].resolved = true;
    }
  }

  const getLastPickAcknowledgement = (bracket) => {
    const last = Object.entries(bracket)
      .filter(([, { resolved }]) => !!resolved)
      .sort(([idA], [idB]) => +idA - +idB)
      .pop();

    if (!last) {
      return false;
    }

    const [id, match] = last;
    const winner = match.winner;
    const loser = match.bears.filter((b) => b !== winner).pop();

    return `Got it! You chose ${winner} to defeat ${loser} in round ${id}.`;
  };

  const requestNextPick = async (bracket, lastWasGood = true) => {
    const message = [];

    // If the user's last pick was denied for some reason (e.g., they entered
    // something other than a competing bear's number), let them know and prompt
    // again.
    if (!lastWasGood) {
      message.push(
        "Hmm, sorry. I wasn't able to understand that. Here's that matchup again. Please be sure to only enter your choice's number."
      );
      message.push("");
    } else {
      // If the user's last pick was good, we can let them know we got it.
      const msg = getLastPickAcknowledgement(bracket);
      if (msg) {
        message.push(msg);
        message.push("");
      }
    }

    // The next matchup is the unresolved match with the lowest ID.
    const next = Object.entries(bracket)
      .filter(([, { resolved }]) => !resolved)
      .sort(([idA], [idB]) => +idA - +idB)
      .shift();

    const [id, match] = next;

    message.push(`# Round ${id}`);

    message.push(`
<table>
  <thead>
    <tr>
      <th>${bears[match.bears[0]].display}</th>
      <th/>
      <th>${bears[match.bears[1]].display}</th>
    </tr>
  </thead>
  <tbody>
    <td width="45%">
      <img src="https://fatbears.18f.org/2022/pics/explore-${
        match.bears[0]
      }.png" alt="${
      bears[match.bears[0]].display
    } before and after, courtesy of Explore.org">${
      bears[match.bears[0]].description
        ? `<br>\n${bears[match.bears[0]].description}`
        : ""
    }
    </td>
    <td align="center">vs.</td>
    <td width="45%">
      <img src="https://fatbears.18f.org/2022/pics/explore-${
        match.bears[1]
      }.png" alt="${
      bears[match.bears[1]].display
    } before and after, courtesy of Explore.org">${
      bears[match.bears[1]].description
        ? `<br>\n${bears[match.bears[1]].description}`
        : ""
    }
    </td>
  </tbody>
</table>`);

    message.push("-----");
    message.push("Who do you choose? Respond to this message with either:");

    message.push(`- **${match.bears[0]}**
- **${match.bears[1]}**`);

    util.addIssueComment(message.join("\n\n"));
  };

  // Now validate the most recent pick. The user must have chosen a bear that is
  // actually in that matchup.
  const lastUserPick = Object.keys(userBracket)
    .sort((a, b) => +a - +b)
    .pop();

  if (
    lastUserPick &&
    (!matches[lastUserPick] ||
      !matches[lastUserPick].bears.includes(userBracket[lastUserPick]))
  ) {
    // If the user has made at least one pick, and their most recent pick is
    // invalid, mark it unresolved and re-run it.
    matches[lastUserPick].resolved = false;
    await requestNextPick(matches, false);
    util.output("done", "no");
  } else if (!lastUserPick || +lastUserPick < 11) {
    // If the user hasn't made any picks or their most recent valid pick was
    // not the final pick, ask them for their next one.
    await requestNextPick(matches);
    util.output("done", "no");
  } else {
    // If the user has finished their picks, we're all done!
    const winner = matches[11].winner;
    const bear = bears[winner];

    const user = await util.getUser();

    await util.addIssueComment(
      [
        getLastPickAcknowledgement(matches),
        `And that's it, you've finished your bracket! Good luck to ${bear.display} to win it all!

Your bracket will be available for download at https://fatbears.18f.org/2022/brackets/${user}.png in a few minutes.`,
      ].join(" ")
    );
    await util.closeAndLockIssue();

    util.output("done", "yes");
  }
})();
