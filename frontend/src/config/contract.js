import artifact from "../contracts/WarrantyNFT.json";
export const ABI = artifact.abi;
export const CONTRACT_ADDRESS = import.meta.env.VITE_WARRANTY_NFT_ADDRESS || "";
export const RPC_URL = import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545";
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 31337);
export const isConfigured = /^0x(?!0{40})[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS);
