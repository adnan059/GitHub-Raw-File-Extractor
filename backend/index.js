const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
dotenv.config();
const PORT = Number(process.env.PORT);
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL;

const app = express();

app.use(
  cors({
    origin: FRONTEND_BASE_URL,
    methods: ["POST"],
  }),
);
app.use(express.json());

const GITHUB_API = "https://api.github.com";

// 🔹 Helper: parse repo URL safely
function parseRepoUrl(repoUrl) {
  try {
    const url = new URL(repoUrl);
    const parts = url.pathname.replace(/^\/|\.git$/g, "").split("/");

    if (parts.length < 2) return null;

    return {
      owner: parts[0],
      repo: parts[1],
    };
  } catch {
    return null;
  }
}

// 🔹 Helper: fetch JSON with error handling
async function fetchGitHub(url) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      // Optional: add token to avoid rate limit
      ...(process.env.GITHUB_TOKEN && {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      }),
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`);
  }

  return res.json();
}

app.post("/api/files", async (req, res) => {
  try {
    const { repoUrl, filter = "" } = req.body;

    // 🔴 Validation
    if (!repoUrl) {
      return res.status(400).json({ error: "Repository URL is required" });
    }

    const parsed = parseRepoUrl(repoUrl);

    if (!parsed) {
      return res.status(400).json({ error: "Invalid GitHub URL" });
    }

    const { owner, repo } = parsed;

    // 🔹 Get repo info (default branch)
    const repoData = await fetchGitHub(`${GITHUB_API}/repos/${owner}/${repo}`);

    const branch = repoData.default_branch;

    // 🔹 Get full tree
    const treeData = await fetchGitHub(
      `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    );

    if (!treeData.tree) {
      return res.status(500).json({ error: "Failed to read repository tree" });
    }

    // 🔹 Transform files
    let files = treeData.tree
      .filter((item) => item.type === "blob")
      .map((file) => {
        const name = file.path.split("/").pop();
        const type = name.includes(".") ? name.split(".").pop() : "";

        return {
          name,
          path: file.path,
          type,
          size: file.size || 0,
          fileLink: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`,
        };
      });

    // 🔹 Optional filtering (backend level)
    if (filter) {
      const f = filter.toLowerCase();
      files = files.filter(
        (file) =>
          file.path.toLowerCase().includes(f) ||
          file.type.toLowerCase().includes(f),
      );
    }

    return res.json({
      repo: `${owner}/${repo}`,
      branch,
      total: files.length,
      files,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Something went wrong while fetching repository files",
    });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
