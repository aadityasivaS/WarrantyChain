import { Contract, JsonRpcProvider } from 'ethers'
import { ABI, CONTRACT_ADDRESS, RPC_URL } from '../config/contract'

export const readContract = () => new Contract(CONTRACT_ADDRESS, ABI, new JsonRpcProvider(RPC_URL))

export async function loadOwnedTokens(address) {
  const contract = readContract()
  const count = Number(await contract.balanceOf(address))
  const ids = await Promise.all(Array.from({length: count}, (_, i) => contract.tokenOfOwnerByIndex(address, i)))
  return loadProducts(ids.map(String))
}

export async function loadProducts(ids) {
  const contract = readContract()
  return Promise.all(ids.map(async (id) => {
    const [product, owner, active, claims] = await Promise.all([
      contract.getProduct(id), contract.ownerOf(id), contract.isWarrantyActive(id), contract.getClaimsForToken(id),
    ])
    return { id: BigInt(id), product, owner, active, claims }
  }))
}

export async function loadManufacturerProducts(address) {
  const contract = readContract()
  const ids = await contract.getRegisteredTokenIds(address)
  return loadProducts(ids.map((id) => id.toString()))
}

export async function loadClaim(claimId) {
  const contract = readContract()
  const claim = await contract.getClaim(claimId)
  const [product, owner] = await Promise.all([contract.getProduct(claim.tokenId), contract.ownerOf(claim.tokenId)])
  return { id: BigInt(claimId), claim, product, owner }
}
