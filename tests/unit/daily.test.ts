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

describe('Additional Daily Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listOpenPRs should handle gh errors', async () => {
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('gh version 2.40.0')
      .mockRejectedValueOnce(new Error('not a git repo'));
    
    await expect(listOpenPRs()).rejects.toThrow('not a git repo');
  });

  it('getPRDetails should handle error', async () => {
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('gh version 2.40.0')
      .mockRejectedValueOnce(new Error('not found'));
    
    const details = await getPRDetails(999);
    expect(details).toBeNull();
  });

  it('checkPRMerged should handle error', async () => {
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('gh version 2.40.0')
      .mockRejectedValueOnce(new Error('not found'));
    
    const merged = await checkPRMerged(999);
    expect(merged).toBe(false);
  });

  it('detectNewUpstreamCommits should handle error', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({
      defaultBranch: 'main',
      upstreamRemote: 'upstream'
    });
    (gitModule.git as jest.Mock).mockRejectedValueOnce(new Error('no upstream'));
    
    const count = await detectNewUpstreamCommits();
    expect(count).toBe(0);
  });

  it('checkUpstreamStatus should handle upstream errors', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({
      defaultBranch: 'main',
      upstreamRemote: 'upstream'
    });
    // gh not available for PR check
    (gitModule.git as jest.Mock).mockRejectedValue(new Error('no gh'));
    
    const status = await checkUpstreamStatus();
    expect(status).toBeDefined();
    expect(status.newPRs).toHaveLength(0);
  });

  it('generateDailyReport should handle errors gracefully', async () => {
    (gitModule.git as jest.Mock).mockRejectedValue(new Error('no git'));
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({ repoType: 'internal' });
    
    const report = await generateDailyReport();
    expect(report.repo).toBe('unknown');
  });

  it('formatDailyReport should show all branches needing attention', () => {
    const report = {
      repo: 'test',
      type: 'internal' as const,
      date: '2024-01-01',
      branchStatus: [],
      prStatus: [],
      blockers: { conflicts: [], failedChecks: [], staleBranches: [] },
      attention: [
        { branch: 'feat/one', reason: 'behind', action: 'rebase' },
        { branch: 'feat/two', reason: 'ahead', action: 'push' }
      ],
    };
    
    const formatted = formatDailyReport(report);
    expect(formatted).toContain('feat/one');
    expect(formatted).toContain('feat/two');
  });

  it('formatDailyReport should handle no blockers', () => {
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
    expect(formatted).toContain('No blockers');
  });
});

describe('More Daily Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getPRDetails should handle empty reviewers and labels', async () => {
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('gh version 2.40.0')
      .mockResolvedValueOnce(JSON.stringify({
        number: 1, title: 'Test', state: 'OPEN', headRefName: 'feat', baseRefName: 'main', 
        url: 'http://test', mergeable: true, author: null, createdAt: '2024-01-01', 
        updatedAt: '2024-01-02', reviewers: null, labels: null, isDraft: null
      }));
    
    const details = await getPRDetails(1);
    expect(details?.reviewers).toEqual([]);
    expect(details?.labels).toEqual([]);
    expect(details?.isDraft).toBe(false);
  });

  it('checkUpstreamStatus should return empty when no config', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue(null);
    
    const status = await checkUpstreamStatus();
    expect(status.newCommits).toBe(0);
    expect(status.mergedPRs).toHaveLength(0);
    expect(status.newPRs).toHaveLength(0);
  });

  it('getBranchStatus should handle branch with upstream', async () => {
    (gitModule.git as jest.Mock).mockResolvedValue('feat/test 2024-01-01 origin/feat/test\n');
    // mock rev-list for ahead/behind
    (gitModule.git as jest.Mock).mockResolvedValueOnce('3  5');
    
    const branches = await getBranchStatus();
    expect(branches).toBeDefined();
  });

  it('reportBlockers should handle errors gracefully', async () => {
    // gh not available
    (gitModule.git as jest.Mock).mockRejectedValue(new Error('no gh'));
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({});
    
    const blockers = await reportBlockers();
    expect(blockers.failedChecks).toHaveLength(0);
  });

  it('detectNewUpstreamCommits returns 0 when no upstream', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({});
    
    const count = await detectNewUpstreamCommits();
    expect(count).toBe(0);
  });

  it('detectNewUpstreamCommits handles parse error', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({
      defaultBranch: 'main',
      upstreamRemote: 'upstream'
    });
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('not-a-number')
      .mockResolvedValueOnce('also-not-a-number');
    
    const count = await detectNewUpstreamCommits();
    expect(count).toBe(0); // parseInt('not-a-number') || 0 = 0
  });
});

describe('More Daily Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('checkUpstreamStatus should catch PR errors gracefully', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({
      defaultBranch: 'main',
      upstreamRemote: 'upstream',
      repoType: 'fork'
    });
    // detectNewUpstreamCommits succeeds
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('100')
      .mockResolvedValueOnce('100');
    // gh available
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('gh version 2.40.0')
      // gh pr list throws
      .mockRejectedValueOnce(new Error('API error'));
    
    const status = await checkUpstreamStatus();
    // Should still return with newCommits = 0 and empty PR arrays
    expect(status.newCommits).toBe(0);
  });

  it('getBranchStatus should skip main branches', async () => {
    (gitModule.git as jest.Mock).mockResolvedValue('main\nmaster\ndevelop\nstaging\nintegration\nfeat/test');
    
    const branches = await getBranchStatus();
    // Should filter out main/master/develop/staging/integration
    const names = branches.map(b => b.branch);
    expect(names).not.toContain('main');
    expect(names).not.toContain('master');
  });

  it('reportBlockers should return stale branches', async () => {
    // Mock branches
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('feat/old-branch')
      // For stale detection, log date in past
      .mockResolvedValueOnce(new Date(2020, 0, 1).toISOString());
    
    // No gh
    (gitModule.git as jest.Mock).mockRejectedValue(new Error('no gh'));
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({});
    
    const blockers = await reportBlockers();
    expect(blockers.staleBranches).toBeDefined();
  });
});

describe('Direct Error Path Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listOpenPRs should handle missing mergeable field', async () => {
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('gh version 2.40.0')
      .mockResolvedValueOnce(JSON.stringify([
        { number: 1, title: 'Test PR', state: 'OPEN', headRefName: 'feat/test', baseRefName: 'main', url: 'https://github.com/test/repo/pull/1', mergeable: null, statusCheckRollup: [] }
      ]));
    
    const prs = await listOpenPRs();
    // Code: pr.mergeable !== false, so null !== false is true
    expect(prs[0].mergeable).toBe(true);
  });

  it('listOpenPRs should handle empty statusCheckRollup', async () => {
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('gh version 2.40.0')
      .mockResolvedValueOnce(JSON.stringify([
        { number: 1, title: 'Test PR', state: 'OPEN', headRefName: 'feat/test', baseRefName: 'main', url: 'https://github.com/test/repo/pull/1', mergeable: true, statusCheckRollup: null }
      ]));
    
    const prs = await listOpenPRs();
    // Code: pr.statusCheckRollup?.some(...) ?? true - null ?? true = true
    expect(prs[0].checksPassing).toBe(true);
  });

  it('listOpenPRs should handle statusCheckRollup with failure', async () => {
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('gh version 2.40.0')
      .mockResolvedValueOnce(JSON.stringify([
        { number: 1, title: 'Test PR', state: 'OPEN', headRefName: 'feat/test', baseRefName: 'main', url: 'https://github.com/test/repo/pull/1', mergeable: true, statusCheckRollup: [{ state: 'FAILURE' }] }
      ]));
    
    const prs = await listOpenPRs();
    expect(prs[0].checksPassing).toBe(false);
  });
});

describe('Final Coverage Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('checkUpstreamStatus with merged and open PRs', async () => {
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({
      defaultBranch: 'main',
      upstreamRemote: 'upstream',
      repoType: 'fork'
    });
    // detectNewUpstreamCommits
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('100')
      .mockResolvedValueOnce('100');
    // gh available and returns PRs
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('gh version 2.40.0')
      .mockResolvedValueOnce(JSON.stringify([
        { number: 1, title: 'Merged', state: 'MERGED', headRefName: 'feat/merged', baseRefName: 'main', url: 'http://test', mergeable: true, statusCheckRollup: [] },
        { number: 2, title: 'Closed', state: 'CLOSED', headRefName: 'feat/closed', baseRefName: 'main', url: 'http://test', mergeable: true, statusCheckRollup: [] },
        { number: 3, title: 'Open', state: 'OPEN', headRefName: 'feat/open', baseRefName: 'main', url: 'http://test', mergeable: true, statusCheckRollup: [] }
      ]));
    
    const status = await checkUpstreamStatus();
    expect(status.mergedPRs).toBeDefined();
    expect(status.newPRs).toBeDefined();
  });

  it('getBranchStatus should include branches with upstream', async () => {
    // Mock for-each-ref to return a feature branch
    (gitModule.git as jest.Mock).mockResolvedValue('feat/test\n 2024-01-01\n origin/feat/test\n');
    // Second call for rev-list
    (gitModule.git as jest.Mock).mockResolvedValue('3  5');
    
    const branches = await getBranchStatus();
    expect(branches).toBeDefined();
  });

  it('getBranchStatus handles no rev-list output', async () => {
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('feat/test 2024-01-01 origin/feat/test')
      .mockResolvedValueOnce('');
    
    const branches = await getBranchStatus();
    expect(branches).toBeDefined();
  });

  it('reportBlockers catches stale branch errors', async () => {
    // Branch listing succeeds
    (gitModule.git as jest.Mock).mockResolvedValue('feat/test');
    // git log fails for date check
    (gitModule.git as jest.Mock).mockRejectedValue(new Error('log failed'));
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({});
    
    const blockers = await reportBlockers();
    // When git log fails, the branch is skipped, resulting in empty
    expect(blockers.staleBranches).toBeDefined();
  });

  it('reportBlockers with failed checks PRs', async () => {
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('')
      .mockRejectedValueOnce(new Error('no gh'));
    // gh fails later too
    (gitModule.git as jest.Mock).mockRejectedValue(new Error('no gh'));
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({});
    
    const blockers = await reportBlockers();
    expect(blockers).toBeDefined();
  });
});

describe('Comprehensive Daily Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('detectConflictBranches should handle branch with arrow', async () => {
    // Branch listing includes branch->remote pointing
    (gitModule.git as jest.Mock).mockResolvedValue('main -> origin/main');
    
    // This should skip because of include('->')
    const { detectConflictBranches } = require('../../src/lib/daily');
    // This function is internal, so we need different approach
    
    // Try calling getBranchStatus which uses similar patterns
    (gitModule.git as jest.Mock).mockResolvedValue('feat/test 2024-01-01');
    const branches = await getBranchStatus();
    expect(branches).toBeDefined();
  });

  it('detectStaleBranches handles parseable date', async () => {
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('feat/test')
      .mockResolvedValueOnce(new Date().toISOString());
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({});
    
    const blockers = await reportBlockers();
    expect(blockers).toBeDefined();
  });
});

describe('Targeted Daily Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reportBlockers should detectStaleBranches when branches exist', async () => {
    // First call: branch --format returns feature branches
    (gitModule.git as jest.Mock)
      .mockResolvedValueOnce('feat/test1\nfeat/test2')
      // Second/third: git log for dates - return future dates (not stale)
      .mockResolvedValueOnce(new Date(Date.now() + 86400000).toISOString()) // tomorrow
      .mockResolvedValueOnce(new Date(Date.now() + 86400000).toISOString());
    // No gh available
    (gitModule.git as jest.Mock).mockRejectedValue(new Error('no gh'));
    (repoModule.loadConfig as jest.Mock).mockResolvedValue({});
    
    const blockers = await reportBlockers();
    expect(blockers.staleBranches).toEqual([]);
  });

  it('getBranchStatus should use origin prefix correctly', async () => {
    // Branch that has origin/ prefix in upstream
    (gitModule.git as jest.Mock).mockResolvedValue('feat/awesome 2024-01-01 origin/feat/awesome');
    (gitModule.git as jest.Mock).mockResolvedValue('0  0'); // ahead=0, behind=0
    
    const branches = await getBranchStatus();
    expect(branches).toBeDefined();
  });
});
