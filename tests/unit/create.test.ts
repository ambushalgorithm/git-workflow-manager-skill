// Test branch creation operations
jest.mock('../../src/lib/git', () => ({
  branchExists: jest.fn(),
  git: jest.fn(),
}));

import * as gitModule from '../../src/lib/git';
import { createFeatureBranch, createHotfixBranch, createReleaseBranch, deleteBranch, mergeBranch } from '../../src/lib/create';

// Helper to create test config
const createConfig = () => ({
  repoType: 'internal' as const,
  defaultBranch: 'master',
  createdAt: new Date().toISOString(),
  branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' }
});

describe('Branch Creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createFeatureBranch', () => {
    it('should create feature branch from develop', async () => {
      const config = createConfig();
      
      // Parent exists (true), new branch doesn't exist (false)
      (gitModule.branchExists as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      (gitModule.git as jest.Mock).mockResolvedValue('');

      await createFeatureBranch(config, 'feat/new-feature', 'develop');

      expect(gitModule.git).toHaveBeenCalledWith(['checkout', '-b', 'feat/new-feature', 'develop']);
    });

    it('should throw if parent branch does not exist', async () => {
      const config = createConfig();
      
      // Parent branch doesn't exist
      (gitModule.branchExists as jest.Mock).mockResolvedValue(false);

      await expect(createFeatureBranch(config, 'feat/test', 'develop')).rejects.toThrow("Parent branch 'develop' does not exist");
    });

    it('should throw if branch already exists', async () => {
      const config = createConfig();
      
      // Parent exists, new branch already exists
      (gitModule.branchExists as jest.Mock).mockResolvedValue(true);

      await expect(createFeatureBranch(config, 'feat/existing', 'develop')).rejects.toThrow("Branch 'feat/existing' already exists");
    });
  });

  describe('createHotfixBranch', () => {
    it('should create hotfix branch from staging', async () => {
      const config = createConfig();
      
      // staging exists, new branch doesn't
      (gitModule.branchExists as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      (gitModule.git as jest.Mock).mockResolvedValue('');

      await createHotfixBranch(config, 'hotfix/fix-bug');

      expect(gitModule.git).toHaveBeenCalledWith(['checkout', '-b', 'hotfix/fix-bug', 'staging']);
    });
  });

  describe('createReleaseBranch', () => {
    it('should create release branch from develop', async () => {
      const config = createConfig();
      
      // develop exists, new branch doesn't
      (gitModule.branchExists as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      (gitModule.git as jest.Mock).mockResolvedValue('');

      await createReleaseBranch(config, 'release/1.0.0');

      expect(gitModule.git).toHaveBeenCalledWith(['checkout', '-b', 'release/1.0.0', 'develop']);
    });
  });

  describe('deleteBranch', () => {
    it('should delete branch with -d flag', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('');

      await deleteBranch('feat/old-feature');

      expect(gitModule.git).toHaveBeenCalledWith(['branch', '-d', 'feat/old-feature']);
    });

    it('should delete branch with -D flag when force is true', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('');

      await deleteBranch('feat/old-feature', true);

      expect(gitModule.git).toHaveBeenCalledWith(['branch', '-D', 'feat/old-feature']);
    });
  });

  describe('mergeBranch', () => {
    it('should checkout target and merge source', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('');

      await mergeBranch('feat/new-feature', 'develop');

      expect(gitModule.git).toHaveBeenCalledWith(['checkout', 'develop']);
      expect(gitModule.git).toHaveBeenCalledWith(['merge', 'feat/new-feature']);
    });
  });
});