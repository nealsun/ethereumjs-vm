## FISCO-BCOS系统表结构（rocksdb）


| key | fields |
| ------------------------------ | -------------------------------------------- |
| \_sys\_block\_2\_nonce\_$number     | \_id\_,\_num\_,\_status\_,value                    |
| \_sys\_cns\_$name                 | \_id\_,\_num\_,\_status\_,version,address,abi      |
| \_sys\_config\_$key               | \_id\_,\_num\_,\_status\_,value,enable\_number      |
| \_sys\_consensus\_$name           | \_id\_,\_num\_,\_status\_,type,node\_id,enable\_num  |
| \_sys\_current\_state\_$key <br> (key: current\_id,current\_number,total\_transaction\_count, <br>total\_failed\_transaction\_count)  | \_id\_,\_num\_,\_status\_,value                    |
| \_sys\_hash\_2\_block\_$hash        | \_id\_,\_num\_,\_status\_,value                    |
| \_sys\_number\_2\_hash\_$number     | \_id\_,\_num\_,\_status\_,value                    |
| \_sys\_table\_access\_$table\_name  | \_id\_,\_num\_,\_status\_,address,enable\_num       |
| \_sys\_talbes\_$table\_name        | \_id\_,\_num\_,\_status\_,key\_field,value\_field    |
| \_sys\_tx\_hash\_2\_block\_$hash     | \_id\_,\_num\_,\_status\_,value,index              |

全局维护一个id 保存在\_sys\_current\_state\_current\_id, ENTRY_ID_START = 100000
_status_ 两个状态 正常和删除


## GENESIS初始化 

groupMark=groupId-(nodeid,nodeid,)-consensusType-type-maxtransactions-txgaslimit(-epochSealerNum-epochBlockNumber)

1. block head (number:0 gasUsed:0 sealer:0 timestamp)
2. extradata 用groupmark bytes填充
3. insert \_sys\_number\_2\_hash 0, blockheader.hash 
4. insert \_sys\_config\_,tx\_count\_limit tx\_gas\_limit
5. insert \_sys\_consensus\_,sealer
6. insert \_sys\_hash\_2\_block\_,
7. insert \_sys\_current\_state\_

## Storage State

无mpt的账户存储结构

| key | desc |
| ------------------------------ | -------------------------------------------- |
| ACCOUNT_BALANCE = "balance"    |    余额                                      |
| ACCOUNT_CODE_HASH = "codeHash" |    code hash                                 |
| ACCOUNT_CODE = "code"          |    智能合约字节码                             |
| ACCOUNT_NONCE = "nonce"        |    nonce                                     |
| ACCOUNT_ALIVE = "alive"        |    是否有效                                   |
| ACCOUNT_AUTH_KEY= "auth_key"   |    公钥                                      |
| ACCOUNT_AUTHORITY = "authority"|    权限                                      |
| ACCOUNT_FROZEN = "frozen"      |    冻结                                      |