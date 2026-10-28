import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { BrowserProvider, Contract, JsonRpcProvider, isAddress } from 'ethers'
import { ABI, CHAIN_ID, CONTRACT_ADDRESS, RPC_URL, isConfigured } from '../config/contract'

const WalletContext = createContext(null)

export function WalletProvider({ children }) {
  const [account, setAccount] = useState('')
  const [chainId, setChainId] = useState(null)
  const [roles, setRoles] = useState({ manufacturer: false, service: false, loading: Boolean(typeof window !== 'undefined' && window.ethereum) })
  const ethereum = typeof window !== 'undefined' ? window.ethereum : undefined

  const refreshRoles = async (address = account) => {
    if (!address || !isConfigured) return setRoles({ manufacturer: false, service: false, loading: false })
    setRoles((value) => ({ ...value, loading: true }))
    try {
      const contract = new Contract(CONTRACT_ADDRESS, ABI, new JsonRpcProvider(RPC_URL))
      const [manufacturerRole, serviceRole] = await Promise.all([contract.MANUFACTURER_ROLE(), contract.SERVICE_ROLE()])
      const [manufacturer, service] = await Promise.all([
        contract.hasRole(manufacturerRole, address), contract.hasRole(serviceRole, address),
      ])
      setRoles({ manufacturer, service, loading: false })
    } catch { setRoles({ manufacturer: false, service: false, loading: false }) }
  }

  const connect = async () => {
    if (!ethereum) throw Error('MetaMask or another compatible wallet is required.')
    await ethereum.request({ method: 'eth_requestAccounts' })
    const provider = new BrowserProvider(ethereum)
    const signer = await provider.getSigner()
    const address = await signer.getAddress()
    const network = await provider.getNetwork()
    setAccount(address)
    setChainId(Number(network.chainId))
    await refreshRoles(address)
  }

  const disconnect = () => { setAccount(''); setChainId(null); setRoles({ manufacturer: false, service: false, loading: false }) }

  useEffect(() => {
    if (!ethereum) return
    const onAccounts = async ([address]) => {
      setAccount(address || '')
      if (!address) disconnect()
      else await refreshRoles(address)
    }
    const onChain = (hex) => setChainId(Number.parseInt(hex, 16))
    ethereum.on('accountsChanged', onAccounts)
    ethereum.on('chainChanged', onChain)
    ethereum.request({ method: 'eth_accounts' }).then(([address]) => { if (address) { setAccount(address); refreshRoles(address); onChain('0x' + CHAIN_ID.toString(16)) } })
    return () => { ethereum.removeListener('accountsChanged', onAccounts); ethereum.removeListener('chainChanged', onChain) }
  }, [])

  useEffect(() => { if (account) refreshRoles(account) }, [account])

  const signerContract = async () => {
    if (!ethereum) throw Error('Connect a compatible wallet first.')
    if (!isAddress(CONTRACT_ADDRESS) || !isConfigured) throw Error('Warranty contract is not configured.')
    const provider = new BrowserProvider(ethereum)
    const network = await provider.getNetwork()
    if (Number(network.chainId) !== CHAIN_ID) throw Error(`Switch the wallet to chain ID ${CHAIN_ID}.`)
    const signer = await provider.getSigner()
    return new Contract(CONTRACT_ADDRESS, ABI, signer)
  }

  const value = useMemo(() => ({ account, chainId, roles, connect, disconnect, signerContract, refreshRoles, ethereum }), [account, chainId, roles])
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export const useWallet = () => useContext(WalletContext)
