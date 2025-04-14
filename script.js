import { Octokit } from "octokit";
import dotenv from 'dotenv'
dotenv.config()

const AUTH_TOKEN = process.env.AUTH_TOKEN;

const octokit = new Octokit({
  auth: AUTH_TOKEN,
});

async function getRepos(repo_owner_name) {
  let repos = [];
  let page = 1;

  while (true) {
    const result = await octokit.request(
      `GET /users/${repo_owner_name}/repos`,
      {
        owner: `${repo_owner_name}`,
        per_page: 50,
        page: page,
      }
    );

    repos = repos.concat(result.data);

    if (result.data.length < 50) break;

    page++;
  }

  return repos;
}

const umd_repos = await getRepos("Hack4Impact-UMD");
const uiuc_repos = await getRepos("hack4impact-uiuc");

async function getDataFromRepos(repos) {
  let repo_data = [];

  const data = await Promise.all(
    repos.map(async (repo) => {
      const languagesUsed = await octokit.request(`GET ${repo.languages_url}`);

      async function getREADME(owner, repo) {
        try {
          const response = await octokit.request(
            `GET /repos/${owner}/${repo}/readme`
          );
          return true;
        } catch (error) {
          return false;
        }
      }

      const readme = await getREADME(repo.owner.login, repo.name);

      const open_pr_response = await octokit.request(
        `GET /repos/${repo.owner.login}/${repo.name}/pulls`,
        {
          owner: repo.owner.login,
          repo: repo.name,
          state: "open",
        }
      );

      const deployment_response = await octokit.request(
        `GET ${repo.deployments_url}`,
        {
          per_page: 1,
        }
      );
      const latest_deployment = deployment_response.data[0];

      function formatDate(dateString) {
        const date = new Date(dateString);
        const month = date.getUTCMonth() + 1;
        const day = date.getUTCDate();
        const year = date.getUTCFullYear();
        return `${month}/${day}/${year}`;
      }

      repo_data = repo_data.concat({
        name: repo.name, // project name
        creation_date: formatDate(repo.created_at), // creation date
        last_activity: formatDate(repo.pushed_at), // last activity = last commit
        repo_link: repo.html_url, // repository link
        visibility: repo.visibility, // public or private visibility
        has_readme: readme, // boolean for readme file
        license: repo.license ? repo.license.spdx_id : null, // get license id if license found
        open_issues: repo.open_issues_count, // number of open issues
        open_prs:
          open_pr_response.headers["x-total-count"] ||
          open_pr_response.data.length, // number of open PRs
        languages: Object.keys(languagesUsed.data), // all languages used
        deployment: latest_deployment
          ? {
              creator: latest_deployment.creator.login,
              type: latest_deployment.creator.type,
            }
          : null, // get deployment creator and type (user, bot, etc.)
      });
    })
  );

  return repo_data;
}

const umd_data = await getDataFromRepos(umd_repos);
const uiuc_data = await getDataFromRepos(uiuc_repos);

// console.log(umd_data)
console.log(uiuc_data);

import fs from 'fs';

function formatRepoData(repo_data) {
    return repo_data.map(repo => 
        `Repository: ${repo.name}\n` +
        `Created At: ${repo.creation_date}\n` +
        `Last Updated: ${repo.last_activity}\n` +
        `Link: ${repo.repo_link}\n` + 
        `Visibility: ${repo.visibility}\n` + 
        `README: ${repo.has_readme}\n` + 
        `License: ${repo.license}\n` +
        `Open Issues: ${repo.open_issues}\n` +
        `Open PRs: ${repo.open_prs}\n` + 
        `Languages: ${repo.languages}\n` +
        `Deployment: ${repo.deployment}\n` + 
        `----------------------------\n`
    ).join("\n"); // Join with double newlines
}

fs.writeFileSync("umd_repo.txt", formatRepoData(umd_data), (err) => {
    if (err) {
        console.error("Error writing file:", err);
    } else {
        console.log("Repo data written to umd_repo.txt");
    }
});
fs.writeFileSync("uiuc_repo.txt", formatRepoData(uiuc_data), (err) => {
    if (err) {
        console.error("Error writing file:", err);
    } else {
        console.log("Repo data written to uiuc_repo.txt");
    }
});