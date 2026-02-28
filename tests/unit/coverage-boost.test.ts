// Additional tests to hit 95% coverage

jest.mock('../../src/lib/git', () => ({
  getCurrentBranch: jest.fn(),
  fetchAll: jest.fn(),
  git: jest.fn(),
  branchExists: jest.fn(),
  getBranches: jest.fn(),
  pushBranch: jest.fn(),
}));

import * as gitModule from '../../src/lib/git';
import { syncMaster } from '../../src/lib/sync';
import { rebaseOnto } from '../../src/lib/rebase';

// Test syncMaster with different scenarios
describe('Sync Master Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('syncMaster should handle pull errors gracefully', async () => {
    (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('develop');
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('https://github.com/upstream/repo.git')  // upstream exists
      .mockResolvedValueOnce('')  // checkout master
      .mockRejectedValueOnce(new Error('pull failed'));  // pull fails

    await expect(syncMaster()).rejects.toThrow('pull failed');
  });

  it('syncMaster should handle push errors gracefully', async () => {
    (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('develop');
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('https://github.com/upstream/repo.git')  // upstream exists
      .mockResolvedValueOnce('')  // checkout master
      .mockResolvedValueOnce('')  // pull upstream master
      .mockRejectedValueOnce(new Error('push failed'));  // push fails

    await expect(syncMaster()).rejects.toThrow('push failed');
  });
});

// Test rebase conflict handling
describe('Rebase Conflict Handling', () => {
  const createConfig = () => ({
    repoType: 'internal' as const,
    defaultBranch: 'master',
    createdAt: new Date().toISOString(),
    branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rebaseOnto should throw and log conflict message on error', async () => {
    const config = createConfig();
    const error = new Error('conflict');
    
    (gitModule.getBranches as jest.Mock).mockResolvedValue([
      { name: 'staging', current: false },
      { name: 'develop', current: true },
    ]);
    (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('feat/test');
    (gitModule.fetchAll as jest.Mock).mockResolvedValue(undefined);
    (gitModule.git as jest.Mock).mockRejectedValue(error);

    // Should throw the error
    await expect(rebaseOnto(config, 'rebase', 'staging')).rejects.toThrow('conflict');
  });

  it('rebaseOnto should checkout specified branch before rebasing', async () => {
    const config = createConfig();
    
    (gitModule.getBranches as jest.Mock).mockResolvedValue([
      { name: 'staging', current: false },
      { name: 'develop', current: false },
      { name: 'feat/test', current: false },
    ]);
    (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('develop');
    (gitModule.fetchAll as jest.Mock).mockResolvedValue(undefined);
    (gitModule.git as jest.Mock).mockResolvedValue('');

    await rebaseOnto(config, 'rebase', 'staging', 'feat/test');

    // Should checkout feat/test before rebasing
    expect(gitModule.git).toHaveBeenCalledWith(['checkout', 'feat/test']);
    expect(gitModule.git).toHaveBeenCalledWith(['rebase', 'staging']);
  });
});
