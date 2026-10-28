import { useEffect, useState } from 'react'
import { Contract, JsonRpcProvider } from 'ethers'
import { useParams } from 'react-router-dom'
import { ABI, CHAIN_ID, CONTRACT_ADDRESS, RPC_URL, isConfigured } from '../config/contract'
import { errorMessage, formatDate, shortAddress } from '../lib/warranty'
import { loadWarrantyHistory } from '../lib/history'

function PublicVerification() {
  const { tokenId } = useParams()
  const [state, setState] = useState({ status: 'loading', record: null, timeline: [], error: '' })

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        if (!isConfigured) throw Error('This verification page is not connected to a deployed warranty contract.')
        let id
        try { id = BigInt(tokenId) } catch { throw Error('The verification URL contains an invalid token ID.') }
        if (id < 1n) throw Error('The verification URL contains an invalid token ID.')
        const provider = new JsonRpcProvider(RPC_URL)
        const network = await provider.getNetwork()
        if (Number(network.chainId) !== CHAIN_ID) throw Error(`The public RPC is configured for chain ${network.chainId}, expected ${CHAIN_ID}.`)
        const contract = new Contract(CONTRACT_ADDRESS, ABI, provider)
        const [product, owner, activeWarranty, metadataURI, timeline] = await Promise.all([
          contract.getProduct(id),
          contract.ownerOf(id),
          contract.isWarrantyActive(id),
          contract.tokenURI(id),
          loadWarrantyHistory(provider, CONTRACT_ADDRESS, id, Number(import.meta.env.VITE_DEPLOYMENT_BLOCK || 0)),
        ])
        if (active) setState({ status: 'ready', record: { id, product, owner, active: activeWarranty, metadataURI }, timeline, error: '' })
      } catch (error) {
        if (active) setState({ status: 'error', record: null, timeline: [], error: errorMessage(error) })
      }
    }
    load()
    return () => { active = false }
  }, [tokenId])

  return <main className="public-page"><header className="public-header"><a className="brand" href="/"><span className="brand-mark">W</span><span>Warranty<span className="brand-accent">Chain</span></span></a><span className="public-label">Public verification</span></header>{state.status === 'loading' && <div className="public-state"><span className="loading-spinner" />Reading the warranty record…</div>}{state.status === 'error' && <div className="public-state error-state"><span className="dialog-icon">!</span><h1>Verification unavailable</h1><p>{state.error}</p><a className="primary-button" href="/">Return to WarrantyChain</a></div>}{state.record && <PublicRecord record={state.record} timeline={state.timeline} />}</main>
}

function PublicRecord({ record, timeline }) {
  const { id, product, owner, active, metadataURI } = record
  return <section className="public-record"><div className="public-record-heading"><div><p className="eyebrow"><span /> On-chain warranty record</p><h1>{product.name}</h1><p className="public-subtitle">{product.model} · NFT #{id.toString()}</p></div><span className={`public-status ${active ? 'active' : 'expired'}`}><span />{active ? 'Active' : 'Expired'}</span></div><div className="public-grid"><span><small>Product model</small>{product.model}</span><span><small>Serial number</small>{product.serialNumber}</span><span><small>Current owner</small>{shortAddress(owner)}</span><span><small>Warranty status</small>{active ? 'Valid and active' : 'Expired'}</span><span><small>Warranty start</small>{formatDate(product.warrantyStart)}</span><span><small>Warranty expiry</small>{formatDate(product.warrantyExpiry)}</span></div>{metadataURI && <p className="metadata-link">Metadata: <a href={metadataURI} target="_blank" rel="noreferrer">{metadataURI}</a></p>}<Timeline entries={timeline} /><p className="authenticity-note">This QR code links to a public blockchain record. It is not proof of physical authenticity.</p></section>
}

function Timeline({ entries }) {
  return <section className="timeline"><div className="timeline-heading"><p className="section-kicker">Blockchain trace</p><h2>Ownership & service history</h2></div>{entries.length === 0 ? <p className="timeline-empty">No activity events were returned for this deployment.</p> : <ol>{entries.map((entry) => <li key={`${entry.blockNumber}-${entry.transactionIndex}-${entry.logIndex}`}><span className="timeline-marker" /><div><strong>{entry.label}</strong><time>{formatDate(entry.timestamp)}</time>{entry.name === 'ClaimSubmitted' && <p>{entry.args.description}</p>}{entry.name === 'ServiceCompleted' && <p>Service center {shortAddress(entry.args.serviceCenter)} · Reference: {entry.args.reportReference || 'None provided'}</p>}{entry.name === 'ClaimStatusUpdated' && <p>Claim #{entry.args.claimId.toString()}</p>}</div></li>)}</ol>}</section>
}

export default PublicVerification
