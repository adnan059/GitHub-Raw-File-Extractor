import { useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "./App.css";

function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [filter, setFilter] = useState("");
  const [files, setFiles] = useState([]);
  const [repoInfo, setRepoInfo] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔹 Fetch files from backend
  const handleFetch = async () => {
    try {
      setLoading(true);
      setError("");
      setFiles([]);

      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/api/files`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ repoUrl, filter }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch files");
      }

      setFiles(data.files || []);
      setRepoInfo({
        repo: data.repo,
        branch: data.branch,
        total: data.total,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Copy link
  const handleCopy = () => {
    if (!files || files.length === 0) return;

    const formattedText = files
      .map((file) => `${file.path}:\n${file.fileLink}`)
      .join("\n\n");

    navigator.clipboard.writeText(formattedText);
    toast.success("Copied !", { autoClose: 1000 });
  };

  return (
    <div className="appContainer">
      <h1 className="title">GitHub Raw File Extractor</h1>

      {/* 🔹 Input Section */}
      <div className="searchBoxes">
        <input
          type="text"
          placeholder="Paste GitHub public repository URL"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
        />

        <input
          type="text"
          placeholder="Filter (e.g. .tsx, components)"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        <button onClick={handleFetch} disabled={loading} className="primButton">
          {loading ? "Loading..." : "Fetch Files"}
        </button>
      </div>

      {/* 🔹 Error */}
      {error && <p className="errorMessage">⚠ {error}</p>}

      {/* 🔹 Repo Info */}
      {repoInfo && (
        <div className="repoInfo">
          <p>
            <strong>Repository:</strong> {repoInfo.repo}
          </p>
          <p>
            <strong>Branch:</strong> {repoInfo.branch}
          </p>
          <p>
            <strong>Total Files:</strong> {repoInfo.total}
          </p>
        </div>
      )}

      {/* 🔹 File List */}
      <ul className="fileList">
        {files && files.length > 0 && (
          <button className="primButton" onClick={handleCopy}>
            Copy
          </button>
        )}
        {files.map((file, index) => (
          <li key={index} className="singleFile">
            <p>{file.path}:</p>
            <a href={file.fileLink} target="_blank" rel="noreferrer">
              {file.fileLink}
            </a>
          </li>
        ))}
      </ul>

      <ToastContainer />
    </div>
  );
}

export default App;
