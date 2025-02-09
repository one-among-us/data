import fetch from 'node-fetch'
import { backOff } from 'exponential-backoff'

const CF_API_TOKEN = process.env.CF_API_TOKEN
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID
const CF_PAGES_PROJECT_NAME = process.env.CF_PAGES_PROJECT_NAME
const CF_DELETE_ALIASED_DEPLOYMENTS = process.env.CF_DELETE_ALIASED_DEPLOYMENTS

const MAX_ATTEMPTS = 5

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const headers = {
  Authorization: `Bearer ${CF_API_TOKEN}`,
}

/** Get the cononical deployment (the live deployment) */
async function getProductionDeploymentId() {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PAGES_PROJECT_NAME}`,
    {
      method: 'GET',
      headers,
    }
  )
  const body = await response.json()
  if (!body.success) {
    throw new Error(body.errors[0].message)
  }
  const prodDeploymentId = body.result.canonical_deployment.id
  if (!prodDeploymentId) {
    throw new Error('Unable to fetch production deployment ID')
  }
  return prodDeploymentId
}

async function deleteDeployment(id) {
  let params = ''
  if (CF_DELETE_ALIASED_DEPLOYMENTS === 'true') {
    params = '?force=true' // Forces deletion of aliased deployments
  }
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PAGES_PROJECT_NAME}/deployments/${id}${params}`,
    {
      method: 'DELETE',
      headers,
    }
  )
  const body = await response.json()
  if (!body.success) {
    throw new Error(body.errors[0].message)
  }
  console.log(`Deleted deployment ${id} for project ${CF_PAGES_PROJECT_NAME}`)
}

async function listDeploymentsPerPage(page) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PAGES_PROJECT_NAME}/deployments?per_page=10&page=${page}`,
    {
      method: 'GET',
      headers,
    }
  )
  const body = await response.json()
  if (!body.success) {
    throw new Error(`Could not fetch deployments for ${CF_PAGES_PROJECT_NAME}`)
  }
  return body.result
}

async function listAllDeployments() {
  let page = 1
  const deploymentIds = []

  while (true) {
    let result
    try {
      result = await backOff(() => listDeploymentsPerPage(page), {
        numOfAttempts: 5,
        startingDelay: 1000, // 1s, 2s, 4s, 8s, 16s
        retry: (_, attempt) => {
          console.warn(
            `Failed to list deployments on page ${page}... retrying (${attempt}/${MAX_ATTEMPTS})`
          )
          return true
        },
      })
    } catch (err) {
      console.warn(`Failed to list deployments on page ${page}.`)
      console.warn(err)

      process.exit(1)
    }

    for (const deployment of result) {
      deploymentIds.push(deployment.id)
    }

    if (result.length) {
      page = page + 1
      await sleep(500)
    } else {
      return deploymentIds
    }
  }
}

async function main() {
  if (!CF_API_TOKEN) {
    throw new Error('Please set CF_API_TOKEN as an env variable to your API Token')
  }

  if (!CF_ACCOUNT_ID) {
    throw new Error('Please set CF_ACCOUNT_ID as an env variable to your Account ID')
  }

  if (!CF_PAGES_PROJECT_NAME) {
    throw new Error(
      'Please set CF_PAGES_PROJECT_NAME as an env variable to your Pages project name'
    )
  }

  const productionDeploymentId = await getProductionDeploymentId()
  console.log(
    `Found live production deployment to exclude from deletion: ${productionDeploymentId}`
  )

  console.log('Listing all deployments, this may take a while...')
  const deploymentIds = await listAllDeployments()

  for (const id of deploymentIds) {
    if (id === productionDeploymentId) {
      console.log(`Skipping production deployment: ${id}`)
    } else {
      try {
        await deleteDeployment(id)
      } catch (error) {
        console.log(error)
      }
    }
  }
}

main()
