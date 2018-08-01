import { IMigrationContext } from '../migration-context';

export interface IRepo {
  [key: string]: any;
}

interface IRepoAdapter {
  getCandidateRepos(): Promise<IRepo[]>;

  parseRepo(repo: string): IRepo;

  reposEqual(repo1: IRepo, repo2: IRepo): boolean;

  stringifyRepo(repo: IRepo): string;

  checkoutRepo(repo: IRepo): Promise<void>;

  commitRepo(repo: IRepo): Promise<void>;

  resetRepo(repo: IRepo): Promise<void>;

  pushRepo(repo: IRepo): Promise<void>;

  createPullRequest(repo: IRepo, message: string): Promise<void>;

  getPullRequestStatus(repo: IRepo): Promise<string[]>;

  getRepoDir(repo: IRepo): string;

  getDataDir(repo: IRepo): string;
}

export default IRepoAdapter;
