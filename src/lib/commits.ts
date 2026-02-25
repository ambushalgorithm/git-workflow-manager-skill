import { git } from './git';
import { loadConfig, saveConfig } from './repo';

export type CommitStatus = 'pr-ready' | 'internal-only' | 'pending'

const VALID_STATUSES: CommitStatus[] = ['pr-ready', 'internal-only', 'pending'];

/**
 * Validate commit hash exists in repository
 */
async function commitExists(hash: string): Promise<boolean> {
  try {
    await git(['cat-file', '-e', `${hash}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate status is valid
 */
function isValidStatus(status: string): status is CommitStatus {
  return VALID_STATUSES.includes(status as CommitStatus);
}

/**
 * Tag a commit with a status (pr-ready, internal-only, pending)
 * COMMIT-001
 */
export async function tagCommit(hash: string, status: CommitStatus): Promise<void> {
  // Validate status
  if (!isValidStatus(status)) {
    throw new Error(`Invalid status. Use 'pr-ready', 'internal-only', or 'pending'`);
  }

  // Validate commit exists
  if (!(await commitExists(hash))) {
    throw new Error(`Commit '${hash}' not found`);
  }

  // Get commit message for metadata
  const message = await git(['log', '-1', '--format=%s', hash]);

  // Load config
  const config = await loadConfig();
  if (!config) {
    throw new Error('No workflow config found. Run "git-workflow init" first.');
  }

  // Initialize tracking.commits if not exists
  if (!config.tracking) {
    config.tracking = { commits: [] };
  }
  if (!config.tracking.commits) {
    config.tracking.commits = [];
  }

  // Check if already tagged
  const existingIndex = config.tracking.commits.findIndex(c => c.hash === hash);
  const metadata = {
    status,
    message: message.trim(),
    tags: [] as string[],
    createdAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    // Update existing
    config.tracking.commits[existingIndex] = { ...config.tracking.commits[existingIndex], hash, ...metadata };
  } else {
    // Add new
    config.tracking.commits.push({ hash, ...metadata });
  }

  await saveConfig(config);
  console.log(`Tagged commit ${hash.slice(0, 7)} as '${status}'`);
}

/**
 * Store additional commit metadata
 * COMMIT-002
 */
export async function storeCommitMetadata(
  hash: string, 
  metadata: { upstreamPr?: number; tags?: string[] }
): Promise<void> {
  const config = await loadConfig();
  if (!config || !config.tracking?.commits) {
    throw new Error('No workflow config or commit tracking found.');
  }

  const commitIndex = config.tracking.commits.findIndex(c => c.hash === hash);
  if (commitIndex < 0) {
    throw new Error(`Commit '${hash}' not found in tracking. Tag it first with git-workflow tag.`);
  }

  // Preserve existing metadata, update with new
  config.tracking.commits[commitIndex] = {
    ...config.tracking.commits[commitIndex],
    ...metadata,
  };

  await saveConfig(config);
  console.log(`Updated metadata for commit ${hash.slice(0, 7)}`);
}

/**
 * Get all commits for a given status
 */
async function getCommitsByStatus(status: CommitStatus): Promise<any[]> {
  const config = await loadConfig();
  if (!config || !config.tracking?.commits) {
    return [];
  }

  const commits: any[] = [];
  for (const commit of config.tracking.commits) {
    if (commit.status === status) {
      // Get file list for this commit
      const files = await git(['diff', '--name-only', `${commit.hash}^..${commit.hash}`]).catch(() => '');
      
      commits.push({
        hash: commit.hash,
        message: commit.message,
        author: '',
        date: commit.createdAt,
        status: commit.status,
        files: files.trim().split('\n').filter(Boolean),
      });
    }
  }

  return commits;
}

/**
 * List all PR-ready commits
 * COMMIT-003
 */
export async function listPRReadyCommits(): Promise<any[]> {
  return getCommitsByStatus('pr-ready');
}

/**
 * List all internal-only commits
 * COMMIT-004
 */
export async function listInternalOnlyCommits(): Promise<any[]> {
  return getCommitsByStatus('internal-only');
}

/**
 * Show diff between staging and integration branches
 * COMMIT-005
 */
export async function showStagingIntegrationDiff(): Promise<string> {
  // Get commits in integration but not in staging
  const diff = await git([
    'log', 
    'staging..integration', 
    '--oneline', 
    '--name-only'
  ]);

  return diff || 'No differences between staging and integration';
}

/**
 * Update status of an existing tagged commit
 * COMMIT-006
 */
export async function updateCommitStatus(hash: string, newStatus: CommitStatus): Promise<void> {
  await tagCommit(hash, newStatus);
  console.log(`Updated commit ${hash.slice(0, 7)} status to '${newStatus}'`);
}

/**
 * Add a lightweight tag to a commit
 * COMMIT-007
 */
export async function tagCommitMessage(hash: string, tag: string): Promise<void> {
  // Validate commit exists
  if (!(await commitExists(hash))) {
    throw new Error(`Commit '${hash}' not found`);
  }

  // Create lightweight tag locally
  await git(['tag', '-a', tag, '-m', `Tagged: ${tag}`, hash]);
  console.log(`Created tag '${tag}' on commit ${hash.slice(0, 7)}`);
}

/**
 * List all tracked commits
 */
export async function listAllTrackedCommits(): Promise<any[]> {
  const config = await loadConfig();
  if (!config || !config.tracking?.commits) {
    return [];
  }

  const commits: any[] = [];
  for (const commit of config.tracking.commits) {
    commits.push({
      hash: commit.hash,
      message: commit.message,
      author: '',
      date: commit.createdAt,
      status: commit.status,
      files: [],
    });
  }

  return commits;
}

/**
 * Get commit info by hash
 */
export async function getCommitInfo(hash: string): Promise<any | null> {
  const config = await loadConfig();
  if (!config || !config.tracking?.commits) {
    return null;
  }

  const commit = config.tracking.commits.find(c => c.hash === hash);
  if (!commit) {
    return null;
  }

  return {
    hash: commit.hash,
    message: commit.message,
    author: '',
    date: commit.createdAt,
    status: commit.status,
    files: [],
  };
}

/**
 * Remove commit from tracking
 */
export async function removeCommitFromTracking(hash: string): Promise<void> {
  const config = await loadConfig();
  if (!config || !config.tracking?.commits) {
    return;
  }

  config.tracking.commits = config.tracking.commits.filter(c => c.hash !== hash);
  await saveConfig(config);
  console.log(`Removed commit ${hash.slice(0, 7)} from tracking`);
}