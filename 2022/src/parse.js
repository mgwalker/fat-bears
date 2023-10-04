const {
  getUser,
  github,
  gh: { issue, repo, owner },
  output,
} = require("./util");

const BOT_USER = "github-actions[bot]";

(async () => {
  // Get the issue itself. We'll use this as part of building the user's bracket
  // as well as identifying the user.

  const bracketUser = await getUser();

  // Next, grab any comments from the issue. Remove any that aren't by the
  // original author or the bot. No cheating!
  const comments = (
    await Promise.all(
      (
        await github.rest.issues.listComments({
          owner,
          repo,
          issue_number: issue,
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
    [bracketUser, BOT_USER].includes(commentUser)
  );

  const matches = {};

  // When we see a comment from the bot, that will tell us what match the NEXT
  // comment should be for. Ie, the bot will say "Tell me your pick for match 3"
  // and the next comment would be the user's response. So, when we see a bot
  // comment, remove the next comment and format it so it can be parsed.
  comments.forEach(({ comment, user }, i) => {
    if (user === BOT_USER) {
      const [, match] = comment.match(/# Round (\d+)/i) ?? [];
      const next = comments.splice(i + 1, 1)?.[0]?.comment;
      matches[match] = next;
    }
  });

  output("bracket", JSON.stringify(matches));
})();
