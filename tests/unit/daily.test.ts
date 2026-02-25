// Test daily automation functions
jest.mock('../../src/lib/git', () => ({
  git: jest.fn(),
}));

jest.mock('../../src/lib/repo', () => ({
  loadConfig: jest.fn(),
  saveConfig: jest.fn(),
}));

import * as gitModule from '../../src/lib/git';
import * as repoModule from '../../src/lib/repo';
import { 
  detectGitCLI, 
  listOpenPRs, 
  getPRDetails, 
  checkPRMerged, 
  detectNewUpstreamCommits, 
  checkUpstreamStatus,
  getBranchStatus,
  reportBlockers,
  showBranchesNeedingAttention,
  generateDailyReport,
  runDailyCheck,
  formatDailyReport
} from '../../src/lib/daily';

describe('Daily Automation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectGitCLI', () => {
    it('should return true when gh is available', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('gh version 2.40.0');
      const result = await detectGitCLI();
      expect(result).toBe(true);
    });

    it('should return false when gh is not available', async () => {
      (gitModule.git as jest.Mock).mockRejectedValue(new Error('command not found'));
      const result = await detectGitCLI();
      expect(result).toBe(false);
    });
  });

  describe('listOpenPRs', () => {
    it('should throw when gh not available', async () => {
      (gitModule.git as jest.Mock).mockRejectedValue(new Error('command not found'));
      await expect(listOpenPRs()).rejects.toThrow('GitHub CLI');
    });

    it('should return empty array when not in github repo', async () => {
      (gitModule.git as jest.Mock)
        .mockResolvedValueOnce('gh version 2.40.0')
        .mockRejectedValueOnce(new Error('could not resolve'));
      
      const prs = await listOpenPRs();
      expect(prs).toEqual([]);
    });

    it('should parse PR list correctly', async () => {
      (gitModule.git as jest.Mock)
        .mockResolvedValueOnce('gh version 2.40.0')
        .mockResolvedValueOnce(JSON.stringify([
          { number: 1, title: 'Test PR', state: 'OPEN', headRefName: 'feat/test', baseRefName: 'main', url: 'https://github.com/test/repo/pull/1', mergeable: true, statusCheckRollup: [] }
        ]));
      
      const prs = await listOpenPRs();
      expect(prs).toHaveLength(1);
      expect(prs[0].number).toBe(1);
      expect(prs[0].title).toBe('Test PR');
      expect(prs[0].state).toBe('open');
    });
  });

  describe('getPRDetails', () => {
    it('should return null when gh not available', async () => {
      (gitModule.git as jest.Mock).mockRejectedValue(new Error('command not found'));
      const details = await getPRDetails(1);
      expect(details).toBeNull();
    });

    it('should return PR details', async () => {
      (gitModule.git as jest.Mock)
        .mockResolvedValueOnce('gh version 2.40.0')
        .mockResolvedValueOnce(JSON.stringify({
          number: 1, title: 'Test PR', state: 'OPEN', headRefName: 'feat/test', baseRefName: 'main', url: 'https://github.com/test/repo/pull/1', mergeable: true, author: { login: 'testuser' }, createdAt: '2024-01-01', updatedAt: '2024-01-02', reviewers: [], labels: [], isDraft: false
        }));
      
      const details = await getPRDetails(1);
      expect(details).not.toBeNull();
      expect(details?.number).toBe(1);
      expect(details?.author).toBe('testuser');
    });
  });

  describe('checkPRMerged', () => {
    it('should return false when gh not available', async () => {
      (gitModule.git as jest.Mock).mockRejectedValue(new Error('command not found'));
      const merged = await checkPRMerged(1);
      expect(merged).toBe(false);
    });

    it('should return true when PR is merged', async () => {
      (gitModule.git as jest.Mock)
        .mockResolvedValueOnce('gh version 2.40.0')
        .mockResolvedValueOnce(JSON.stringify({ state: 'MERGED' }));
      
      const merged = await checkPRMerged(1);
      expect(merged).toBe(true);
    });
  });

  describe('detectNewUpstreamCommits', () => {
    it('should return 0 when no upstream', async () => {
      (repoModule.loadConfig as jest.Mock).mockResolvedValue(null);
      const count = await detectNewUpstreamCommits();
      expect(count).toBe(0);
    });

    it('should return diff count', async () => {
      (repoModule.loadConfig as jest.Mock).mockResolvedValue({
        defaultBranch: 'main',
        upstreamRemote: 'upstream'
      });
      (gitModule.git as jest.Mock)
        .mockResolvedValueOnce('100')
        .mockResolvedValueOnce('105');
      
      const count = await detectNewUpstreamCommits();
      expect(count).toBe(5);
    });
  });

  describe('checkUpstreamStatus', () => {
    it('should return empty status when no config', async () => {
      (repoModule.loadConfig as jest.Mock).mockResolvedValue(null);
      const status = await checkUpstreamStatus();
      expect(status.newCommits).toBe(0);
      expect(status.mergedPRs).toHaveLength(0);
    });

    it('should check upstream when configured', async () => {
      (repoModule.loadConfig as jest.Mock).mockResolvedValue({
        defaultBranch: 'main',
        upstreamRemote: 'upstream',
        repoType: 'fork'
      });
      (gitModule.git as jest.Mock)
        .mockResolvedValueOnce('100')
        .mockResolvedValueOnce('101')
        .mockResolvedValueOnce('gh version 2.40.0')
        .mockResolvedValueOnce(JSON.stringify([]));
      
      const status = await checkUpstreamStatus();
      expect(status.newCommits).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getBranchStatus', () => {
    it('should return branches', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('feat/test 2024-01-01 origin/feat/test');
      
      const branches = await getBranchStatus();
      expect(Array.isArray(branches)).toBe(true);
    });
  });

  describe('reportBlockers', () => {
    it('should return blockers', async () => {
      (gitModule.git as jest.Mock).mockResolvedValue('main');
      (repoModule.loadConfig as jest.Mock).mockResolvedValue({});
      
      const blockers = await reportBlockers();
      expect(blockers).toHaveProperty('conflicts');
      expect(blockers).toHaveProperty('staleBranches');
      expect(blockers).toHaveProperty('failedChecks');
    });
  });

  describe('showBranchesNeedingAttention', () => {
    it('should return empty when no branches behind', async () => {
      jest.spyOn(require('../../src/lib/daily'), 'getBranchStatus').mockResolvedValue([]);
      
      const attention = await showBranchesNeedingAttention();
      expect(attention).toHaveLength(0);
    });
  });

  describe('generateDailyReport', () => {
    it('should generate report', async () => {
      (gitModule.git as jest.Mock)
        .mockResolvedValueOnce('origin')
        .mockResolvedValueOnce('test-repo');
      (repoModule.loadConfig as jest.Mock).mockResolvedValue({ repoType: 'internal' });
      (gitModule.git as jest.Mock).mockResolvedValue('feat/test 2024-01-01');
      
      const report = await generateDailyReport();
      expect(report).toHaveProperty('repo');
      expect(report).toHaveProperty('date');
      expect(report).toHaveProperty('branchStatus');
      expect(report).toHaveProperty('prStatus');
      expect(report).toHaveProperty('blockers');
      expect(report).toHaveProperty('attention');
    });
  });

  describe('runDailyCheck', () => {
    it('should run daily check', async () => {
      (gitModule.git as jest.Mock)
        .mockResolvedValueOnce('origin')
        .mockResolvedValueOnce('test-repo');
      (repoModule.loadConfig as jest.Mock).mockResolvedValue({ repoType: 'internal' });
      (gitModule.git as jest.Mock).mockResolvedValue('feat/test 2024-01-01');
      
      const report = await runDailyCheck();
      expect(report).toBeDefined();
    });
  });

  describe('formatDailyReport', () => {
    it('should format report', () => {
      const report = {
        repo: 'test-repo',
        type: 'fork' as const,
        date: '2024-01-01',
        branchStatus: [],
        prStatus: [],
        blockers: { conflicts: [], failedChecks: [], staleBranches: [] },
        attention: [{ branch: 'feat/test', reason: 'behind', action: 'rebase' }],
      };
      
      const formatted = formatDailyReport(report);
      expect(formatted).toContain('Daily Report');
      expect(formatted).toContain('test-repo');
    });

    it('should show PRs in report', () => {
      const report = {
        repo: 'test-repo',
        type: 'internal' as const,
        date: '2024-01-01',
        branchStatus: [],
        prStatus: [{ number: 1, title: 'Test PR', state: 'open' as const, headBranch: 'feat/test', baseBranch: 'main', url: 'http://test', mergeable: true, checksPassing: true }],
        blockers: { conflicts: [], failedChecks: [], staleBranches: [] },
        attention: [],
      };
      
      const formatted = formatDailyReport(report);
      expect(formatted).toContain('Test PR');
    });
  });
});
describe('Stale Branches Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get remote URL for repo', async () => {
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('remote.origin.url')
      .mockResolvedValueOnce('test-repo');
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({ repoType: 'internal' });
    (gitModule.git as jest.Mock).mockResolvedValue('feat/test 2024-01-01');
    
    const report = await generateDailyReport();
    expect(report.repo).toBe('test-repo');
  });

  it('should handle branches without upstream', async () => {
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('origin')
      .mockResolvedValueOnce('test-repo');
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({ repoType: 'internal' });
    // getBranchStatus - for-each-ref
    (gitModule.git as jest.Mock).mockResolvedValue('');
    
    const report = await generateDailyReport();
    expect(report.branchStatus).toEqual([]);
  });

  it('should format report with no PRs', () => {
    const report = {
      repo: 'test',
      type: 'internal' as const,
      date: '2024-01-01',
      branchStatus: [],
      prStatus: [],
      blockers: { conflicts: [], failedChecks: [], staleBranches: [] },
      attention: [],
    };
    
    const formatted = formatDailyReport(report);
    expect(formatted).toContain('No open PRs');
  });

  it('should format report with stale branches', () => {
    const report = {
      repo: 'test',
      type: 'internal' as const,
      date: '2024-01-01',
      branchStatus: [],
      prStatus: [],
      blockers: { conflicts: [], failedChecks: [], staleBranches: ['feat/old', 'feat/older'] },
      attention: [],
    };
    
    const formatted = formatDailyReport(report);
    expect(formatted).toContain('Stale branches');
  });

  it('should format report with blocked PRs', () => {
    const report = {
      repo: 'test',
      type: 'internal' as const,
      date: '2024-01-01',
      branchStatus: [],
      prStatus: [],
      blockers: { conflicts: [], failedChecks: ['PR #1: Test'], staleBranches: [] },
      attention: [],
    };
    
    const formatted = formatDailyReport(report);
    expect(formatted).toContain('Failed checks');
  });

  it('should handle checkUpstreamStatus with upstream but no gh', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({
      defaultBranch: 'main',
      upstreamRemote: 'upstream'
    });
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('100')
      .mockResolvedValueOnce('105');
    
    // gh not available
    (gitModule.git as jest.Mock).mockRejectedValue(new Error('no gh'));
    
    const status = await checkUpstreamStatus();
    expect(status.newCommits).toBe(5);
  });
});
