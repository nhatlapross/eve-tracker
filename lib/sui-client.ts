import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';

export const suiClient = new SuiJsonRpcClient({
  network: 'testnet',
  url: 'https://fullnode.testnet.sui.io:443',
});

export async function getMarketOrders(objectId: string) {
  try {
    const obj = await suiClient.getObject({
      id: objectId,
      options: { showContent: true },
    });
    return obj;
  } catch {
    return null;
  }
}
