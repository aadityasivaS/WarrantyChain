import { Link } from 'react-router-dom'

const portals = [
  { to: '/customer', number: '01', title: 'Customer portal', text: 'Manage owned warranties, submit claims, and transfer products securely.', action: 'Enter customer portal' },
  { to: '/manufacturer', number: '02', title: 'Manufacturer portal', text: 'Register products, issue warranties, and coordinate claim resolution.', action: 'Enter manufacturer portal' },
  { to: '/service', number: '03', title: 'Service portal', text: 'Verify eligible warranties and record completed repairs on-chain.', action: 'Enter service portal' },
]

export default function Home() {
  return (
    <main className="home-page">
      <nav className="home-nav" aria-label="Primary navigation">
        <Link className="brand" to="/">
          <span className="brand-mark">W</span>
          <span>Warranty<span className="brand-accent">Chain</span></span>
        </Link>
        <Link className="home-nav-link" to="/verify">Verify a warranty</Link>
      </nav>

      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="home-kicker"><span /> Product protection, verified on-chain</p>
          <h1>Ownership and warranty records that stay with the product.</h1>
          <p className="home-lede">WarrantyChain creates a transparent record for every product, ownership change, claim, and authorized repair—without changing who owns the journey.</p>
          <div className="home-actions">
            <Link className="primary home-primary" to="/verify">Verify warranty</Link>
            <Link className="secondary home-secondary" to="/customer">Open customer portal</Link>
          </div>
        </div>
        <div className="home-ledger" aria-hidden="true">
          <div className="ledger-top"><span>Warranty record</span><span className="ledger-live">Verified</span></div>
          <div className="ledger-token">NFT</div>
          <div className="ledger-lines"><span /><span /><span /></div>
          <div className="ledger-footer"><span>Ownership</span><span>Claims</span><span>Service</span></div>
        </div>
      </section>

      <section className="portal-section" aria-labelledby="portal-heading">
        <div className="portal-heading">
          <div>
            <p className="home-kicker">Choose your workspace</p>
            <h2 id="portal-heading">Three portals. One trusted record.</h2>
          </div>
          <p>Connect with the wallet that holds the relevant ownership or contract authorization.</p>
        </div>
        <div className="portal-grid">
          {portals.map((portal) => (
            <Link className="portal-card" to={portal.to} key={portal.to}>
              <span className="portal-number">{portal.number}</span>
              <h3>{portal.title}</h3>
              <p>{portal.text}</p>
              <span className="portal-action">{portal.action} <b>↗</b></span>
            </Link>
          ))}
        </div>
      </section>

      <footer className="home-footer"><span>WarrantyChain</span><span>Blockchain-backed product protection</span></footer>
    </main>
  )
}
