import { BaseTrie as Trie } from 'merkle-patricia-tree'
import Common from '@ethereumjs/common'
import { BN, rlp, keccak256, KECCAK256_RLP, baToJSON, bufferToInt } from 'ethereumjs-util'
import { Transaction, TransactionOptions } from '@ethereumjs/tx'
import { BlockHeader } from './header'
import { Blockchain, BlockData, BlockOptions } from './types'

/**
 * An object that represents the block
 */
export class Block {
  public readonly header: BlockHeader
  public readonly transactions: Transaction[] = []
  public readonly txTrie = new Trie()

  private readonly _common: Common

  /**
   * Creates a new block object
   *
   * Please solely use this constructor to pass in block header data
   * and don't modfiy header data after initialization since this can lead to
   * undefined behavior regarding HF rule implemenations within the class.
   *
   * @param data - The block's data.
   * @param options - The options for this block (like the chain setup)
   */
  constructor(
    data: Buffer | [Buffer[], Buffer[], Buffer[]] | BlockData = {},
    options: BlockOptions = {},
  ) {
    // Checking at runtime, to prevent errors down the path for JavaScript consumers.
    if (data === null) {
      data = {}
    }

    let rawTransactions

    if (Buffer.isBuffer(data)) {
      // We do this to silence a TS error. We know that after this statement, data is
      // a [Buffer[], Buffer[], Buffer[]]
      const dataAsAny = rlp.decode(data) as any
      data = dataAsAny as [Buffer[], Buffer[], Buffer[]]
    }

    // Initialize the block header
    if (Array.isArray(data)) {
      this.header = new BlockHeader(data[0], options)
      rawTransactions = data[1]
    } else {
      this.header = new BlockHeader(data.header, options)
      rawTransactions = data.transactions || []
    }
    this._common = this.header._common

    // parse transactions
    for (let i = 0; i < rawTransactions.length; i++) {
      const tx = new Transaction(rawTransactions[i], { common: this._common })
      this.transactions.push(tx)
    }
  }

  get raw(): [Buffer[], Buffer[], Buffer[]] {
    return this.serialize(false)
  }

  /**
   * Produces a hash the RLP of the block
   */
  hash(): Buffer {
    return this.header.hash()
  }

  /**
   * Determines if this block is the genesis block
   */
  isGenesis(): boolean {
    return this.header.isGenesis()
  }

  /**
   * Produces a serialization of the block.
   *
   * @param rlpEncode - If `true`, the returned object is the RLP encoded data as seen by the
   * Ethereum wire protocol. If `false`, a tuple with the raw data of the header, the txs and the
   * uncle headers is returned.
   */
  serialize(): Buffer
  serialize(rlpEncode: true): Buffer
  serialize(rlpEncode: false): [Buffer[], Buffer[], Buffer[]]
  serialize(rlpEncode = true) {
    const raw = [
      this.header.raw,
      this.transactions.map((tx) => tx.raw),
    ]

    return rlpEncode ? rlp.encode(raw) : raw
  }

  /**
   * Generate transaction trie. The tx trie must be generated before the transaction trie can
   * be validated with `validateTransactionTrie`
   */
  async genTxTrie(): Promise<void> {
    for (let i = 0; i < this.transactions.length; i++) {
      const tx = this.transactions[i]
      await this._putTxInTrie(i, tx)
    }
  }

  /**
   * Validates the transaction trie
   */
  validateTransactionsTrie(): boolean {
    if (this.transactions.length) {
      return this.header.transactionsTrie.equals(this.txTrie.root)
    } else {
      return this.header.transactionsTrie.equals(KECCAK256_RLP)
    }
  }

  /**
   * Validates the transactions
   *
   * @param stringError - If `true`, a string with the indices of the invalid txs is returned.
   */
  validateTransactions(): boolean
  validateTransactions(stringError: false): boolean
  validateTransactions(stringError: true): string
  validateTransactions(stringError = false) {
    const errors: string[] = []

    this.transactions.forEach(function (tx, i) {
      const error = tx.validate(true)
      if (error) {
        errors.push(`${error} at tx ${i}`)
      }
    })

    if (!stringError) {
      return errors.length === 0
    }

    return errors.join(' ')
  }

  /**
   * Validates the entire block, throwing if invalid.
   *
   * @param blockchain - the blockchain that this block wants to be part of
   */
  async validate(blockchain: Blockchain): Promise<void> {
    await Promise.all([
      this.genTxTrie(),
      this.header.validate(blockchain),
    ])

    if (!this.validateTransactionsTrie()) {
      throw new Error('invalid transaction trie')
    }

    const txErrors = this.validateTransactions(true)
    if (txErrors !== '') {
      throw new Error(txErrors)
    }
  }


  /**
   * Returns the block in JSON format
   *
   * @see {@link https://github.com/ethereumjs/ethereumjs-util/blob/master/docs/index.md#defineproperties|ethereumjs-util}
   */
  toJSON(labeled: boolean = false) {
    if (labeled) {
      return {
        header: this.header.toJSON(true),
        transactions: this.transactions.map((tx) => tx.toJSON(true)),
      }
    } else {
      return baToJSON(this.raw)
    }
  }

  private async _putTxInTrie(txIndex: number, tx: Transaction) {
    await this.txTrie.put(rlp.encode(txIndex), tx.serialize())
  }
}
