const e = require("@actions/exec");
const fs = require("fs");
const os = require("os");
const { Octokit } = require("@octokit/rest");

const github = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: "fat bears 2021",
});

const {
  issue: { number: issueNumber },
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
  const {
    data: {
      user: { login },
    },
  } = await github.request(`GET /repos/${owner}/${repo}/issues/${issueNumber}`);
  return login;
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
