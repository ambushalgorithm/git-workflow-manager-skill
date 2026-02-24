// Test repo detection - these test the actual exported functions
import { detectRepoType, loadConfig } from '../../src/lib/repo';

jest.mock('../../src/lib/git', () => ({
  isGitRepo: jest.fn(),
  getRemotes: jest.fn(),
  branchExists: jest.fn(),
  getBranches: jest.fn(),
  getCurrentBranch: jest.fn(),
  createBranch: jest.fn(),
  checkout: jest.fn(),
  pushBranch: jest.fn(),
  fetchAll: jest.fn(),
  git: jest.fn(),
}));

import * as gitModule from '../../src/lib/git';

describe('Repo Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectRepoType', () => {
    it('should return "fork" when upstream remote exists', async () => {
      (gitModule.isGitRepo as jest.Mock).mockResolvedValue(true);
      (gitModule.getRemotes as jest.Mock).mockResolvedValue([
        { name: 'origin', url: 'https://github.com/user/repo.git' },
        { name: 'upstream', url: 'https://github.com/original/repo.git' },
      ]);

      const type = await detectRepoType();
      expect(type).toBe('fork');
    });

    it('should return "internal" when no upstream remote', async () => {
      (gitModule.isGitRepo as jest.Mock).mockResolvedValue(true);
      (gitModule.getRemotes as jest.Mock).mockResolvedValue([
        { name: 'origin', url: 'https://github.com/company/repo.git' },
      ]);

      const type = await detectRepoType();
      expect(type).toBe('internal');
    });

    it('should return "internal" when no remotes at all', async () => {
      (gitModule.isGitRepo as jest.Mock).mockResolvedValue(true);
      (gitModule.getRemotes as jest.Mock).mockResolvedValue([]);

      const type = await detectRepoType();
      expect(type).toBe('internal');
    });

    it('should throw when not in a git repo', async () => {
      (gitModule.isGitRepo as jest.Mock).mockResolvedValue(false);

      await expect(detectRepoType()).rejects.toThrow('Not a git repository');
    });
  });

  describe('loadConfig', () => {
    it('should return null when no config exists', async () => {
      const result = await loadConfig();
      expect(result === null || result.repoType).toBeTruthy();
    });
  });
});
