const { Octokit } = require("@octokit/rest");

const main = async () => {
  const github = new Octokit({
    auth: process.env.GITHUB_TOKEN,
    userAgent: "fat bears 2021",
  });

  const [issueNumber] = process.argv;

  const issue = await github.rest.issues.get({
    owner: "",
    repo: "",
    issue_number: issueNumber,
  });

  console.log(issue);
};
main();
