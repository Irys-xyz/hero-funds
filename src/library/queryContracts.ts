import { query } from 'gql-query-builder';


export async function queryContracts(source, arweave) {
  const que = query({
    operation: 'transactions',
    variables: {
      tags: {
        value: {
          name: "Contract-Src",
          values: [source]
        },
        type: "[TagFilter!]"
      }
    },
    fields: [
      {
        edges: [
          {
            node: [
              'id'
            ]
          }
        ]
      }
    ]

  })
  const res = await arweave.api.post("/graphql", que);
  return res.data.data.transactions.edges;
}

