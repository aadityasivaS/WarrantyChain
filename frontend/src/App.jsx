import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppErrorBoundary, Shell } from './components'
import './Dashboard.css'
import { WalletProvider, useWallet } from './lib/wallet'
import { CHAIN_ID } from './config/contract'
import PublicLookup from './routes/PublicLookup'
import Home from './routes/Home'
import {
  CustomerClaims, CustomerOverview, CustomerProducts, ManufacturerClaims,
  ManufacturerOverview, ManufacturerProducts, ManufacturerServices, ProductDetails,
  Protected, RegisterProduct, ServiceOverview, ServiceRecords, ServiceVerify, Transfer,
} from './routes/RoleDashboards'

function Workspace({ children }) {
  const wallet = useWallet()
  return <Shell
    account={wallet.account}
    roles={wallet.roles}
    connect={() => wallet.connect().catch((error) => window.alert(error.message))}
    disconnect={wallet.disconnect}
    mismatched={Boolean(wallet.account && wallet.chainId && wallet.chainId !== CHAIN_ID)}
  >{children}</Shell>
}
const guarded = (role, element) => <Protected role={role}><Workspace>{element}</Workspace></Protected>

function AppRoutes() {
  return <Routes>
    <Route path="/verify" element={<PublicLookup />} />
    <Route path="/verify/:tokenId" element={<PublicLookup />} />
    <Route path="/" element={<Home />} />

    <Route path="/customer" element={guarded('customer', <CustomerOverview />)} />
    <Route path="/customer/products" element={guarded('customer', <CustomerProducts />)} />
    <Route path="/products" element={guarded('customer', <CustomerProducts />)} />
    <Route path="/customer/claims" element={guarded('customer', <CustomerClaims />)} />
    <Route path="/customer/transfer" element={guarded('customer', <Transfer />)} />

    <Route path="/manufacturer" element={guarded('manufacturer', <ManufacturerOverview />)} />
    <Route path="/manufacturer/products" element={guarded('manufacturer', <ManufacturerProducts />)} />
    <Route path="/manufacturer/register" element={guarded('manufacturer', <RegisterProduct />)} />
    <Route path="/manufacturer/claims" element={guarded('manufacturer', <ManufacturerClaims />)} />
    <Route path="/manufacturer/services" element={guarded('manufacturer', <ManufacturerServices />)} />

    <Route path="/service" element={guarded('service', <ServiceOverview />)} />
    <Route path="/service/verify" element={guarded('service', <ServiceVerify />)} />
    <Route path="/service/records" element={guarded('service', <ServiceRecords />)} />

    <Route path="/products/:tokenId" element={<Protected role="customer"><Workspace><ProductDetails /></Workspace></Protected>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}

export default function App() {
  return <AppErrorBoundary><BrowserRouter><WalletProvider><AppRoutes /></WalletProvider></BrowserRouter></AppErrorBoundary>
}
