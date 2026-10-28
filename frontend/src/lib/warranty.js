import { Interface } from "ethers";
import { ABI } from "../config/contract";

export const STATUSES = ["Pending", "Approved", "Rejected", "Resolved"];
export const formatDate = (seconds) => new Date(Number(seconds) * 1000).toLocaleString();
export const shortAddress = (value) => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "—";

const contractInterface = new Interface(ABI);

const revertData = (error) => (
  error?.data ||
  error?.info?.error?.data ||
  error?.error?.data ||
  error?.receipt?.revertReason
);

export const errorMessage = (error) => {
  const providerMessage = error?.info?.error?.message || error?.message || ""
  if (providerMessage.toLowerCase().includes("function selector was not recognized")) {
    return "This contract deployment does not include the repair feature. Redeploy WarrantyNFT with --reset, then run pnpm sync:frontend with the new address."
  }
  const data = revertData(error);
  if (typeof data === "string" && data.startsWith("0x")) {
    try {
      const parsed = contractInterface.parseError(data);
      if (parsed) {
        const [first, second] = parsed.args;
        switch (parsed.name) {
          case "AccessControlUnauthorizedAccount":
            return "This wallet is not authorized as a manufacturer or service account.";
          case "DuplicateSerialNumber":
            return "That serial number is already registered.";
          case "RequiredFieldMissing":
            return "Complete all required fields before submitting.";
          case "InvalidWarrantyDuration":
            return "Warranty duration must be greater than zero days.";
          case "InvalidRecipient":
            return "Enter a valid nonzero customer address.";
          case "ProductNotFound":
            return `Warranty token #${first} does not exist on this deployment.`;
          case "WarrantyExpired":
            return `Warranty token #${first} has expired.`;
          case "NotCurrentOwner":
            return `This wallet does not own warranty token #${first}.`;
          case "ClaimNotFound":
            return `Claim #${first} does not exist.`;
          case "InvalidClaimTransition":
            return `That claim status change is not allowed (${first} → ${second}).`;
          case "ERC721NonexistentToken":
            return `Warranty token #${first} does not exist on this deployment.`;
          default:
            return `${parsed.name} rejected the transaction.`;
        }
      }
    } catch {
      // Fall through to ethers' standard error text when the data is not this contract's ABI.
    }
  }
  const message = error?.shortMessage || error?.reason || error?.message;
  if (message?.toLowerCase().includes("no data present") || message?.toLowerCase().includes("require(false)")) {
    return "The transaction was rejected without details. Confirm the connected wallet, token ID, repair category, and configured contract deployment."
  }
  if (message && !message.toLowerCase().includes("unknown custom error")) return message;
  return "Transaction failed."
};
