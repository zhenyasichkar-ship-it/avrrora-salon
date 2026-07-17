// POST /api/publish  Authorization: Bearer <token>
// Body: { message, files: [{ path, b64 }] }
// Commits all files to GitHub in a single commit; Vercel then redeploys.
// Env: GITHUB_TOKEN (contents:write PAT), GITHUB_REPO (owner/repo), GITHUB_BRANCH.
const { verifyToken } = require('./login.js');

const ALLOWED = [/^assets\/content\.json$/, /^images\/uploads\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/];
const MAX_FILE = 4 * 1024 * 1024; // 4MB per file after base64 decode
const MAX_FILES = 30;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!verifyToken(auth)) return res.status(401).json({ error: 'Сесія недійсна — увійдіть знову' });

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'zhenyasichkar-ship-it/avrrora-salon';
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token) return res.status(503).json({ error: 'GITHUB_TOKEN is not configured on Vercel' });

  const files = (req.body && req.body.files) || [];
  if (!files.length) return res.status(400).json({ error: 'Немає змін для публікації' });
  if (files.length > MAX_FILES) return res.status(400).json({ error: 'Забагато файлів за раз' });
  for (const f of files) {
    if (!f.path || !ALLOWED.some((re) => re.test(f.path))) {
      return res.status(400).json({ error: 'Недозволений шлях: ' + f.path });
    }
    if (!f.b64 || Buffer.from(f.b64, 'base64').length > MAX_FILE) {
      return res.status(400).json({ error: 'Файл завеликий: ' + f.path });
    }
  }

  const gh = async (path, opts = {}) => {
    const r = await fetch('https://api.github.com' + path, {
      ...opts,
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'avrrora-admin',
        ...(opts.body ? { 'Content-Type': 'application/json' } : {})
      }
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('GitHub ' + path + ' -> ' + r.status + ': ' + (data.message || ''));
    return data;
  };

  try {
    const ref = await gh(`/repos/${repo}/git/ref/heads/${branch}`);
    const baseSha = ref.object.sha;
    const baseCommit = await gh(`/repos/${repo}/git/commits/${baseSha}`);

    const treeEntries = [];
    for (const f of files) {
      const blob = await gh(`/repos/${repo}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({ content: f.b64, encoding: 'base64' })
      });
      treeEntries.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
    }

    const tree = await gh(`/repos/${repo}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree: treeEntries })
    });

    const message = (req.body.message || 'Admin: update site content') + '\n\nPublished from /admin';
    const commit = await gh(`/repos/${repo}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({ message, tree: tree.sha, parents: [baseSha] })
    });

    await gh(`/repos/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commit.sha, force: false })
    });

    res.status(200).json({ ok: true, commit: commit.sha.slice(0, 7) });
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
};
