import _ from 'lodash';

/**
 * Utility function to paginate a GraphQL function using Relay-style cursor pagination.
 *
 * @param {Function} queryFn - function used to query the GraphQL API
 * @param {string} query - GraphQL query, must include `nodes` and `pageInfo` fields for the field that will be paginated
 * @param {Object} variables
 * @param {string[]} paginatePath - path to field to paginate
 */
async function paginate(queryFn: any, query: any, variables: any, paginatePath: any) {
  const nodesPath = [...paginatePath, 'nodes']
  const pageInfoPath = [...paginatePath, 'pageInfo']
  const endCursorPath = [...pageInfoPath, 'endCursor']
  const hasNextPagePath = [...pageInfoPath, 'hasNextPage']
  const hasNextPage = (data: any) => _.get(data, hasNextPagePath)

  const data = await queryFn(query, variables);

  if (!_.has(data, nodesPath)) {
    throw new Error(
      "Data doesn't contain `nodes` field. Make sure the `paginatePath` is set to the field you wish to paginate and that the query includes the `nodes` field."
    )
  }

  if (
    !_.has(data, pageInfoPath) ||
    !_.has(data, endCursorPath) ||
    !_.has(data, hasNextPagePath)
  ) {
    throw new Error(
      "Data doesn't contain `pageInfo` field with `endCursor` and `hasNextPage` fields. Make sure the `paginatePath` is set to the field you wish to paginate and that the query includes the `pageInfo` field."
    )
  }

  while (hasNextPage(data)) {
    const newData = await queryFn(query, {
      ...variables,
      after: _.get(data, [...pageInfoPath, 'endCursor']),
    })
    const newNodes = _.get(newData, nodesPath)
    const newPageInfo = _.get(newData, pageInfoPath)

    _.set(data, pageInfoPath, newPageInfo)
    _.update(data, nodesPath, (d: any) => d.concat(newNodes))
  }

  return data
}

export default paginate
