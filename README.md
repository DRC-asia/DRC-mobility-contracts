# dream-car-contracts

nvm use v9.5.0

Smart-contracts for DRC mobility platform

## Deployment - Ethereum

1. First uncomment the deployer function corresponds to the contract you want to deploy and comment out all the others in `migrations/2_dream-car-token.js` file.
2. If the project folder includes `build` folder, first delete it
3. Compile the corresponding contract as follows;
   `truffle compile`
4. Set mnemonic words for deployer in your command line as follows;
   `export MNEMONICS="<mnemonic_words>"`
5. And set your infura project secret key as follows;
   `export INFURA_API_KEY="<infura_project_secret>"`
6. Also set fund collector address as follows;
   `export FUND_COLLECTOR_ADDRESS="<fund_collector_address>"`
7. Finally deploy the contract on the network you desire
   `NETWORK=<network_name> npm run deploy`
   NETWORK=ropsten npm run deploy

   > DreamCarToken.address =0x2a68b2d440debea57174159ee4f9d64fcf18becc

   NETWORK=mainnet npm run deploy

## Test

- In order to run the whole tests
  `truffle test`
- In order to run only specific test file

- test : https://remix.ethereum.org/

## dream car token address

> rospten : 0x2A68b2D440dEbEA57174159eE4F9D64FcF18BeCC
> mainnet : https://etherscan.io/token/0xd7f5cabdf696d7d1bf384d7688926a4bdb092c67
