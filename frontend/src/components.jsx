import { Component, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { shortAddress } from './lib/warranty'
import { CHAIN_ID } from './config/contract'
import logoImg from './assets/logo.jpg'

export function Status({ value }) {
  const labels = ['Pending', 'Approved', 'Rejected', 'Resolved']
  const numeric = typeof value === 'number' || typeof value === 'bigint' ? Number(value) : null
  const label = numeric !== null && labels[numeric] ? labels[numeric] : String(value ?? 'Unknown')
  return <span className={`status ${label.toLowerCase()}`}>{label}</span>
}
export function Notice({ type='info', children }) { return children ? <div className={`notice ${type}`}>{children}</div> : null }
export function Empty({ title='Nothing here yet', children }) { return <div className="empty"><strong>{title}</strong><span>{children}</span></div> }
export function ConfirmDialog({ open, title='Confirm transaction', children, confirm='Confirm', busy=false, onConfirm, onClose }) { if(!open)return null; return <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true"><h2>{title}</h2><div className="muted">{children}</div><div className="modal-actions"><button className="secondary" onClick={onClose} disabled={busy}>Cancel</button><button className="primary" onClick={onConfirm} disabled={busy}>{busy?'Pending…':confirm}</button></div></section></div> }

export function Shell({ account, roles, connect, disconnect, mismatched, children }) {
  const [open,setOpen]=useState(false)
  const roleLinks = roles.manufacturer ? manufacturerLinks : roles.service ? serviceLinks : customerLinks
  return <div className="app-layout"><aside className={`sidebar ${open?'open':''}`}><Link className="brand" to={roles.manufacturer?'/manufacturer':roles.service?'/service':'/customer'}><img src={logoImg} alt="WarrantyChain" className="brand-logo" /></Link><div className="nav-label">Workspace</div><nav className="nav" onClick={()=>setOpen(false)}>{roleLinks.map(([to,label,icon])=><NavLink key={to} to={to} end={to.endsWith('customer')||to.endsWith('manufacturer')||to.endsWith('service')}><span className="nav-icon">{icon}</span>{label}</NavLink>)}</nav><div className="nav-label">Explore</div><nav className="nav"><NavLink to="/verify"><span className="nav-icon">⌕</span>Public verification</NavLink></nav><div className="sidebar-footer"><div className="workspace-role">Active authorization<strong>{roles.manufacturer?'Manufacturer':roles.service?'Service provider':'Customer / wallet owner'}</strong></div><Link className="nav" to="/verify"><span /></Link></div></aside><main className="app-main"><header className="topbar"><button className="secondary mobile-menu" aria-label="Toggle navigation" onClick={()=>setOpen(v=>!v)}>☰</button><div className={`network-pill ${mismatched?'wallet-pill warning':''}`}><span className="dot" />{mismatched?'Wrong network':`Local network · ${CHAIN_ID}`}</div><div className="wallet-pill"><span>{account?shortAddress(account):'Not connected'}</span>{account?<button title="Disconnect wallet" onClick={disconnect}>×</button>:<button onClick={connect}>Connect</button>}</div></header><div className="content">{mismatched&&<Notice type="error">Wrong network. Switch this wallet to chain ID {CHAIN_ID}, then reconnect.</Notice>}{children}</div></main></div>
}
const customerLinks=[['/customer','Overview','◫'],['/customer/products','My products','▦'],['/customer/claims','Claims','!'],['/customer/transfer','Transfer','↗']]
const manufacturerLinks=[['/manufacturer','Overview','◫'],['/manufacturer/products','Products','▦'],['/manufacturer/register','Register product','＋'],['/manufacturer/claims','Claims','!'],['/manufacturer/services','Services','⚒']]
const serviceLinks=[['/service','Overview','◫'],['/service/verify','Verify warranty','⌕'],['/service/records','Repair records','⚒']]
export function PageHeading({ title, description, action }) { return <div className="page-heading"><div><h1>{title}</h1><p>{description}</p></div>{action}</div> }
export function SkeletonGrid(){return <div className="metric-grid">{[1,2,3,4].map(i=><div className="skeleton" key={i}/>)}</div>}

export class AppErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="app-shell">
        <section className="card access">
          <p className="kicker">WarrantyChain</p>
          <h1>This page could not be displayed</h1>
          <p>Something went wrong while rendering this view. Refresh the page and check that your wallet is connected to the configured network.</p>
          <button className="primary" type="button" onClick={() => window.location.reload()}>Reload page</button>
        </section>
      </main>
    )
  }
}
