// Test PR branch operations
jest.mock('../../src/lib/git', () => ({
  git: jest.fn(),
  branchExists: jest.fn(),
  checkout: jest.fn(),
  getCurrentBranch: jest.fn(),
  fetchAll: jest.fn(),
  pushBranch: jest.fn(),
}));

jest.mock('../../src/lib/repo', () => ({
  loadConfig: jest.fn(),
  saveConfig: jest.fn(),
}));

jest.mock('child_process', () => ({
  exec: jest.fn(),
  promisify: jest.fn(() => jest.fn()),
}));

import * as gitModule from '../../src/lib/git';
import * as repoModule from '../../src/lib/repo';
import { getPRReadyCommits, getPRReadyCommitsOnBranch } from '../../src/lib/pr-branch';

describe('PR Branch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPRReadyCommits', () => {
    it('should return pr-ready commits from config', async () => {
      (repoModule.loadConfig as jest.Mock).mockResolvedValue({
        repoType: 'internal',
        defaultBranch: 'master',
        createdAt: new Date().toISOString(),
        branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' },
        tracking: {
          commits: [
            { hash: 'abc123', status: 'pr-ready', message: 'feat: add login', tags: [], createdAt: '' },
            { hash: 'def456', status: 'internal-only', message: 'chore: internal', tags: [], createdAt: '' },
            { hash: 'ghi789', status: 'pr-ready', message: 'feat: add logout', tags: [], createdAt: '' },
          ]
        }
      });

      const commits = await getPRReadyCommits();
      
      expect(commits).toEqual(['abc123', 'ghi789']);
    });

    it('should return empty array when no tracking config', async () => {
      (repoModule.loadConfig as jest.Mock).mockResolvedValue({
        repoType: 'internal',
        defaultBranch: 'master',
        createdAt: new Date().toISOString(),
        branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' },
      });

      const commits = await getPRReadyCommits();
      
      expect(commits).toEqual([]);
    });
  });

  describe('getPRReadyCommitsOnBranch', () => {
    it('should filter pr-ready commits to only those on current branch', async () => {
      // Mock current branch
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('feat/my-feature');
      
      // Mock config with 3 pr-ready commits
      (repoModule.loadConfig as jest.Mock).mockResolvedValue({
        repoType: 'internal',
        defaultBranch: 'master',
        createdAt: new Date().toISOString(),
        branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' },
        tracking: {
          commits: [
            { hash: 'abc123', status: 'pr-ready', message: 'feat: add login', tags: [], createdAt: '' },
            { hash: 'def456', status: 'pr-ready', message: 'feat: add logout', tags: [], createdAt: '' },
            { hash: 'ghi789', status: 'pr-ready', message: 'feat: add settings', tags: [], createdAt: '' },
          ]
        }
      });
      
      // Mock branch log - only abc123 and ghi789 are on this branch (def456 is on different branch)
      // getPRReadyCommitsOnBranch calls git() for branch log
      (gitModule.git as jest.Mock)
        .mockResolvedValueOnce('abc123\nghi789'); // branch log

      const commits = await getPRReadyCommitsOnBranch();
      
      // Should only include commits that exist on current branch
      expect(commits).toEqual(['abc123', 'ghi789']);
    });

    it('should throw error on detached HEAD', async () => {
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue(null);

      await expect(getPRReadyCommitsOnBranch()).rejects.toThrow(
        'Detached HEAD. Must be on a working branch to create PR branch.'
      );
    });

    it('should throw error when run from PR branch', async () => {
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('feat/my-feature-pr');

      await expect(getPRReadyCommitsOnBranch()).rejects.toThrow(
        'Cannot run from PR branch "feat/my-feature-pr". Checkout your feature branch first.'
      );
    });

    it('should return empty array when no pr-ready commits exist', async () => {
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('feat/my-feature');
      
      (repoModule.loadConfig as jest.Mock).mockResolvedValue({
        repoType: 'internal',
        defaultBranch: 'master',
        createdAt: new Date().toISOString(),
        branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' },
        tracking: { commits: [] }
      });

      const commits = await getPRReadyCommitsOnBranch();
      
      expect(commits).toEqual([]);
    });

    it('should return empty when no pr-ready commits are on current branch', async () => {
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('feat/my-feature');
      
      (repoModule.loadConfig as jest.Mock).mockResolvedValue({
        repoType: 'internal',
        defaultBranch: 'master',
        createdAt: new Date().toISOString(),
        branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' },
        tracking: {
          commits: [
            { hash: 'abc123', status: 'pr-ready', message: 'feat: add login', tags: [], createdAt: '' },
          ]
        }
      });
      
      // Branch log is empty or has different commits - only one git() call
      (gitModule.git as jest.Mock)
        .mockResolvedValueOnce('xyz999'); // branch has different commits

      const commits = await getPRReadyCommitsOnBranch();
      
      expect(commits).toEqual([]);
    });
  });

  describe('generatePRDescription', () => {
    beforeEach(() => {
      // Set environment variables for testing
      process.env.OPENCLAW_MODEL = 'test-model';
      process.env.OPENCLAW_VERSION = '1.0.0';
    });

    afterEach(() => {
      delete process.env.OPENCLAW_MODEL;
      delete process.env.OPENCLAW_VERSION;
    });

    it('should generate description from commit messages', async () => {
      // Setup mocks BEFORE importing
      const mockGit = gitModule.git as jest.Mock;
      const mockGetCurrentBranch = gitModule.getCurrentBranch as jest.Mock;
      const mockLoadConfig = repoModule.loadConfig as jest.Mock;
      
      // Mock getCurrentBranch
      mockGetCurrentBranch.mockResolvedValue('feat/my-feature');
      
      // Mock loadConfig for hierarchy
      mockLoadConfig.mockResolvedValue({
        repoType: 'internal',
        defaultBranch: 'master',
        createdAt: new Date().toISOString(),
        branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' },
        hierarchy: { integration: 'integration', develop: 'develop' },
        tracking: { commits: [] }
      });
      
      // Mock git log
      mockGit.mockResolvedValue('feat: add login\nfix: resolve bug\ndocs: update readme');

      const { generatePRDescription } = await import('../../src/lib/pr-branch');
      
      const desc = await generatePRDescription('feat/my-feature-pr');
      
      expect(desc).toContain('AI/Vibe-Coded Disclosure');
      expect(desc).toContain('test-model');
      expect(desc).toContain('add login');
    });

    it('should handle empty commits gracefully', async () => {
      const mockGit = gitModule.git as jest.Mock;
      const mockGetCurrentBranch = gitModule.getCurrentBranch as jest.Mock;
      const mockLoadConfig = repoModule.loadConfig as jest.Mock;
      
      mockGetCurrentBranch.mockResolvedValue('feat/my-feature');
      mockLoadConfig.mockResolvedValue({
        repoType: 'internal',
        defaultBranch: 'master',
        createdAt: new Date().toISOString(),
        hierarchy: { integration: 'integration', develop: 'develop' },
        tracking: { commits: [] }
      });
      mockGit.mockResolvedValue(''); // empty log

      const { generatePRDescription } = await import('../../src/lib/pr-branch');
      const desc = await generatePRDescription('feat/my-feature-pr');
      
      // Empty commits should return empty string
      expect(desc).toBe('');
    });
  });
});
