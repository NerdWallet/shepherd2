import fs from 'fs-extra-promise';
import yaml from 'js-yaml';
import { differenceWith, unionWith } from 'lodash';
import path from 'path';

import { IRepo } from '../adapters/base';
import { IMigrationContext } from '../migration-context';

const getRepoListFile = (migrationContext: IMigrationContext) => {
  return path.join(migrationContext.migration.workingDirectory, 'repos.yml');
};

const loadRepoList = async (migrationContext: IMigrationContext): Promise<IRepo[] | null> => {
  const repoListFile = getRepoListFile(migrationContext);
  if (!await fs.existsAsync(repoListFile)) {
    return null;
  }
  return yaml.safeLoad(await fs.readFileAsync(repoListFile, 'utf8'));
};

const updateRepoList = async (
  migrationContext: IMigrationContext,
  checkedOutRepos: IRepo[],
  discardedRepos: IRepo[],
): Promise<IRepo[]> => {
  // We need to keep the list of repos in sync with what's actually on disk
  // To do this, we'll load the existing list, delete any repos that were not
  // kept during the checkout process (perhaps they failed a new should_migrate check),
  // and add any repos that were newly checked out, removing duplicates as appropriate
  const existingRepos = await loadRepoList(migrationContext);
  if (!existingRepos) {
    // No repos stored yet, we can update this list directly
    await fs.writeFileAsync(getRepoListFile(migrationContext), yaml.safeDump(checkedOutRepos));
    return checkedOutRepos;
  }

  const { reposEqual } = migrationContext.adapter;
  const repos = unionWith(differenceWith(existingRepos, discardedRepos, reposEqual), checkedOutRepos, reposEqual);

  await fs.writeFileAsync(getRepoListFile(migrationContext), yaml.safeDump(repos));
  return repos;
};

export {
  updateRepoList,
  loadRepoList,
};
