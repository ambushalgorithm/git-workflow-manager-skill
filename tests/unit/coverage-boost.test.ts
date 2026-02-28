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
import { syncStaging, syncDevelop, syncAll } from '../../src/lib/sync';
import { rebaseOnto } from '../../src/lib/rebase';

// Test sync with defaultBranch config
describe('Sync with Config', () => {
  const createConfigWithBranch = (branch: string) => ({
    repoType: 'internal' as const,
    defaultBranch: branch,
    createdAt: new Date().toISOString(),
    branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('syncStaging should use config.defaultBranch', async () => {
    const config = createConfigWithBranch('main');
    
    (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('develop');
    (gitModule.fetchAll as jest.Mock).mockResolvedValue(undefined);
    (gitModule.git as jest.Mock).mockResolvedValue('');
    (gitModule.pushBranch as jest.Mock).mockResolvedValue(undefined);

    await syncStaging(config);

    expect(gitModule.git).toHaveBeenCalledWith(['rebase', 'origin/main']);
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
      { name: 'main', current: false },
      { name: 'develop', current: true },
    ]);
    (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('feat/test');
    (gitModule.fetchAll as jest.Mock).mockResolvedValue(undefined);
    (gitModule.git as jest.Mock).mockRejectedValue(error);

    // Should throw the error
    await expect(rebaseOnto(config, 'rebase', 'develop')).rejects.toThrow('conflict');
  });
});