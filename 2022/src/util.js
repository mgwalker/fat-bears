const e = require("@actions/exec");
const fs = require("fs");
const os = require("os");
const { Octokit } = require("@octokit/rest");

const github = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: "fat bears 2021",
});

const EVENT = JSON.parse(
  fs.readFileSync(process.env.GITHUB_EVENT_PATH, { encoding: "utf-8" })
);

const issueNumber = (() => {
  if (EVENT.type === "IssueCommentEvent") {
    return EVENT.issue.issueNumber;
  }
  return -1;
})();

const {
  repository: {
    name: repo,
    owner: { login: owner },
  },
} = JSON.parse(
  fs.readFileSync(process.env.GITHUB_EVENT_PATH, { encoding: "utf-8" })
);

const addIssueComment = async (message) =>
  github.request(
    `POST /repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    { body: message }
  );

const closeAndLockIssue = async () => {
  await github.request(`PATCH /repos/${owner}/${repo}/issues/${issueNumber}`, {
    state: "closed",
  });

  await github.request(
    `PUT /repos/${owner}/${repo}/issues/${issueNumber}/lock`,
    {
      lock_reason: "resolved",
    }
  );
};

const exec = async (cmd) => e.exec("sh", ["-c", cmd]);

const getUser = async () => {
  return EVENT.sender.login;
};

process.stdout.write(os.EOL);
const output = (name, value) => {
  process.stdout.write(`::set-output name=${name}::${value}`);
  process.stdout.write(os.EOL);
};

module.exports = {
  addIssueComment,
  closeAndLockIssue,
  exec,
  getUser,
  github,
  gh: {
    issue: issueNumber,
    repo,
    owner,
  },
  output,
};
