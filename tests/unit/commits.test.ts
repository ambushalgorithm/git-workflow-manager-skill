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
import { tagCommit, listPRReadyCommits, listInternalOnlyCommits, listAllTrackedCommits, showStagingDevelopDiff, storeCommitMetadata, getCommitInfo, removeCommitFromTracking, updateCommitStatus, tagCommitMessage } from '../../src/lib/commits';

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

  describe('showStagingDevelopDiff', () => {
    it('should return diff between staging and develop', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('commit 1\n\nfile1.txt\nfile2.txt');

      const diff = await showStagingDevelopDiff();
      expect(diff).toContain('commit 1');
    });

    it('should return message when no differences', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('');

      const diff = await showStagingDevelopDiff();
      expect(diff).toBe('No differences between staging and develop');
    });
  });
});
describe('Additional Commit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tagCommit should update existing commit status', async () => {
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('') // cat-file check
      .mockResolvedValueOnce('updated message'); // log
    
    const existingConfig = {
      repoType: 'internal' as const,
      defaultBranch: 'master',
      createdAt: new Date().toISOString(),
      branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' },
      tracking: {
        commits: [
          { hash: 'abc123def', status: 'pending' as any, message: 'old message', tags: [], createdAt: '2024-01-01' }
        ]
      }
    };
    (repoModule.loadConfig as jest.Mock).mockResolvedValue(existingConfig);
    (repoModule.saveConfig as jest.Mock).mockResolvedValue(undefined);

    await tagCommit('abc123def', 'pr-ready');

    expect(repoModule.saveConfig).toHaveBeenCalled();
    // Should have updated existing commit
    const savedConfig = (repoModule.saveConfig as jest.Mock).mock.calls[0][0];
    expect(savedConfig.tracking.commits[0].status).toBe('pr-ready');
  });

  it('showStagingDevelopDiff should call git log', async () => {
    (gitModule.git as jest.Mock).mockResolvedValue('commit abc\n\nfile1.txt');

    const diff = await showStagingDevelopDiff();
    expect(gitModule.git).toHaveBeenCalledWith(['log', 'staging..develop', '--oneline', '--name-only']);
  });

  it('listPRReadyCommits should call git for file list', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({
      tracking: {
        commits: [
          { hash: 'abc123', status: 'pr-ready', message: 'test', tags: [], createdAt: '2024-01-01' }
        ]
      }
    });
    (gitModule.git as jest.Mock).mockResolvedValue('file1.txt');

    const commits = await listPRReadyCommits();
    expect(commits[0].files).toContain('file1.txt');
  });
});

describe('Store Commit Metadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('storeCommitMetadata should add upstream PR', async () => {
    const config = {
      tracking: {
        commits: [{ hash: 'abc123', status: 'pr-ready' as any, message: 'test', tags: [], createdAt: '2024-01-01' }]
      }
    };
    (repoModule.loadConfig as jest.Mock).mockResolvedValue(config);
    (repoModule.saveConfig as jest.Mock).mockResolvedValue(undefined);

    await storeCommitMetadata('abc123', { upstreamPr: 42 });

    expect(repoModule.saveConfig).toHaveBeenCalled();
  });

  it('storeCommitMetadata should throw if no tracking', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({});

    await expect(storeCommitMetadata('abc123', { upstreamPr: 42 })).rejects.toThrow('No workflow config');
  });

  it('storeCommitMetadata should throw if commit not found', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({
      tracking: { commits: [] }
    });

    await expect(storeCommitMetadata('notfound', { upstreamPr: 42 })).rejects.toThrow('not found in tracking');
  });
});

describe('Get Commit Info', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getCommitInfo should return commit info', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({
      tracking: {
        commits: [{ hash: 'abc123', status: 'pr-ready' as any, message: 'test commit', tags: [], createdAt: '2024-01-01' }]
      }
    });

    const info = await getCommitInfo('abc123');
    expect(info).not.toBeNull();
    expect(info?.hash).toBe('abc123');
  });

  it('getCommitInfo should return null if not found', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({
      tracking: { commits: [] }
    });

    const info = await getCommitInfo('notfound');
    expect(info).toBeNull();
  });
});

describe('Remove Commit From Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removeCommitFromTracking should remove commit', async () => {
    const config = {
      tracking: {
        commits: [
          { hash: 'abc123', status: 'pr-ready' as any, message: 'test', tags: [], createdAt: '2024-01-01' },
          { hash: 'def456', status: 'internal-only' as any, message: 'test2', tags: [], createdAt: '2024-01-02' }
        ]
      }
    };
    (repoModule.loadConfig as jest.Mock).mockResolvedValue(config);
    (repoModule.saveConfig as jest.Mock).mockResolvedValue(undefined);

    await removeCommitFromTracking('abc123');

    expect(repoModule.saveConfig).toHaveBeenCalled();
    const savedConfig = (repoModule.saveConfig as jest.Mock).mock.calls[0][0];
    expect(savedConfig.tracking.commits).toHaveLength(1);
    expect(savedConfig.tracking.commits[0].hash).toBe('def456');
  });
});

describe('Empty Config Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listPRReadyCommits returns empty when no config', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue(null);
    const commits = await listPRReadyCommits();
    expect(commits).toHaveLength(0);
  });

  it('listInternalOnlyCommits returns empty when no config', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue(null);
    const commits = await listInternalOnlyCommits();
    expect(commits).toHaveLength(0);
  });

  it('listAllTrackedCommits returns empty when no config', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue(null);
    const commits = await listAllTrackedCommits();
    expect(commits).toHaveLength(0);
  });

  it('listAllTrackedCommits returns empty when no tracking', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({});
    const commits = await listAllTrackedCommits();
    expect(commits).toHaveLength(0);
  });

  it('getCommitInfo returns null when no config', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue(null);
    const info = await getCommitInfo('abc123');
    expect(info).toBeNull();
  });

  it('getCommitInfo returns null when no tracking', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({});
    const info = await getCommitInfo('abc123');
    expect(info).toBeNull();
  });

  it('removeCommitFromTracking returns when no config', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue(null);
    await removeCommitFromTracking('abc123');
    expect(repoModule.saveConfig).not.toHaveBeenCalled();
  });

  it('removeCommitFromTracking returns when no tracking', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({});
    await removeCommitFromTracking('abc123');
    expect(repoModule.saveConfig).not.toHaveBeenCalled();
  });
});

describe('tagCommit additional cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tagCommit should work when tracking does not exist', async () => {
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('') // cat-file
      .mockResolvedValueOnce('test commit');
    
    const config = {
      repoType: 'internal',
      defaultBranch: 'master',
      createdAt: new Date().toISOString(),
      branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' }
      // no tracking property
    };
    (repoModule.loadConfig as jest.Mock).mockResolvedValue(config);
    (repoModule.saveConfig as jest.Mock).mockResolvedValue(undefined);

    await tagCommit('abc123def', 'pending');

    expect(repoModule.saveConfig).toHaveBeenCalled();
    const saved = (repoModule.saveConfig as jest.Mock).mock.calls[0][0];
    expect(saved.tracking).toBeDefined();
    expect(saved.tracking.commits).toHaveLength(1);
  });

  it('tagCommit should work when tracking.commits does not exist', async () => {
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('') // cat-file
      .mockResolvedValueOnce('test commit');
    
    const config = {
      repoType: 'internal',
      defaultBranch: 'master',
      createdAt: new Date().toISOString(),
      branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' },
      tracking: {}  // tracking exists but no commits
    };
    (repoModule.loadConfig as jest.Mock).mockResolvedValue(config);
    (repoModule.saveConfig as jest.Mock).mockResolvedValue(undefined);

    await tagCommit('abc123def', 'internal-only');

    expect(repoModule.saveConfig).toHaveBeenCalled();
  });
});

describe('Additional Commit Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updateCommitStatus calls tagCommit and logs', async () => {
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('') // cat-file
      .mockResolvedValueOnce('test commit'); // log
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({
      repoType: 'internal',
      defaultBranch: 'master',
      createdAt: new Date().toISOString(),
      branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' },
      tracking: { commits: [] }
    });
    (repoModule.saveConfig as jest.Mock).mockResolvedValue(undefined);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    await updateCommitStatus('abc123def', 'pr-ready');
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('tagCommitMessage creates tag', async () => {
    // commit exists check passes
    (gitModule.git as jest.Mock).mockResolvedValue('');
    
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    await tagCommitMessage('abc123def', 'v1.0.0');
    
    expect(gitModule.git).toHaveBeenCalledWith(['tag', '-a', 'v1.0.0', '-m', 'Tagged: v1.0.0', 'abc123def']);
    consoleSpy.mockRestore();
  });

  it('tagCommitMessage throws for non-existent commit', async () => {
    (gitModule.git as jest.Mock).mockRejectedValue(new Error('not found'));
    
    await expect(tagCommitMessage('invalid', 'v1.0')).rejects.toThrow('not found');
  });
});
