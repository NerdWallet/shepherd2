/* eslint-disable class-methods-use-this */
import fs from 'fs-extra-promise';
import simpleGit, { SimpleGit } from 'simple-git/promise';

import { IMigrationContext } from '../migration-context';
import IRepoAdapter, { IRepo } from './base';

abstract class GitAdapter implements IRepoAdapter {
  protected migrationContext: IMigrationContext;
  protected branchName: string;
  constructor(migrationContext: IMigrationContext) {
    this.migrationContext = migrationContext;
    this.branchName = migrationContext.migration.spec.id;
  }

  public abstract getCandidateRepos(): Promise<IRepo[]>;

  public abstract parseRepo(repo: string): IRepo;

  public abstract reposEqual(repo1: IRepo, repo2: IRepo): boolean;

  public abstract stringifyRepo(repo: IRepo): string;

  public abstract getRepoDir(repo: IRepo): string;

  public abstract getDataDir(repo: IRepo): string;

  public async checkoutRepo(repo: IRepo): Promise<void> {
    const repoPath = this.getRepositoryUrl(repo);
    const localPath = this.getRepoDir(repo);

    if (await fs.existsAsync(localPath) && await this.git(repo).checkIsRepo()) {
      // Repo already exists; just fetch
      await this.git(repo).fetch('origin');
    } else {
      await simpleGit().clone(repoPath, localPath);
    }

    // We'll immediately create and switch to a new branch
    try {
      await this.git(repo).checkoutLocalBranch(this.branchName);
    } catch (e) {
      // This branch probably already exists; we'll just switch to it
      // to make sure we're on the right branch for the commit phase
      await this.git(repo).checkout(this.branchName);
    }
  }

  public async commitRepo(repo: IRepo): Promise<void> {
    const { migration: { spec } } = this.migrationContext;
    await this.git(repo).add('.');
    await this.git(repo).commit(`Shepherd: ${spec.title}`);
  }

  public async resetRepo(repo: IRepo): Promise<void> {
    await this.git(repo).reset('hard');
    await this.git(repo).clean('f', ['-d']);
  }

  public async pushRepo(repo: IRepo): Promise<void> {
    await this.git(repo).push('origin', 'HEAD', { '-f': null });
  }

  public abstract createPullRequest(repo: IRepo, message: string): Promise<void>;

  public abstract getPullRequestStatus(repo: IRepo): Promise<string[]>;

  protected abstract getRepositoryUrl(repo: IRepo): string;

  protected git(repo: IRepo): SimpleGit {
    const git = simpleGit(this.getRepoDir(repo));
    git.silent(true);
    return git;
  }

}

export default GitAdapter;
