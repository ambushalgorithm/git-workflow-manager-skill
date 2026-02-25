// Test config (save/load) and repo initialization
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
  createBranchFrom: jest.fn(),
  createEmptyCommit: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

import * as gitModule from '../../src/lib/git';
import * as fsModule from 'fs/promises';
import { getDefaultBranch, saveConfig, initWorkflow, createBranchHierarchy } from '../../src/lib/repo';

const createConfig = () => ({
  repoType: 'internal' as const,
  defaultBranch: 'master',
  createdAt: new Date().toISOString(),
  branchPrefixes: { feature: 'feat/', hotfix: 'hotfix/', release: 'release/' }
});

describe('getDefaultBranch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return "main" when main branch exists', async () => {
    (gitModule.branchExists as jest.Mock).mockResolvedValueOnce(true);

    const result = await getDefaultBranch();
    expect(result).toBe('main');
  });

  it('should return "master" when main does not exist but master does', async () => {
    (gitModule.branchExists as jest.Mock)
      .mockResolvedValueOnce(false)  // main doesn't exist
      .mockResolvedValueOnce(true);  // master exists

    const result = await getDefaultBranch();
    expect(result).toBe('master');
  });

  it('should throw when neither main nor master exists', async () => {
    (gitModule.branchExists as jest.Mock)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);

    await expect(getDefaultBranch()).rejects.toThrow('No default branch found');
  });
});

describe('saveConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should write config JSON to file', async () => {
    const config = createConfig();
    (fsModule.writeFile as jest.Mock).mockResolvedValue(undefined);

    await saveConfig(config);

    expect(fsModule.writeFile).toHaveBeenCalledWith(
      '.git/workflow-config.json',
      JSON.stringify(config, null, 2)
    );
  });
});

describe('createBranchHierarchy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create staging, integration, develop branches', async () => {
    (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('main');
    (gitModule.branchExists as jest.Mock).mockResolvedValue(false);
    (gitModule.git as jest.Mock).mockResolvedValue('');
    (fsModule.writeFile as jest.Mock).mockResolvedValue(undefined);

    await createBranchHierarchy('internal', 'main');

    // Should have called createBranchFrom for each branch
    expect(gitModule.createBranchFrom).toHaveBeenCalledWith('main', 'staging');
    expect(gitModule.createBranchFrom).toHaveBeenCalledWith('staging', 'integration');
    expect(gitModule.createBranchFrom).toHaveBeenCalledWith('integration', 'develop');
  });

  it('should skip branches that already exist', async () => {
    (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('main');
    // First branch exists, others don't
    (gitModule.branchExists as jest.Mock)
      .mockResolvedValueOnce(true)   // staging exists
      .mockResolvedValueOnce(false)  // integration doesn't
      .mockResolvedValueOnce(false); // develop doesn't

    await createBranchHierarchy('internal', 'main');

    // Should not create staging since it exists
    expect(gitModule.createBranchFrom).not.toHaveBeenCalledWith('main', 'staging');
  });

  it('should return to original branch after creation', async () => {
    (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('feature/my-work');
    (gitModule.branchExists as jest.Mock).mockResolvedValue(false);

    await createBranchHierarchy('internal', 'main');

    // Should checkout back to original branch
    expect(gitModule.checkout).toHaveBeenCalledWith('feature/my-work');
  });
});

describe('initWorkflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize fork workflow with upstream remote', async () => {
    // Mock detectRepoType
    (gitModule.isGitRepo as jest.Mock).mockResolvedValue(true);
    (gitModule.getRemotes as jest.Mock).mockResolvedValue([
      { name: 'origin', url: 'git@github.com:user/repo.git' },
      { name: 'upstream', url: 'git@github.com:original/repo.git' },
    ]);

    // Mock getDefaultBranch - returns true for main
    (gitModule.branchExists as jest.Mock).mockResolvedValue(true);

    // Mock createBranchHierarchy
    (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('main');
    (gitModule.git as jest.Mock).mockResolvedValue('');
    (fsModule.writeFile as jest.Mock).mockResolvedValue(undefined);

    const result = await initWorkflow();

    expect(result.repoType).toBe('fork');
    expect(result.upstreamRemote).toBe('git@github.com:original/repo.git');
  });

  it('should initialize internal workflow without upstream', async () => {
    (gitModule.isGitRepo as jest.Mock).mockResolvedValue(true);
    (gitModule.getRemotes as jest.Mock).mockResolvedValue([
      { name: 'origin', url: 'git@github.com:company/repo.git' },
    ]);
    (gitModule.branchExists as jest.Mock).mockResolvedValue(true);
    (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('main');
    (gitModule.git as jest.Mock).mockResolvedValue('');
    (fsModule.writeFile as jest.Mock).mockResolvedValue(undefined);

    const result = await initWorkflow();

    expect(result.repoType).toBe('internal');
    expect(result.upstreamRemote).toBeUndefined();
  });

  it('should return existing config without --force', async () => {
    const existingConfig = createConfig();
    (fsModule.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existingConfig));

    const result = await initWorkflow();

    expect(result).toEqual(existingConfig);
    expect(gitModule.isGitRepo).not.toHaveBeenCalled();
  });

  it('should reinitialize with --force flag', async () => {
    const existingConfig = createConfig();
    (fsModule.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existingConfig));

    // Reset mocks for init
    (gitModule.isGitRepo as jest.Mock).mockResolvedValue(true);
    (gitModule.getRemotes as jest.Mock).mockResolvedValue([
      { name: 'origin', url: 'git@github.com:company/repo.git' },
    ]);
    (gitModule.branchExists as jest.Mock).mockResolvedValue(true);
    (gitModule.getCurrentBranch as jest.Mock).mockResolvedValue('main');
    (gitModule.git as jest.Mock).mockResolvedValue('');
    (fsModule.writeFile as jest.Mock).mockResolvedValue(undefined);

    const result = await initWorkflow(true);

    // Should have called init even though config existed
    expect(gitModule.isGitRepo).toHaveBeenCalled();
  });
});