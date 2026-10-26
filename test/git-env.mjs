// Imported first by every fixture runner that spawns git. A git hook run from a linked worktree exports
// GIT_DIR as an absolute path into the real repo (git 2.52, measured 2026-10-26); a fixture's `git init`
// or `git config` in a temp dir then acts on the real repo instead. Drop every variable git treats as
// repo-local before anything spawns git, so each fixture's git finds its repo from its own cwd.
import { spawnSync } from 'node:child_process';

// Used only when git cannot answer; the list `git rev-parse --local-env-vars` printed on git 2.52.
const FALLBACK = ['GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_CONFIG', 'GIT_CONFIG_PARAMETERS', 'GIT_CONFIG_COUNT', 'GIT_OBJECT_DIRECTORY', 'GIT_DIR', 'GIT_WORK_TREE', 'GIT_IMPLICIT_WORK_TREE', 'GIT_GRAFT_FILE', 'GIT_INDEX_FILE', 'GIT_NO_REPLACE_OBJECTS', 'GIT_REPLACE_REF_BASE', 'GIT_PREFIX', 'GIT_SHALLOW_FILE', 'GIT_COMMON_DIR'];

const r = spawnSync('git', ['rev-parse', '--local-env-vars'], { encoding: 'utf8' });
const names = r.status === 0 ? r.stdout.split('\n').map((s) => s.trim()).filter(Boolean) : FALLBACK;
for (const name of new Set([...names, ...FALLBACK])) delete process.env[name];
