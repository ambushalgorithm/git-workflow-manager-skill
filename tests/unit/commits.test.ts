// Test commit tracking operations
jest.mock('../../src/lib/git', () => ({
  git: jest.fn(),
}));

jest.mock('../../src/lib/repo', () => ({
  loadConfig: jest.fn(),
  saveConfig: jest.fn(),
}));

import * as gitModule from '../../src/lib/git';
import * as repoModule from '../../src/lib/repo';
import { tagCommit, listPRReadyCommits, listInternalOnlyCommits, listAllTrackedCommits, showStagingIntegrationDiff } from '../../src/lib/commits';

describe('Commit Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('tagCommit', () => {
    it('should tag a commit with pr-ready status', async () => {
      (gitModule.git as jest.Mock)
        .mockResolvedValueOnce('') // cat-file check
        .mockResolvedValueOnce('test commit message'); // log
      
      (repoModule.loadConfig as jest.Mock).mockResolvedValue({
        repoType: 'internal',
        defaultBranch: 'master',
        createdAt: new Date().toISOString(),
        branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' },
        tracking: { commits: [] }
      });
      (repoModule.saveConfig as jest.Mock).mockResolvedValue(undefined);

      await tagCommit('abc123def', 'pr-ready');

      expect(repoModule.saveConfig).toHaveBeenCalled();
    });

    it('should throw on invalid status', async () => {
      // @ts-ignore - intentionally passing invalid status
      await expect(tagCommit('abc123', 'invalid')).rejects.toThrow("Invalid status");
    });

    it('should throw on non-existent commit', async () => {
      (gitModule.git as jest.Mock).mockRejectedValue(new Error('not found'));

      await expect(tagCommit('invalidhash', 'pr-ready')).rejects.toThrow("not found");
    });
  });

  describe('listPRReadyCommits', () => {
    it('should return pr-ready commits', async () => {
      (repoModule.loadConfig as jest.Mock).mockResolvedValue({
        tracking: {
          commits: [
            { hash: 'abc123', status: 'pr-ready', message: 'feat: add thing', tags: [], createdAt: '2024-01-01' },
            { hash: 'def456', status: 'internal-only', message: 'chore: internal', tags: [], createdAt: '2024-01-02' },
          ]
        }
      });
      (gitModule.git as jest.Mock).mockResolvedValue('');

      const commits = await listPRReadyCommits();
      expect(commits).toHaveLength(1);
      expect(commits[0].hash).toBe('abc123');
    });

    it('should return empty array when no tracking', async () => {
      (repoModule.loadConfig as jest.Mock).mockResolvedValue(null);

      const commits = await listPRReadyCommits();
      expect(commits).toHaveLength(0);
    });
  });

  describe('listInternalOnlyCommits', () => {
    it('should return internal-only commits', async () => {
      (repoModule.loadConfig as jest.Mock).mockResolvedValue({
        tracking: {
          commits: [
            { hash: 'abc123', status: 'pr-ready', message: 'feat: add thing', tags: [], createdAt: '2024-01-01' },
            { hash: 'def456', status: 'internal-only', message: 'chore: internal', tags: [], createdAt: '2024-01-02' },
          ]
        }
      });
      (gitModule.git as jest.Mock).mockResolvedValue('');

      const commits = await listInternalOnlyCommits();
      expect(commits).toHaveLength(1);
      expect(commits[0].hash).toBe('def456');
    });
  });

  describe('listAllTrackedCommits', () => {
    it('should return all tracked commits', async () => {
      (repoModule.loadConfig as jest.Mock).mockResolvedValue({
        tracking: {
          commits: [
            { hash: 'abc123', status: 'pr-ready', message: 'feat: add thing', tags: [], createdAt: '2024-01-01' },
            { hash: 'def456', status: 'internal-only', message: 'chore: internal', tags: [], createdAt: '2024-01-02' },
          ]
        }
      });

      const commits = await listAllTrackedCommits();
      expect(commits).toHaveLength(2);
    });
  });

  describe('showStagingIntegrationDiff', () => {
    it('should return diff between staging and integration', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('commit 1\n\nfile1.txt\nfile2.txt');

      const diff = await showStagingIntegrationDiff();
      expect(diff).toContain('commit 1');
    });

    it('should return message when no differences', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('');

      const diff = await showStagingIntegrationDiff();
      expect(diff).toBe('No differences between staging and integration');
    });
  });
});