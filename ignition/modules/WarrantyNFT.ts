import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
export default buildModule("WarrantyNFTModule", (m) => ({ warrantyNFT: m.contract("WarrantyNFT") }));
