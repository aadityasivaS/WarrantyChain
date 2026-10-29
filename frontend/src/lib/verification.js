export function verificationUrl(tokenId) {
  const configuredOrigin = import.meta.env.VITE_PUBLIC_APP_URL?.trim().replace(/\/+$/, '')
  return `${configuredOrigin || window.location.origin}/verify/${tokenId}`
}
