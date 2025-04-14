import { Octokit } from "octokit";
import dotenv from 'dotenv'
dotenv.config()

const AUTH_TOKEN = process.env.AUTH_TOKEN;

const octokit = new Octokit({ 
    auth: AUTH_TOKEN
})

const response = await octokit.request("GET /rate_limit");
console.log(response.data);