import { TokenView } from './token-view'

export default async function TokenPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params
  return <TokenView address={address} />
}
