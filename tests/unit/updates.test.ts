// Test branch update functions
jest.mock('../../src/lib/git', () => ({
  git: jest.fn(),
  branchExists: jest.fn(),
  getCurrentBranch: jest.fn(),
}));

jest.mock('../../src/lib/repo', () => ({
  loadConfig: jest.fn(),
  saveConfig: jest.fn(),
}));

import * as gitModule from '../../src/lib/git';
import * as repoModule from '../../src/lib/repo';
import { 
  getMergeStrategy, 
  setMergeStrategy, 
  rebaseBranch, 
  mergeBranchInto, 
  hasConflicts, 
  abortOperation, 
  getBranchUpdateType, 
  smartUpdate,
  fastForward,
  getChildBranches,
  updateChildBranches
} from '../../src/lib/updates';

describe('Branch Updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMergeStrategy', () => {
    it('returns default when no mergeStrategy config', () => {
      const config = { repoType: 'internal', defaultBranch: 'main', createdAt: '', branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' } };
      const strategy = getMergeStrategy(config as any);
      expect(strategy).toBe('merge');
    });

    it('returns configured default', () => {
      const config = { repoType: 'internal', defaultBranch: 'main', createdAt: '', branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' }, mergeStrategy: { default: 'rebase' } };
      const strategy = getMergeStrategy(config as any);
      expect(strategy).toBe('rebase');
    });

    it('returns branch-specific strategy', () => {
      const config = { repoType: 'internal', defaultBranch: 'main', createdAt: '', branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' }, mergeStrategy: { default: 'merge', perBranch: { 'feat/test': 'rebase' } } };
      const strategy = getMergeStrategy(config as any, 'feat/test');
      expect(strategy).toBe('rebase');
    });

    it('falls back to default when branch not found', () => {
      const config = { repoType: 'internal', defaultBranch: 'main', createdAt: '', branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' }, mergeStrategy: { default: 'merge', perBranch: { 'other': 'rebase' } } };
      const strategy = getMergeStrategy(config as any, 'feat/test');
      expect(strategy).toBe('merge');
    });
  });

  describe('setMergeStrategy', () => {
    it('sets default strategy', async () => {
      (repoModule.loadConfig as jest.Mock).mockResolvedValue({
        repoType: 'internal', defaultBranch: 'main', createdAt: '', branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' }
      });
      (repoModule.saveConfig as jest.Mock).mockResolvedValue(undefined);
      
      await setMergeStrategy('rebase');
      
      expect(repoModule.saveConfig).toHaveBeenCalled();
    });

    it('sets branch-specific strategy', async () => {
      (repoModule.loadConfig as jest.Mock).mockResolvedValue({
        repoType: 'internal', defaultBranch: 'main', createdAt: '', branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' }, mergeStrategy: { default: 'merge' }
      });
      (repoModule.saveConfig as jest.Mock).mockResolvedValue(undefined);
      
      await setMergeStrategy('rebase', 'feat/test');
      
      const saved = (repoModule.saveConfig as jest.Mock).mock.calls[0][0];
      expect(saved.mergeStrategy.perBranch?.['feat/test']).toBe('rebase');
    });
  });

  describe('rebaseBranch', () => {
    it('rebases branch onto target', async () => {
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('develop');
      (gitModule.git as jest.Mock).mockResolvedValue('');
      
      await rebaseBranch('feat/test', 'develop');
      
      expect(gitModule.git).toHaveBeenCalledWith(['rebase', 'develop']);
    });

    it('throws on conflict', async () => {
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('develop');
      (gitModule.git as jest.Mock).mockRejectedValue(new Error('CONFLICT'));
      
      await expect(rebaseBranch('feat/test', 'develop')).rejects.toThrow('CONFLICT');
    });
  });

  describe('mergeBranchInto', () => {
    it('merges branch into target', async () => {
      // Already on develop, so no checkout needed
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('develop');
      (gitModule.git as jest.Mock).mockResolvedValue('');
      
      await mergeBranchInto('feat/test', 'develop');
      
      // Should call merge directly (no checkout needed since already on develop)
      expect(gitModule.git).toHaveBeenCalledWith(['merge', 'feat/test']);
    });

    it('checks out target when not on it', async () => {
      // Not on develop, need to checkout first
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('feat/test');
      (gitModule.git as jest.Mock).mockResolvedValue('');
      
      await mergeBranchInto('feat/test', 'develop');
      
      expect(gitModule.git).toHaveBeenCalledWith(['checkout', 'develop']);
      expect(gitModule.git).toHaveBeenCalledWith(['merge', 'feat/test']);
    });
  });

  describe('hasConflicts', () => {
    it('returns true when UU in status', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('UU file.txt');
      const result = await hasConflicts();
      expect(result).toBe(true);
    });

    it('returns false when no conflicts', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue(' M file.txt');
      const result = await hasConflicts();
      expect(result).toBe(false);
    });
  });

  describe('getBranchUpdateType', () => {
    it('detects ahead', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('5  0');
      
      const result = await getBranchUpdateType('feat/test');
      expect(result.type).toBe('ahead');
      expect(result.ahead).toBe(5);
    });

    it('detects behind', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('0  3');
      
      const result = await getBranchUpdateType('feat/test');
      expect(result.type).toBe('behind');
      expect(result.behind).toBe(3);
    });

    it('detects diverged', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('3  5');
      
      const result = await getBranchUpdateType('feat/test');
      expect(result.type).toBe('diverged');
    });

    it('handles error gracefully', async () => {
      (gitModule.git as jest.Mock).mockRejectedValue(new Error('no upstream'));
      
      const result = await getBranchUpdateType('feat/test');
      expect(result.type).toBe('up-to-date');
    });
  });

  describe('smartUpdate', () => {
    it('logs when up to date', async () => {
      (repoModule.loadConfig as jest.Mock).mockResolvedValue({
        repoType: 'internal', defaultBranch: 'main', createdAt: '', branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' }, mergeStrategy: { default: 'merge' }
      });
      (gitModule.git as jest.Mock).mockResolvedValue('0  0'); // up-to-date
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      await smartUpdate('feat/test', 'main');
      
      expect(gitModule.git).not.toHaveBeenCalledWith(expect.arrayContaining(['rebase']));
      consoleSpy.mockRestore();
    });

    it('rebases when strategy is rebase', async () => {
      (repoModule.loadConfig as jest.Mock).mockResolvedValue({
        repoType: 'internal', defaultBranch: 'main', createdAt: '', branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' }, mergeStrategy: { default: 'rebase' }
      });
      (gitModule.git as jest.Mock)
        .mockResolvedValueOnce('0  5') // behind
        .mockResolvedValueOnce(''); // rebase
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      await smartUpdate('feat/test', 'main');
      
      expect(gitModule.git).toHaveBeenCalledWith(['rebase', 'main']);
      consoleSpy.mockRestore();
    });
  });

  describe('fastForward', () => {
    it('fast-forwards branch', async () => {
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('develop');
      (gitModule.git as jest.Mock).mockResolvedValue('');
      (gitModule.git as jest.Mock).mockResolvedValue('');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      await fastForward('feat/test', 'main');
      
      expect(gitModule.git).toHaveBeenCalledWith(['merge', '--ff-only', 'main']);
      consoleSpy.mockRestore();
    });

    it('throws when cannot fast-forward', async () => {
      (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('develop');
      (gitModule.git as jest.Mock).mockRejectedValue(new Error('not fast-forward'));
      
      await expect(fastForward('feat/test', 'main')).rejects.toThrow('Cannot fast-forward');
    });
  });

  describe('getChildBranches', () => {
    it('returns empty when no branches', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('');
      
      const children = await getChildBranches('main');
      expect(children).toEqual([]);
    });

    it('filters main branch out', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('main\ndevelop\nfeat/test');
      
      const children = await getChildBranches('main');
      expect(children).not.toContain('main');
    });
  });

  describe('updateChildBranches', () => {
    it('logs when no children', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('');
      (repoModule.loadConfig as jest.Mock).mockResolvedValue({ repoType: 'internal', defaultBranch: 'main', createdAt: '', branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' }, mergeStrategy: { default: 'merge' } });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      await updateChildBranches('main');
      
      expect(consoleSpy).toHaveBeenCalledWith('No child branches to update');
      consoleSpy.mockRestore();
    });
  });
});
describe('Additional Updates Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('setMergeStrategy throws when no config', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue(null);
    
    await expect(setMergeStrategy('rebase')).rejects.toThrow('No workflow config');
  });

  it('setMergeStrategy initializes mergeStrategy when not exists', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({
      repoType: 'internal', defaultBranch: 'main', createdAt: '', branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' }
    });
    (repoModule.saveConfig as jest.Mock).mockResolvedValue(undefined);
    
    await setMergeStrategy('rebase');
    
    const saved = (repoModule.saveConfig as jest.Mock).mock.calls[0][0];
    expect(saved.mergeStrategy.default).toBe('rebase');
  });

  it('hasConflicts returns true for AA', async () => {
    (gitModule.git as jest.Mock).mockResolvedValue('AA file.txt');
    const result = await hasConflicts();
    expect(result).toBe(true);
  });

  it('hasConflicts returns true for DD', async () => {
    (gitModule.git as jest.Mock).mockResolvedValue('DD file.txt');
    const result = await hasConflicts();
    expect(result).toBe(true);
  });

  it('hasConflicts handles error', async () => {
    (gitModule.git as jest.Mock).mockRejectedValue(new Error('no git'));
    const result = await hasConflicts();
    expect(result).toBe(false);
  });

  it('abortOperation handles merge abort', async () => {
    (gitModule.git as jest.Mock).mockResolvedValue('');
    
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    await abortOperation();
    
    expect(gitModule.git).toHaveBeenCalledWith(['merge', '--abort']);
    consoleSpy.mockRestore();
  });

  it('abortOperation handles no operation', async () => {
    (gitModule.git as jest.Mock)
      .mockRejectedValueOnce(new Error('no merge'))
      .mockRejectedValueOnce(new Error('no rebase'));
    
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    await abortOperation();
    
    consoleSpy.mockRestore();
  });

  it('getChildBranches handles errors gracefully', async () => {
    (gitModule.git as jest.Mock).mockRejectedValue(new Error('git error'));
    
    const children = await getChildBranches('main');
    expect(children).toEqual([]);
  });

  it('getChildBranches finds child branches', async () => {
    // Returns a feature branch
    (gitModule.git as jest.Mock).mockResolvedValueOnce('main\nfeat/test');
    // merge-base succeeds
    (gitModule.git as jest.Mock).mockResolvedValueOnce('abc123');
    // rev-parse succeeds  
    (gitModule.git as jest.Mock).mockResolvedValueOnce('abc123');
    
    const children = await getChildBranches('main');
    expect(children).toContain('feat/test');
  });

  it('updateChildBranches updates children with rebase', async () => {
    // Returns feature branch
    (gitModule.git as jest.Mock).mockResolvedValueOnce('feat/test');
    // merge-base and rev-parse succeed
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('abc123')
      .mockResolvedValueOnce('abc123');
    // load config with rebase strategy
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({
      repoType: 'internal', defaultBranch: 'main', createdAt: '', branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' }, mergeStrategy: { default: 'rebase' }
    });
    
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // rebase succeeds but git merge fails in the loop
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('') // getCurrentBranch
      .mockResolvedValueOnce('') // rebase
      .mockRejectedValueOnce(new Error('rebase failed'));
    
    await updateChildBranches('main');
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
