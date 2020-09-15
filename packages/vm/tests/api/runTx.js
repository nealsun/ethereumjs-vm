const tape = require('tape')
const ethUtil = require('ethereumjs-util')
const Transaction = require('@ethereumjs/tx').Transaction
const { DefaultStateManager } = require('../../dist/state')
const runTx = require('../../dist/runTx').default
const VM = require('../../dist/index').default
const { createAccount } = require('./utils')
const Common = require('@ethereumjs/common').default

function setup(vm = null) {
  if (vm === null) {
    const stateManager = new DefaultStateManager({})
    vm = {
      stateManager,
      emit: (e, val, cb) => {
        cb()
      },
      _emit: (e, val) => new Promise((resolve, reject) => resolve()),
    }
  }

  return {
    vm,
    runTx: runTx.bind(vm),
    putAccount: vm.stateManager.putAccount.bind(vm.stateManager),
  }
}

tape('runTx', (t) => {
  const suite = setup()

  t.test('should fail to run without opts', async (st) => {
    shouldFail(st, suite.runTx(), (e) =>
      st.ok(e.message.includes('invalid input'), 'should fail with appropriate error'),
    )
    st.end()
  })

  t.test('should fail to run without tx', async (st) => {
    shouldFail(st, suite.runTx({}), (e) =>
      st.ok(e.message.includes('invalid input'), 'should fail with appropriate error'),
    )
    st.end()
  })

  t.test('should fail to run without signature', async (st) => {
    const tx = getTransaction(false)
    shouldFail(st, suite.runTx({ tx }), (e) =>
      st.ok(e.message.includes('Invalid Signature'), 'should fail with appropriate error'),
    )
    st.end()
  })

  t.test('should fail without sufficient funds', async (st) => {
    const tx = getTransaction(true)
    shouldFail(st, suite.runTx({ tx }), (e) =>
      st.ok(
        e.message.toLowerCase().includes('enough funds'),
        'error should include "enough funds"',
      ),
    )
    st.end()
  })
})

tape('should run simple tx without errors', async (t) => {
  let vm = new VM()
  const suite = setup(vm)

  const tx = getTransaction(true)
  const caller = tx.getSenderAddress().buf
  const acc = createAccount()

  await suite.putAccount(caller, acc)

  let res = await suite.runTx({ tx })
  t.true(res.gasUsed.gt(0), 'should have used some gas')

  t.end()
})

tape('should fail when account balance overflows (call)', async (t) => {
  const vm = new VM()
  const suite = setup(vm)

  const tx = getTransaction(true, '0x01')

  const caller = tx.getSenderAddress().buf
  const from = createAccount()
  await suite.putAccount(caller, from)

  const to = createAccount('0x00', ethUtil.MAX_INTEGER)
  await suite.putAccount(tx.to.buf, to)

  const res = await suite.runTx({ tx })

  t.equal(res.execResult.exceptionError.error, 'value overflow')
  t.equal(vm.stateManager._checkpointCount, 0)
  t.end()
})

tape('should fail when account balance overflows (create)', async (t) => {
  const vm = new VM()
  const suite = setup(vm)

  const tx = getTransaction(true, '0x01', true)

  const caller = tx.getSenderAddress().buf
  const from = createAccount()
  await suite.putAccount(caller, from)

  const contractAddress = Buffer.from('61de9dc6f6cff1df2809480882cfd3c2364b28f7', 'hex')
  const to = createAccount('0x00', ethUtil.MAX_INTEGER)
  await suite.putAccount(contractAddress, to)

  const res = await suite.runTx({ tx })

  t.equal(res.execResult.exceptionError.error, 'value overflow')
  t.equal(vm.stateManager._checkpointCount, 0)
  t.end()
})

tape('should clear storage cache after every transaction', async (t) => {
  const common = new Common({ chain: 'mainnet', hardfork: 'istanbul' })
  const vm = new VM({ common })
  const privateKey = Buffer.from(
    'e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109',
    'hex',
  )
  /* Code which is deployed here: 
    PUSH1 01
    PUSH1 00
    SSTORE
    INVALID
  */
  const code = '6001600055FE'
  const address = Buffer.from('00000000000000000000000000000000000000ff', 'hex')
  await vm.stateManager.putContractCode(Buffer.from(address, 'hex'), Buffer.from(code, 'hex'))
  await vm.stateManager.putContractStorage(
    address,
    Buffer.from('00'.repeat(32), 'hex'),
    Buffer.from('00'.repeat(31) + '01', 'hex'),
  )
  const tx = new Transaction.fromTxData(
    {
      nonce: '0x00',
      gasPrice: 1,
      gasLimit: 100000,
      to: address,
      chainId: 3,
    },
    common,
  ).sign(privateKey)

  await vm.stateManager.putAccount(tx.getSenderAddress().buf, createAccount())

  await vm.runTx({ tx }) // this tx will fail, but we have to ensure that the cache is cleared

  t.equal(vm.stateManager._originalStorageCache.size, 0, 'storage cache should be cleared')
  t.end()
})

// The following test tries to verify that running a tx
// would work, even when stateManager is not using a cache.
// It fails at the moment, and has been therefore commented.
// Please refer to https://github.com/ethereumjs/ethereumjs-vm/issues/353
/* tape('should behave the same when not using cache', async (t) => {
  const suite = setup()

  const tx = getTransaction(true)
  const acc = createAccount()
  const caller = tx.getSenderAddress().buf
  await suite.putAccount(caller, acc)
  await suite.cacheFlush()
  suite.vm.stateManager.cache.clear()

  shouldFail(t,
    suite.runTx({ tx }),
    (e) => t.equal(e.message, 'test', 'error should be equal to what the mock runCall returns')
  )

  t.end()
}) */

function shouldFail(st, p, onErr) {
  p.then(() => st.fail('runTx didnt return any errors')).catch(onErr)
}

function getTransaction(sign = false, value = '0x00', createContract = false) {
  let to = '0x0000000000000000000000000000000000000000'
  let data = '0x7f7465737432000000000000000000000000000000000000000000000000000000600057'

  if (createContract) {
    to = undefined
    data =
      '0x6080604052348015600f57600080fd5b50603e80601d6000396000f3fe6080604052600080fdfea265627a7a723158204aed884a44fd1747efccba1447a2aa2d9a4b06dd6021c4a3bbb993021e0a909e64736f6c634300050f0032'
  }

  const txParams = {
    nonce: 0,
    gasPrice: 100,
    gasLimit: 90000,
    to,
    value,
    data,
  }

  const tx = Transaction.fromTxData(txParams)

  if (sign) {
    const privateKey = Buffer.from(
      'e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109',
      'hex',
    )
    return tx.sign(privateKey)
  }

  return tx
}
