import type { Octokit } from '@octokit/rest';

import { IMigrationContext } from '../migration-context';
import GithubService from '../services/github';
import GithubAdapter from './github';
jest.mock('../services/github');

const mockMigrationContext = () => ({
  migration: {
    spec: {
      id: 'test-migration',
      title: 'Test migration'
    },
  },
});

describe('GithubAdapter', () => {
  describe('reposEqual', () => {
    it('recognizes two repos as equal', () => {
      const mocktokit = ({} as any as Octokit);
      const repo1 = { owner: 'NerdWallet', name: 'shepherd' };
      const repo2 = { owner: 'NerdWallet', name: 'shepherd' };

      const service = new GithubService(mocktokit);
      const adapter = new GithubAdapter(mockMigrationContext() as IMigrationContext, service);
      expect(adapter.reposEqual(repo1, repo2)).toBe(true);
    });

    it('recognizes two repos as equal if one is missing a default branch', () => {
      const mocktokit = ({} as any as Octokit);
      const repo1 = { owner: 'NerdWallet', name: 'shepherd', defaultBranch: 'master' };
      const repo2 = { owner: 'NerdWallet', name: 'shepherd' };

      const service = new GithubService(mocktokit);
      const adapter = new GithubAdapter(mockMigrationContext() as IMigrationContext, service);
      expect(adapter.reposEqual(repo1, repo2)).toBe(true);
    });
  });

  describe('getCandidateRepos', () => {
    it('validates search_query is not specified with org search', () => {
      const mocktokit = ({} as any as Octokit);
      const migrationCtx: any = mockMigrationContext();
      migrationCtx.migration.spec.adapter = {
        org: 'testOrg',
        type: 'github',
        search_query: 'topics:test'
      };

      const service = new GithubService(mocktokit);
      const adapter = new GithubAdapter(migrationCtx, service);

      return expect(adapter.getCandidateRepos())
        .rejects
        .toThrow('Cannot use both \"org\" and \"search_query\" in GitHub adapter. Pick one.');
    });

    it('performs org search if specified and returns expected result', async () => {
      const mocktokit = ({} as any as Octokit);
      const migrationCtx: any = mockMigrationContext();
      migrationCtx.migration.spec.adapter = {
        type: 'github',
        org: 'testOrg'
      };

      const service: any = new GithubService(mocktokit);
      service.getActiveReposForOrg.mockResolvedValue(['testOrg/test-repo']);
      const adapter = new GithubAdapter(migrationCtx, service);

      const result = await adapter.getCandidateRepos();
      expect(service.getActiveReposForOrg).toBeCalledWith({ org: 'testOrg' });
      expect(result).toStrictEqual([ { owner: 'testOrg', name: 'test-repo' } ]);
    });

    it(`performs repository search and returns expected result if 'respositories' is specified for search_type`, async () => {
      const mocktokit = ({} as any as Octokit);
      const migrationCtx: any = mockMigrationContext();
      migrationCtx.migration.spec.adapter = {
        type: 'github',
        search_type: 'repositories',
        search_query: 'topics:test'
      };

      const service: any = new GithubService(mocktokit);
      service.getActiveReposForSearchTypeAndQuery.mockResolvedValue(['repoownername/test-repo']);
      const adapter = new GithubAdapter(migrationCtx, service);

      const result = await adapter.getCandidateRepos();
      expect(service.getActiveReposForSearchTypeAndQuery).toBeCalledWith({
        search_type: 'repositories',
        search_query: 'topics:test'
      });
      expect(result).toStrictEqual([ { owner: 'repoownername', name: 'test-repo' } ]);
    });

    it(`performs code search and returns expected result if search_type is 'code' or is not provided`, async () => {
      const mocktokit = ({} as any as Octokit);
      const migrationCtx: any = mockMigrationContext();
      migrationCtx.migration.spec.adapter = {
        type: 'github',
        search_type: 'code',
        search_query: 'path:/ filename:package.json in:path'
      };

      const migrationCtxWithoutSearchType: any = mockMigrationContext();
      migrationCtxWithoutSearchType.migration.spec.adapter = {
        type: 'github',
        search_query: 'path:/ filename:package.json in:path'
      };

      const service: any = new GithubService(mocktokit);
      service.getActiveReposForSearchTypeAndQuery.mockResolvedValue(['repoownername/test-repo']);
      const adapterWithSearchType = new GithubAdapter(migrationCtx, service);
      const adapterWithoutSearchType = new GithubAdapter(migrationCtxWithoutSearchType, service);

      const getCandidateRepos = [
        adapterWithSearchType.getCandidateRepos(),
        adapterWithoutSearchType.getCandidateRepos()
      ];

      const results = await Promise.all(getCandidateRepos);
      expect(service.getActiveReposForSearchTypeAndQuery).toBeCalledTimes(2);
      expect(service.getActiveReposForSearchTypeAndQuery).toBeCalledWith({
        search_type: 'code',
        search_query: 'path:/ filename:package.json in:path'
      });
      expect(results[0]).toStrictEqual([ { owner: 'repoownername', name: 'test-repo' } ]);
      expect(results[1]).toStrictEqual([ { owner: 'repoownername', name: 'test-repo' } ]);
    });
  });

  describe('parseRepo', () => {
    it('throws if owner or name not found in repo string', () => {
      const mocktokit = ({} as any as Octokit);
      const migrationCtx: any = mockMigrationContext();
      const service = new GithubService(mocktokit);
      const adapter = new GithubAdapter(migrationCtx, service);
      const calledWithoutName = adapter.parseRepo.bind(null, 'ownerbutnoname/');
      const calledWithoutOwner = adapter.parseRepo.bind(null, '/namebutnoowner');
      const calledWithNeither = adapter.parseRepo.bind(null, '');
      
      expect(calledWithoutName).toThrow('Could not parse repo "ownerbutnoname/"');
      expect(calledWithoutOwner).toThrow('Could not parse repo "/namebutnoowner"');
      expect(calledWithNeither).toThrow('Could not parse repo ""');
    });
  });

  describe('mapRepoAfterCheckout', () => {
    it('saves the default branch', async () => {
      const mocktokit = ({} as any as Octokit);
      const service: any = new GithubService(mocktokit);
      const repo = {
        owner: 'NerdWallet',
        name: 'test',
      };
      service.getDefaultBranchForRepo.mockResolvedValue('develop');
      const adapter = new GithubAdapter(mockMigrationContext() as IMigrationContext, service);

      const mappedRepo = await adapter.mapRepoAfterCheckout(repo);
      expect(service.getDefaultBranchForRepo).toBeCalledTimes(1);
      expect(service.getDefaultBranchForRepo).toBeCalledWith({ owner: repo.owner, repo: repo.name });
      expect(mappedRepo).toEqual({
        ...repo,
        defaultBranch: 'develop',
      });
    });
  });

  describe('prRepo', () => {
    const REPO = {
      owner: 'NerdWallet',
      name: 'shepherd',
      defaultBranch: 'master',
    };

    it('creates a new PR if one does not exist', async () => {
      const octokit = ({} as any as Octokit);
      const service: any = new GithubService(octokit);
      service.listPullRequests.mockResolvedValue([])
      const adapter = new GithubAdapter(mockMigrationContext() as IMigrationContext, service);

      await adapter.createPullRequest(REPO, 'Test PR message');

      expect(service.listPullRequests).toBeCalledWith({
        owner: 'NerdWallet',
        repo: 'shepherd',
        head: 'NerdWallet:test-migration',
      });
      expect(service.createPullRequest).toBeCalledWith({
        owner: 'NerdWallet',
        repo: 'shepherd',
        head: 'test-migration',
        base: 'master',
        title: 'Test migration',
        body: 'Test PR message',
      });
    });

    it('updates a PR if one exists and is open', async () => {
      const octokit = ({} as any as Octokit);
      const service: any = new GithubService(octokit);
      service.listPullRequests.mockResolvedValue([{
          number: 1234,
          state: 'open',
      }]);
      const adapter = new GithubAdapter(mockMigrationContext() as IMigrationContext, service);
      await adapter.createPullRequest(REPO, 'Test PR message, part 2');

      expect(service.updatePullRequest).toBeCalledWith({
        owner: 'NerdWallet',
        repo: 'shepherd',
        title: 'Test migration',
        body: 'Test PR message, part 2',
        pull_number: 1234
      });
    });

    it('does not update a closed PR', async () => {
      const octokit = ({} as any as Octokit);
      const service: any = new GithubService(octokit);
      service.listPullRequests.mockResolvedValue([{
          number: 1234,
          state: 'closed',
      }]);
      const adapter = new GithubAdapter(mockMigrationContext() as IMigrationContext, service);
      await expect(adapter.createPullRequest(REPO, 'Test PR message, part 2')).rejects.toThrow();
      expect(service.updatePullRequest).not.toBeCalled()
    });
  });
});
