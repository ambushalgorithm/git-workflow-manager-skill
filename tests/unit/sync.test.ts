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
import { syncMaster, abortRebase, continueRebase, isInRebase } from '../../src/lib/sync';

describe('Sync Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('syncMaster', () => {
    it('should sync master from upstream for forks', async () => {
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('develop');
      (gitModule.git as jest.Mock)
        .mockResolvedValueOnce('https://github.com/upstream/repo.git')  // remote get-url upstream
        .mockResolvedValueOnce('')  // checkout master
        .mockResolvedValueOnce('')  // pull upstream master
        .mockResolvedValueOnce('');  // push origin master

      await syncMaster();

      expect(gitModule.git).toHaveBeenCalledWith(['remote', 'get-url', 'upstream']);
      expect(gitModule.git).toHaveBeenCalledWith(['checkout', 'master']);
      expect(gitModule.git).toHaveBeenCalledWith(['pull', 'upstream', 'master']);
      expect(gitModule.git).toHaveBeenCalledWith(['push', 'origin', 'master']);
    });

    it('should error if not a fork', async () => {
      (gitModule.git as jest.Mock).mockRejectedValue(new Error('fatal: not found'));

      await expect(syncMaster()).rejects.toThrow('No upstream remote found');
    });

    it('should stay on master if already on master', async () => {
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('master');
      (gitModule.git as jest.Mock)
        .mockResolvedValueOnce('https://github.com/upstream/repo.git')  // remote get-url upstream
        .mockResolvedValueOnce('')  // pull upstream master
        .mockResolvedValueOnce('');  // push origin master

      await syncMaster();

      // Should NOT checkout since already on master
      const checkoutCalls = (gitModule.git as jest.Mock).mock.calls.filter(call => call[0][0] === 'checkout');
      expect(checkoutCalls).toHaveLength(0);
    });
  });

  describe('abortRebase', () => {
    it('should abort rebase', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('');

      await abortRebase();

      expect(gitModule.git).toHaveBeenCalledWith(['rebase', '--abort']);
    });
  });

  describe('continueRebase', () => {
    it('should continue rebase', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('');

      await continueRebase();

      expect(gitModule.git).toHaveBeenCalledWith(['rebase', '--continue']);
    });
  });

  describe('isInRebase', () => {
    it('should detect rebasing state', async () => {
      jest.spyOn(require('child_process'), 'execSync').mockImplementation(() => 'rebase in progress');

      const result = await isInRebase();

      expect(result).toBe(true);
    });

    it('should return false when not rebasing', async () => {
      jest.spyOn(require('child_process'), 'execSync').mockImplementation(() => '');

      const result = await isInRebase();

      expect(result).toBe(false);
    });
  });
});
