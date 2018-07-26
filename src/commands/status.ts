import { IMigrationContext } from '../migration-context';
import forEachRepo from '../util/for-each-repo';

export default async (context: IMigrationContext) => {
  const { logger, adapter } = context;

  await forEachRepo(context, async (repo) => {
    const spinner = logger.spinner('Determining repo status');
    const status = await adapter.repoStatus(repo);
    spinner.destroy();
    status.forEach((s) => logger.info(s));
  });
};
