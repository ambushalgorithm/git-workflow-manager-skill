// Test rebase operations
jest.mock('../../src/lib/git', () => ({
  getCurrentBranch: jest.fn(),
  fetchAll: jest.fn(),
  git: jest.fn(),
  getBranches: jest.fn(),
}));

import * as gitModule from '../../src/lib/git';
import { rebaseOnto, interactiveRebase, forcePushWithLease } from '../../src/lib/rebase';

// Helper to create test config
const createConfig = () => ({
  repoType: 'internal' as const,
  defaultBranch: 'master',
  createdAt: new Date().toISOString(),
  branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' }
});

describe('Rebase Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rebaseOnto', () => {
    it('should abort rebase when action is abort', async () => {
      const config = createConfig();

      await rebaseOnto(config, 'abort');

      expect(gitModule.git).toHaveBeenCalledWith(['rebase', '--abort']);
    });

    it('should continue rebase when action is continue', async () => {
      const config = createConfig();

      await rebaseOnto(config, 'continue');

      expect(gitModule.git).toHaveBeenCalledWith(['rebase', '--continue']);
    });

    it('should skip commit when action is skip', async () => {
      const config = createConfig();

      await rebaseOnto(config, 'skip');

      expect(gitModule.git).toHaveBeenCalledWith(['rebase', '--skip']);
    });

    it('should rebase onto target branch', async () => {
      const config = createConfig();
      
      (gitModule.getBranches as jest.Mock).mockResolvedValue([
        { name: 'main', current: false },
        { name: 'develop', current: true },
      ]);
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('feat/test');
      (gitModule.fetchAll as jest.Mock).mockResolvedValue(undefined);
      (gitModule.git as jest.Mock).mockResolvedValue('');

      await rebaseOnto(config, 'rebase', 'develop');

      expect(gitModule.fetchAll).toHaveBeenCalled();
      expect(gitModule.git).toHaveBeenCalledWith(['rebase', 'develop']);
    });

    it('should throw if target branch does not exist', async () => {
      const config = createConfig();
      
      (gitModule.getBranches as jest.Mock).mockResolvedValue([
        { name: 'main', current: false },
      ]);

      await expect(rebaseOnto(config, 'rebase', 'develop')).rejects.toThrow("Target branch 'develop' does not exist");
    });

    it('should throw if no target provided for rebase action', async () => {
      const config = createConfig();

      await expect(rebaseOnto(config, 'rebase')).rejects.toThrow('Target branch required for rebase');
    });
  });

  describe('interactiveRebase', () => {
    it('should call git rebase -i', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('');

      await interactiveRebase('main', 5);

      expect(gitModule.git).toHaveBeenCalledWith(['rebase', '-i', 'main~5', 'main']);
    });
  });

  describe('forcePushWithLease', () => {
    it('should force push with lease', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('');

      await forcePushWithLease('feat/test');

      expect(gitModule.git).toHaveBeenCalledWith(['push', '--force-with-lease', 'origin', 'feat/test']);
    });
  });
});