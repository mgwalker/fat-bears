const exec = require("@actions/exec");
const fs = require("fs/promises");
const { Octokit } = require("@octokit/rest");
const jsonpath = require("jsonpath");
const os = require("os");
const path = require("path");

const BOT_USER = "github-actions[bot]";

const getImages = async () => {
  let bracket = JSON.parse(
    await fs.readFile(path.join(__dirname, "blank_bracket.json"), {
      encoding: "utf-8",
    })
  );

  const bears = new Map();
  const brackets = [bracket];

  while (brackets.length) {
    const b = brackets.pop();
    if (b.left.bear) {
      bears.set(b.left.bear, b.left.image);
    } else {
      brackets.push(b.left.bracket);
    }

    if (b.right.bear) {
      bears.set(b.right.bear, b.right.image);
    } else {
      brackets.push(b.right.bracket);
    }
  }

  return bears;
};

const buildBracket = async (comments) => {
  let bracket = JSON.parse(
    await fs.readFile(path.join(__dirname, "blank_bracket.json"), {
      encoding: "utf-8",
    })
  );

  const fields = ["match", "winner"];

  const regex = /Match (\d+): (.+)/;
  const picks = comments.match(new RegExp(regex, "g")).map((m) =>
    m
      .match(regex)
      .filter((v) => typeof v === "string")
      .filter((_, i) => i > 0)
      .map((v, i) => (i === 0 ? v.padStart(2, "0") : v))
      .reduce((o, v, i) => ({ ...o, [fields[i]]: v }), {})
  );

  picks.forEach((pick) => {
    if (pick.match === "11") {
      const champion = [bracket.left.bear, bracket.right.bear].find(
        (bear) => bear.toLowerCase() === pick.winner.toLowerCase()
      );

      bracket = {
        bracket: bracket,
        champion,
      };
    } else {
      // Find the bracket whose ID is equal to the match number
      const { path } = jsonpath.nodes(
        bracket,
        `$..*[?(@.id==='${pick.match}')]`
      )?.[0];

      // Use the path from above to find the left and right bears in the
      // matchup, so we can validate the bear name given to us and keep it
      // consistent as we go forward.
      const bracketRoot = path.join(".");
      const { value: lbear } = jsonpath.nodes(
        bracket,
        `${bracketRoot}.left.bear`
      )?.[0];
      const { value: rbear } = jsonpath.nodes(
        bracket,
        `${bracketRoot}.right.bear`
      )?.[0];

      const winner = [lbear, rbear].find(
        (bear) => bear.toLowerCase() === pick.winner.toLowerCase()
      );

      if (!winner) {
        throw new Error(`Invalid bear, "${pick.winner}" :(`);
      }

      // The path from above is the bracket, but we need to go up one level in
      // order to store the bracket's winner.
      path.pop();
      jsonpath.apply(bracket, `${path.join(".")}.bear`, () => winner);
    }
  });

  return bracket;
};

const getNextMatch = (bracket) => {
  // Find all of the brackets that don't have a defined winner yet. This will be
  // a bunch of arrays representing paths.
  const bracketNodes = jsonpath.nodes(
    bracket,
    "$..[?(@.bear === null)].bracket"
  );

  // If there are any undecided matches...
  if (bracketNodes.length) {
    // Pick the deepest undecided match in the tree.
    const depth = Math.max(...bracketNodes.map(({ path }) => path.length));
    // Filter out any brackets that are shallower, then return the first bracket
    // at the deepest undecided level. Bam.
    return bracketNodes
      .filter(({ path }) => path.length === depth)
      .map(({ value }) => value)[0];
  }

  // If all of the brackets have defined winners, then return the whole bracket
  // because there's not a next match.
  return bracket;
};

const outputDone = (done) => {
  process.stdout.write(os.EOL);
  process.stdout.write(
    `::set-output name=done::${done ? "yes" : "no"}${os.EOL}`
  );
};

const main = async () => {
  const github = new Octokit({
    auth: process.env.GITHUB_TOKEN,
    userAgent: "fat bears 2021",
  });

  // Get repo and issue info from the event JSON
  const {
    issue: { number: issueNumber },
    repository: {
      name: repo,
      owner: { login: owner },
    },
  } = JSON.parse(await fs.readFile(process.env.GITHUB_EVENT_PATH));

  // Get the issue itself. We'll use this as part of building the user's bracket
  // as well as identifying the user.
  const {
    data: {
      body,
      user: { login: brackerUser },
    },
  } = await github.request(`GET /repos/${owner}/${repo}/issues/${issueNumber}`);

  // Next, grab any comments from the issue. Remove any that aren't by the
  // original author or the bot. No cheating!
  const comments = (
    await Promise.all(
      (
        await github.rest.issues.listComments({
          owner: owner,
          repo: repo,
          issue_number: issueNumber,
        })
      ).data.map(async ({ id, user: { login } }) => ({
        comment: (
          await github.request(
            `GET /repos/${owner}/${repo}/issues/comments/${id}`
          )
        ).data.body,
        user: login,
      }))
    )
  ).filter(({ user: commentUser }) =>
    [brackerUser, BOT_USER].includes(commentUser)
  );

  const text = [body];

  // When we see a comment from the bot, that will tell us what match the NEXT
  // comment should be for. Ie, the bot will say "Tell me your pick for match 3"
  // and the next comment would be the user's response. So, when we see a bot
  // comment, remove the next comment and format it so it can be parsed.
  comments.forEach(({ comment, user }, i) => {
    if (user === BOT_USER) {
      const [, match] = comment.match(/<sub>Match (\d+)<\/sub>/i) ?? [];
      const next = comments.splice(i + 1, 1)?.[0]?.comment;
      text.push(`Match ${match}: ${next}`);
    }
  });

  // Get the user's current bracket as well as the next match they need to
  // respond to.
  const bracket = await buildBracket(text.join("\n"));
  const nextMatch = getNextMatch(bracket);

  // If the next match has a champion, then the bracket is finished and we're
  // ready to wrap up this conversation.
  if (nextMatch.champion) {
    await exec.exec(
      "sh",
      [
        "-c",
        `git clone --depth=1 https://github.com/${process.env.GITHUB_REPOSITORY} ./src`,
      ],
      { cwd: "/" }
    );

    // Make sure we have a place to store the bracket.
    const bracketPath = "/src/brackets";
    fs.mkdir(path.join(bracketPath), { recursive: true });

    // Write it
    await fs.writeFile(
      path.join(bracketPath, `${brackerUser}.json`),
      JSON.stringify(bracket, null, 2),
      {
        encoding: "utf-8",
      }
    );

    // Commit the bracket and push it
    await Promise.all(
      [
        `git config --local user.email "mgwalker@users.noreply.github.com"`,
        `git config --local user.name "bracketeer"`,
        `git add ${path.join(bracketPath, `${brackerUser}.json`)}`,
      ].map((c) => exec.exec("sh", ["-c", c], { cwd: "/src" }))
    );
    for await (c of [
      `git commit -m "adding ${brackerUser}'s bracket"`,
      `git push "https://${owner}:$GITHUB_TOKEN@github.com/${owner}/${repo}.git" HEAD:main`,
    ]) {
      await exec.exec("sh", ["-c", c], { cwd: "/src" });
    }

    // Comment an acknowledgement to the issue, then close and lock it.
    await github.request(
      `POST /repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        body: `Great! All done! Good luck to **${nextMatch.champion}** to win it all!`,
      }
    );
    await github.request(
      `PATCH /repos/${owner}/${repo}/issues/${issueNumber}`,
      {
        state: "closed",
      }
    );
    await github.request(
      `PUT /repos/${owner}/${repo}/issues/${issueNumber}/lock`,
      {
        lock_reason: "resolved",
      }
    );
  } else {
    const images = await getImages();

    // If there's no champion yet, post a message asking the user for their pick
    // in the next matchup.
    await github.request(
      `POST /repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        body: `Great, I got that. Now, who's your pick for match ${+nextMatch.id}? Please respond with exactly one of these bears:

* ${nextMatch.left.bear}
* ${nextMatch.right.bear}

<img src="${images.get(nextMatch.left.bear)}" alt="${
          nextMatch.left.bear
        }" width="40%" valign="middle"> **vs.** <img src="${images.get(
          nextMatch.right.bear
        )}" alt="${nextMatch.right.bear}" width="40%" valign="middle">

<sub>Match ${nextMatch.id}</sub>`,
      }
    );
  }

  outputDone(!!nextMatch.champion);
};
main();
