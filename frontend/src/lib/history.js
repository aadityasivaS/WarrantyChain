import { Contract } from 'ethers'
import { ABI } from '../config/contract'

const eventDefinitions = [
  ['Transfer', (contract, tokenId) => contract.filters.Transfer(null, null, tokenId)],
  ['ProductRegistered', (contract, tokenId) => contract.filters.ProductRegistered(tokenId)],
  ['ClaimSubmitted', (contract, tokenId) => contract.filters.ClaimSubmitted(null, tokenId)],
  ['ClaimStatusUpdated', (contract, tokenId) => contract.filters.ClaimStatusUpdated(null, tokenId)],
  ['ServiceCompleted', (contract, tokenId) => contract.filters.ServiceCompleted(null, tokenId)],
]

const eventLabel = (name, args) => {
  if (name === 'Transfer') {
    if (args.from === '0x0000000000000000000000000000000000000000') return 'Warranty minted'
    if (args.to === '0x0000000000000000000000000000000000000000') return 'Warranty burned'
    return 'Warranty transferred'
  }
  if (name === 'ProductRegistered') return 'Warranty registered'
  if (name === 'ClaimSubmitted') return 'Claim submitted'
  if (name === 'ClaimStatusUpdated') return `Claim status updated to ${['Pending', 'Approved', 'Rejected', 'Resolved'][Number(args.newStatus)] || 'Unknown'}`
  return `Repair completed: ${args.repairCategory}`
}

export async function loadWarrantyHistory(provider, address, tokenId, deploymentBlock = 0) {
  const contract = new Contract(address, ABI, provider)
  const logs = (await Promise.all(eventDefinitions.map(async ([name, filter]) => (
    (await contract.queryFilter(filter(contract, tokenId), deploymentBlock)).map((log) => ({ name, log }))
  )))).flat()
  const blockCache = new Map()
  const entries = await Promise.all(logs.map(async ({ name, log }) => {
    const blockNumber = log.blockNumber
    if (!blockCache.has(blockNumber)) blockCache.set(blockNumber, provider.getBlock(blockNumber))
    const block = await blockCache.get(blockNumber)
    if (!block) throw Error(`Unable to read timestamp for block ${blockNumber}.`)
    const args = log.args
    return {
      name,
      label: eventLabel(name, args),
      args,
      timestamp: block.timestamp,
      blockNumber,
      transactionIndex: log.transactionIndex,
      logIndex: log.index,
    }
  }))
  return entries.sort((a, b) => a.blockNumber - b.blockNumber || a.transactionIndex - b.transactionIndex || a.logIndex - b.logIndex)
}
