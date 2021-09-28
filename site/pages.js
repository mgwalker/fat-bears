import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const docs = path.join(DIR, "..", "docs");

const getJSON = async (path) =>
  JSON.parse(await fs.readFile(path, { encoding: "utf-8" }));

const pages = async () => {
  const bracket = await getJSON(path.join(docs, "bracket.json"));
  const matchups = await getJSON(path.join(docs, "allMatchups.json"));

  const undecided = [];
  if (!bracket.champion) {
    const brackets = [bracket.bracket.left, bracket.bracket.right];
    while (brackets.length) {
      const bracket = brackets.pop();
      if (
        bracket.bear === null &&
        bracket.bracket.left.bear &&
        bracket.bracket.right.bear
      ) {
        undecided.push({
          id: bracket.bracket.id,
          left: {
            bear: bracket.bracket.left.bear,
            picks: [
              matchups[bracket.bracket.id]?.[bracket.bracket.left.bear] ?? [
                "nobody",
              ],
            ],
          },
          right: {
            bear: bracket.bracket.right.bear,
            picks: matchups[bracket.bracket.id]?.[
              bracket.bracket.right.bear
            ] ?? ["nobody"],
          },
        });
      } else if (bracket.bracket) {
        brackets.push(bracket.bracket.left);
        brackets.push(bracket.bracket.right);
      }
    }
  }
  undecided.sort((a, b) => (+a.id > +b.id ? 1 : -1));

  const html = undecided
    .map(
      ({ id, left, right }, i) => `
  ${i > 0 ? `<tr class="spacer"><td colspan="5"></td></tr>` : ""}
  <tr>
    <th class="match">picked by</th>
    <th class="match" colspan="3">Match ${+id}</th>
    <th class="match">picked by</th>
  </tr>
  <tr>
    <td class="left-picks" rowspan="2">
      ${left.picks.join("<br/>")}
    </td>
    <td class="bear">${left.bear}</td>
    <td class="vs" rowspan="2">vs.</td>
    <td class="bear">${right.bear}</td>
    <td class="right-picks" rowspan="2">
      ${right.picks.join("<br/>")}
    </td>
  </tr>
  <tr>
    <td class="img img-left"><img src="bears/${left.bear
      .toLowerCase()
      .replace(/[\s']/g, "_")}.png"></td>
    <td class="img img-right"><img src="bears/${right.bear
      .toLowerCase()
      .replace(/[\s']/g, "_")}.png"></td>
`
    )
    .join("\n");

  await fs.writeFile(
    path.join(docs, "index.html"),
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <style type="text/css">
      * {
        font-family: sans-serif;
      }

      table {
        border-spacing: 0;
        margin: 0 auto;
      }

      tr.spacer td {
        padding: 1em 0;
      }

      td {
        vertical-align: top;
      }

      td.bear {
        text-align: center;
        font-size: 2em;
        font-weight: 700;
        padding: 0 1em;
      }

      td.img {
        padding-bottom: 1em;
        text-align: center;
        vertical-align: middle;
      }

      td.img img {
        max-height: 400px;
        max-width: 400px;
      }

      td.left-picks {
        text-align: right;
      }

      th.match {
        background-color: darkseagreen;
        padding: 0.5em 10px;
      }

      td.right-picks {
        text-align: left;
      }

      td.vs {
        vertical-align: middle;
      }
    </style>
  </head>
  <body>
    <table>
${html}
    </table>
  </body>
</html>`
  );
};

export default pages;
pages();
