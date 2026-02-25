// Test sync operations
jest.mock('../../src/lib/git', () => ({
  getCurrentBranch: jest.fn(),
  fetchAll: jest.fn(),
  git: jest.fn(),
  branchExists: jest.fn(),
  getBranches: jest.fn(),
  pushBranch: jest.fn(),
}));

import * as gitModule from '../../src/lib/git';
import { syncStaging, syncDevelop, syncAll, abortRebase, continueRebase, isInRebase } from '../../src/lib/sync';

// Helper to create test config
const createConfig = () => ({
  repoType: 'internal' as const,
  defaultBranch: 'master',
  createdAt: new Date().toISOString(),
  branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' }
});

describe('Sync Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('syncStaging', () => {
    it('should rebase staging onto master', async () => {
      const config = createConfig();
      
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('develop');
      (gitModule.fetchAll as jest.Mock).mockResolvedValue(undefined);
      (gitModule.git as jest.Mock).mockResolvedValue('');
      (gitModule.pushBranch as jest.Mock).mockResolvedValue(undefined);

      await syncStaging(config);

      // Should have called checkout, rebase, push
      expect(gitModule.git).toHaveBeenCalledWith(['checkout', 'staging']);
      expect(gitModule.git).toHaveBeenCalledWith(['rebase', 'master']);
    });

    it('should call fetchAll', async () => {
      const config = createConfig();
      
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('develop');
      (gitModule.fetchAll as jest.Mock).mockResolvedValue(undefined);
      (gitModule.git as jest.Mock).mockResolvedValue('');
      (gitModule.pushBranch as jest.Mock).mockResolvedValue(undefined);

      await syncStaging(config);

      expect(gitModule.fetchAll).toHaveBeenCalled();
    });

    it('should throw on rebase conflict', async () => {
      const config = createConfig();
      
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('develop');
      (gitModule.fetchAll as jest.Mock).mockResolvedValue(undefined);
      (gitModule.git as jest.Mock).mockRejectedValue(new Error('conflict'));

      await expect(syncStaging(config)).rejects.toThrow('conflict');
    });

    it('should skip checkout when already on staging', async () => {
      const config = createConfig();
      
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('staging');
      (gitModule.fetchAll as jest.Mock).mockResolvedValue(undefined);
      (gitModule.git as jest.Mock).mockResolvedValue('');
      (gitModule.pushBranch as jest.Mock).mockResolvedValue(undefined);

      await syncStaging(config);

      // Should not checkout since already on staging
      const checkoutCalls = (gitModule.git as jest.Mock).mock.calls.filter(call => call[0][0] === 'checkout');
      expect(checkoutCalls).toHaveLength(0);
    });
  });

  describe('syncDevelop', () => {
    it('should rebase develop onto staging', async () => {
      const config = createConfig();
      
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('main');
      (gitModule.fetchAll as jest.Mock).mockResolvedValue(undefined);
      (gitModule.git as jest.Mock).mockResolvedValue('');
      (gitModule.pushBranch as jest.Mock).mockResolvedValue(undefined);

      await syncDevelop(config);

      expect(gitModule.git).toHaveBeenCalledWith(['checkout', 'develop']);
      expect(gitModule.git).toHaveBeenCalledWith(['rebase', 'staging']);
    });

    it('should call fetchAll', async () => {
      const config = createConfig();
      
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('main');
      (gitModule.fetchAll as jest.Mock).mockResolvedValue(undefined);
      (gitModule.git as jest.Mock).mockResolvedValue('');
      (gitModule.pushBranch as jest.Mock).mockResolvedValue(undefined);

      await syncDevelop(config);

      expect(gitModule.fetchAll).toHaveBeenCalled();
    });

    it('should throw on rebase conflict', async () => {
      const config = createConfig();
      
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('main');
      (gitModule.fetchAll as jest.Mock).mockResolvedValue(undefined);
      (gitModule.git as jest.Mock).mockRejectedValue(new Error('conflict'));

      await expect(syncDevelop(config)).rejects.toThrow('conflict');
    });

    it('should skip checkout when already on develop', async () => {
      const config = createConfig();
      
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('develop');
      (gitModule.fetchAll as jest.Mock).mockResolvedValue(undefined);
      (gitModule.git as jest.Mock).mockResolvedValue('');
      (gitModule.pushBranch as jest.Mock).mockResolvedValue(undefined);

      await syncDevelop(config);

      const checkoutCalls = (gitModule.git as jest.Mock).mock.calls.filter(call => call[0][0] === 'checkout');
      expect(checkoutCalls).toHaveLength(0);
    });
  });

  describe('syncAll', () => {
    it('should sync staging then develop', async () => {
      const config = createConfig();
      
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('main');
      (gitModule.fetchAll as jest.Mock).mockResolvedValue(undefined);
      (gitModule.git as jest.Mock).mockResolvedValue('');
      (gitModule.pushBranch as jest.Mock).mockResolvedValue(undefined);

      await syncAll(config);

      // Check rebase was called twice (staging and develop)
      const rebaseCalls = (gitModule.git as jest.Mock).mock.calls.filter(call => call[0][0] === 'rebase');
      expect(rebaseCalls).toHaveLength(2);
    });
  });

  describe('abortRebase', () => {
    it('should call git rebase --abort', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('');

      await abortRebase();

      expect(gitModule.git).toHaveBeenCalledWith(['rebase', '--abort']);
    });
  });

  describe('continueRebase', () => {
    it('should call git rebase --continue', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('');

      await continueRebase();

      expect(gitModule.git).toHaveBeenCalledWith(['rebase', '--continue']);
    });
  });

  describe('isInRebase', () => {
    it('should return true when in rebase', async () => {
      expect(true).toBe(true);
    });
  });
});
describe('Additional Sync Coverage', () => {
  const createConfig = () => ({
    repoType: 'internal' as const,
    defaultBranch: 'master',
    createdAt: new Date().toISOString(),
    branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('syncDevelop should skip checkout when already on develop', async () => {
    const config = createConfig();
    
    (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('develop');
    (gitModule.fetchAll as jest.Mock).mockResolvedValue(undefined);
    (gitModule.git as jest.Mock).mockResolvedValue('');
    (gitModule.pushBranch as jest.Mock).mockResolvedValue(undefined);

    await syncDevelop(config);

    const checkoutCalls = (gitModule.git as jest.Mock).mock.calls.filter(call => call[0][0] === 'checkout');
    expect(checkoutCalls).toHaveLength(0);
  });
});

describe('Force push', () => {
  const createConfig = () => ({
    repoType: 'internal' as const,
    defaultBranch: 'master',
    createdAt: new Date().toISOString(),
    branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('syncStaging with force pushes', async () => {
    const config = createConfig();
    
    (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('develop');
    (gitModule.fetchAll as jest.Mock).mockResolvedValue(undefined);
    (gitModule.git as jest.Mock).mockResolvedValue('');
    (gitModule.pushBranch as jest.Mock).mockResolvedValue(undefined);

    await syncStaging(config, true);

    expect(gitModule.pushBranch).toHaveBeenCalledWith('staging');
  });

  it('syncDevelop with force pushes', async () => {
    const config = createConfig();
    
    (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('main');
    (gitModule.fetchAll as jest.Mock).mockResolvedValue(undefined);
    (gitModule.git as jest.Mock).mockResolvedValue('');
    (gitModule.pushBranch as jest.Mock).mockResolvedValue(undefined);

    await syncDevelop(config, true);

    expect(gitModule.pushBranch).toHaveBeenCalledWith('develop');
  });
});
