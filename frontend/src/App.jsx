import { useEffect, useState } from 'react'
import { BrowserProvider, Contract, JsonRpcProvider, ZeroAddress, isAddress } from 'ethers'
import { ABI, CHAIN_ID, CONTRACT_ADDRESS, RPC_URL, isConfigured } from './config/contract'
import { errorMessage, formatDate, shortAddress } from './lib/warranty'
import './App.css'

function App() {
  const [account, setAccount] = useState('')
  const [notice, setNotice] = useState('')
  const [token, setToken] = useState('')
  const [record, setRecord] = useState(null)
  const [claimRecord, setClaimRecord] = useState(null)
  const [busy, setBusy] = useState(false)

  const read = () => new Contract(CONTRACT_ADDRESS, ABI, new JsonRpcProvider(RPC_URL))
  const walletProvider = async () => {
    if (!window.ethereum) throw Error('MetaMask is not installed.')
    const provider = new BrowserProvider(window.ethereum)
    const network = await provider.getNetwork()
    if (Number(network.chainId) !== CHAIN_ID) {
      throw Error(`Wrong network in MetaMask. Select chain ID ${CHAIN_ID}, then try again.`)
    }
    return provider
  }
  const signer = async () => {
    if (!isConfigured) throw Error('Deploy locally and run pnpm sync:frontend <address>.')
    return new Contract(CONTRACT_ADDRESS, ABI, await (await walletProvider()).getSigner())
  }
  const run = async (work, success) => {
    try {
      setBusy(true)
      setNotice('Waiting for confirmation…')
      const tx = await work()
      const receipt = await tx.wait()
      setNotice(typeof success === 'function' ? success(receipt) : success)
    } catch (e) {
      setNotice(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  const verify = async (e) => {
    e.preventDefault()
    try {
      const c = read()
      const id = BigInt(token)
      if (id < 1n) throw Error('Enter a token ID of 1 or higher.')
      const supply = await c.totalSupply()
      if (id > supply) throw Error(`Token #${id} does not exist yet. Mint a warranty first, then verify it here.`)
      const [product, owner, active, claims] = await Promise.all([
        c.getProduct(id),
        c.ownerOf(id),
        c.isWarrantyActive(id),
        c.getClaimsForToken(id),
      ])
      setRecord({ id, product, owner, active, claims })
      setNotice('')
    } catch (e) {
      setRecord(null)
      setNotice(errorMessage(e))
    }
  }
  const viewClaim = async (e) => {
    e.preventDefault()
    try {
      const form = new FormData(e.currentTarget)
      const id = BigInt(form.get('claimLookup'))
      if (id < 1n) throw Error('Enter a claim ID of 1 or higher.')
      const claim = await read().getClaim(id)
      setClaimRecord({ id, claim })
      setNotice('')
    } catch (e) {
      setClaimRecord(null)
      setNotice(errorMessage(e))
    }
  }
  const connect = async () => {
    try {
      await walletProvider()
      const a = await window.ethereum.request({ method: 'eth_requestAccounts' })
      setAccount(a[0] || '')
      setNotice(`Wallet connected on chain ${CHAIN_ID}.`)
    } catch (e) {
      setNotice(errorMessage(e))
    }
  }

  useEffect(() => {
    if (!window.ethereum) return
    const changed = (a) => setAccount(a[0] || '')
    window.ethereum.on('accountsChanged', changed)
    return () => window.ethereum.removeListener('accountsChanged', changed)
  }, [])

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="WarrantyChain home">
          <span className="brand-mark">W</span>
          <span>Warranty<span className="brand-accent">Chain</span></span>
        </a>
        <div className="network-status"><span className="status-dot" /> Local network · {CHAIN_ID}</div>
        <button className="wallet-button" onClick={connect}>
          <span className="wallet-icon">◈</span>
          {account ? shortAddress(account) : 'Connect wallet'}
        </button>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Ownership, verified on-chain</p>
          <h1>Warranty records that travel with the product.</h1>
          <p className="hero-description">A transparent home for product warranties. Mint a durable record, transfer it with ownership, and keep every claim visible.</p>
          <div className="hero-stats">
            <span><strong>01</strong> Verify instantly</span>
            <span><strong>02</strong> Transfer securely</span>
            <span><strong>03</strong> Resolve fairly</span>
          </div>
        </div>
        <div className="hero-orbit" aria-hidden="true"><span className="orbit-core">W</span><span className="orbit-ring ring-one" /><span className="orbit-ring ring-two" /></div>
      </section>

      {!isConfigured && <p className="notice warning"><span>!</span> Contract not configured. Start a node, deploy, then run <code>pnpm sync:frontend &lt;address&gt;</code>.</p>}
      {notice && <div className="dialog-backdrop" role="presentation">
        <section className="info-dialog" role="dialog" aria-modal="true" aria-labelledby="notice-title">
          <button className="dialog-close" type="button" onClick={() => setNotice('')} aria-label="Close dialog">×</button>
          <span className="dialog-icon">✓</span>
          <p className="section-kicker">Transaction update</p>
          <h2 id="notice-title">WarrantyChain</h2>
          <p className="dialog-message">{notice}</p>
          <button className="primary-button dialog-action" type="button" onClick={() => setNotice('')}>Continue</button>
        </section>
      </div>}

      <section className="panel verification-panel">
        <div className="panel-heading"><div><p className="section-kicker">Open ledger</p><h2>Public warranty verification</h2></div><span className="panel-number">01</span></div>
        <p className="panel-intro">Enter a token ID to inspect its product details, current owner, expiry, and claim history.</p>
        <form className="inline-form" onSubmit={verify}>
          <label>Token ID<input required value={token} onChange={(e) => setToken(e.target.value)} placeholder="e.g. 1" /></label>
          <button disabled={busy}>Verify on-chain <span>↗</span></button>
        </form>
        {record && <Card item={record} />}
      </section>

      <section className="action-grid">
        <section className="panel action-panel customer-panel">
          <div className="panel-heading"><div><p className="section-kicker">For customers</p><h2>Manage your warranty</h2></div><span className="panel-number">02</span></div>
          <p className="panel-intro">Transfer an owned warranty or submit a claim directly from your connected wallet.</p>
          <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const to = f.get('to'); if (!isAddress(to) || to === ZeroAddress) return setNotice('Use a valid nonzero recipient.'); run(async () => (await signer())['safeTransferFrom(address,address,uint256)'](account, to, BigInt(f.get('id'))), 'Warranty transferred.') }}>
            <div className="form-title"><span className="form-icon">↗</span><span>Transfer ownership</span></div>
            <label>Token ID<input name="id" required placeholder="Token number" /></label>
            <label>Recipient address<input name="to" required placeholder="0x..." /></label>
            <button className="secondary-button" disabled={busy}>Transfer warranty</button>
          </form>
          <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(async () => (await signer()).submitClaim(BigInt(f.get('id')), f.get('description')), (receipt) => { const event = receipt.logs.map((log) => { try { return new Contract(CONTRACT_ADDRESS, ABI).interface.parseLog(log) } catch { return null } }).find((parsed) => parsed?.name === 'ClaimSubmitted'); return event ? `Claim #${event.args.claimId.toString()} submitted successfully.` : 'Claim submitted successfully.' }) }}>
            <div className="form-title"><span className="form-icon">+</span><span>Open a claim</span></div>
            <label>Token ID<input name="id" required placeholder="Token number" /></label>
            <label>Claim description<input name="description" required placeholder="What needs attention?" /></label>
            <button className="secondary-button" disabled={busy}>Submit claim</button>
          </form>
        </section>

        <section className="panel action-panel manufacturer-panel">
          <div className="panel-heading"><div><p className="section-kicker">For manufacturers</p><h2>Issue & resolve</h2></div><span className="panel-number">03</span></div>
          <p className="panel-intro">Create a new warranty NFT and keep the customer journey moving with claim updates.</p>
          <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(async () => (await signer()).registerProduct(f.get('recipient'), f.get('name'), f.get('model'), f.get('serial'), BigInt(f.get('days')) * 86400n, f.get('uri')), (receipt) => { const event = receipt.logs.map((log) => { try { return new Contract(CONTRACT_ADDRESS, ABI).interface.parseLog(log) } catch { return null } }).find((parsed) => parsed?.name === 'ProductRegistered'); return event ? `Warranty NFT #${event.args.tokenId.toString()} minted successfully.` : 'Warranty NFT minted successfully.' }) }}>
            <div className="form-title"><span className="form-icon">✦</span><span>Register a product</span></div>
            <div className="field-grid">{[['recipient', 'Customer address'], ['name', 'Product name'], ['model', 'Model'], ['serial', 'Unique serial'], ['days', 'Warranty days'], ['uri', 'Metadata URI (optional)']].map(([n, l]) => <label key={n}>{l}<input name={n} required={n !== 'uri'} placeholder={n === 'recipient' ? '0x...' : l} /></label>)}</div>
            <button className="primary-button" disabled={busy}>Register & mint <span>↗</span></button>
          </form>
          <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(async () => (await signer()).updateClaimStatus(BigInt(f.get('claim')), Number(f.get('status'))), 'Claim status updated.') }}>
            <div className="form-title"><span className="form-icon">✓</span><span>Update a claim</span></div>
            <div className="field-grid two-fields"><label>Claim ID<input name="claim" required placeholder="Claim number" /></label><label>Status<select name="status"><option value="1">Approved</option><option value="2">Rejected</option><option value="3">Resolved</option></select></label></div>
            <button className="secondary-button" disabled={busy}>Update claim</button>
          </form>
          <form onSubmit={viewClaim}>
            <div className="form-title"><span className="form-icon">⌕</span><span>View a claim</span></div>
            <div className="inline-form claim-lookup"><label>Claim ID<input name="claimLookup" required placeholder="Claim number" /></label><button className="secondary-button" disabled={busy}>View claim</button></div>
          </form>
          {claimRecord && <ClaimCard item={claimRecord} />}
        </section>
      </section>
      <footer><span>WarrantyChain</span><span>Built for transparent ownership</span><span>Chain ID {CHAIN_ID}</span></footer>
    </main>
  )
}

function Card({ item }) {
  const p = item.product
  return <article className="record-card"><div className="record-topline"><span className={`record-status ${item.active ? 'active' : 'expired'}`}><span />{item.active ? 'Active warranty' : 'Expired warranty'}</span><span className="record-id">NFT #{item.id.toString()}</span></div><h3>{p.name} <small>{p.model}</small></h3><div className="record-details"><span><small>Serial number</small>{p.serialNumber}</span><span><small>Current owner</small>{shortAddress(item.owner)}</span><span><small>Valid until</small>{formatDate(p.warrantyExpiry)}</span><span><small>Claims filed</small>{item.claims.length}</span></div></article>
}

function ClaimCard({ item }) {
  const claim = item.claim
  const statuses = ['Pending', 'Approved', 'Rejected', 'Resolved']
  const status = statuses[Number(claim.status)] || 'Unknown'
  return <article className="claim-card"><div className="record-topline"><span className={`claim-status ${status.toLowerCase()}`}>{status}</span><span className="record-id">Claim #{item.id.toString()}</span></div><p className="claim-description">“{claim.description}”</p><div className="claim-meta"><span><small>Warranty NFT</small>#{claim.tokenId.toString()}</span><span><small>Submitted</small>{formatDate(claim.submittedAt)}</span><span><small>Last updated</small>{formatDate(claim.updatedAt)}</span></div></article>
}

export default App
