const util = require("./util");

(async () => {
  const bracketUser = await util.getUser();

  await util.exec(
    `git config --local user.email "mgwalker@users.noreply.github.com"`
  );
  await util.exec(`git config --local user.name "bracketeer"`);
  await util.exec(`git add .`);
  await util.exec(`git commit -m "adding ${bracketUser}'s bracket"`);
  await util.exec(
    `git push "https://${util.gh.owner}:$GITHUB_TOKEN@github.com/${util.gh.owner}/${util.gh.repo}.git" HEAD:main`
  );
})();
