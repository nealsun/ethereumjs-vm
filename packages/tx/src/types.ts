import Common from '@ethereumjs/common'

/**
 * Any object that can be transformed into a `Buffer`
 */
export interface TransformableToBuffer {
  toBuffer(): Buffer
}

/**
 * A hex string prefixed with `0x`.
 */
export type PrefixedHexString = string

/**
 * A Buffer, hex string prefixed with `0x`, Number, or an object with a toBuffer method such as BN.
 */
export type BufferLike = Buffer | TransformableToBuffer | PrefixedHexString | number

/**
 * A transaction's data.
 */
export interface TxData {

  // from?: BufferLike

  chainId?: BufferLike

  groupId?: BufferLike

  extraData?: BufferLike

  blockLimit?: BufferLike

  /**
   * The transaction's gas limit.
   */
  gasLimit?: BufferLike

  /**
   * The transaction's gas price.
   */
  gasPrice?: BufferLike

  /**
   * The transaction's the address is sent to.
   */
  to?: BufferLike

  /**
   * The transaction's nonce.
   */
  nonce?: BufferLike

  /**
   * This will contain the data of the message or the init of a contract
   */
  data?: BufferLike

  /**
   * EC recovery ID.
   */
  v?: BufferLike

  /**
   * EC signature parameter.
   */
  r?: BufferLike

  /**
   * EC signature parameter.
   */
  s?: BufferLike

  /**
   * The amount of Ether sent.
   */
  value?: BufferLike
}

/**
 * The data of a fake (self-signing) transaction.
 */
export interface FakeTxData extends TxData {
  /**
   * The sender of the Tx.
   */
  from?: BufferLike
}

/**
 * An object to set to which blockchain the blocks and their headers belong. This could be specified
 * using a Common object.
 *
 * Defaults to `mainnet` and the current default hardfork from Common
 */
export interface TransactionOptions {
  /**
   * A Common object defining the chain and the hardfork a transaction belongs to.
   */
  common?: Common
}
