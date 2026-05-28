export interface TransactionRecord {
  txHash: string
  txType: number | string
  txTime: number | string
  confirmFlag: number
  fee: string | number
  height: number
  blockIndex: number
  transfers: TransactionTransfer[]
  [key: string]: unknown
}

export interface TransactionTransfer {
  fromAddress: string
  toAddress: string
  amount: string | number
  assetName: string
  [key: string]: unknown
}

export interface TransactionGroup {
  date: string
  transactions: TransactionRecord[]
}
