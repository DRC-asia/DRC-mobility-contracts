const DreamCarToken = artifacts.require("./DreamCarToken.sol");
const DreamCarCrowdsale = artifacts.require("./DreamCarCrowdsale.sol");
const DreamCarAirdrop = artifacts.require("./DreamCarAirdrop.sol");

const name = "DreamCar";
const symbol = "DRC";
const decimals = 18;
const initialSupply = 1000000000;

// TODO: Change this parameters in mainnet deployment
const rate = 21935; // 1 ETH = 21,935.9375 DREAM_CAR token
const totalSaleCap = 2279 * Math.pow(10, 18); // 2,279.36463 ETH
const wallet = process.env.FUND_COLLECTOR_ADDRESS;

/************* DREAM_CAR Token deployed information ***************/

// Mainnet - Ethereum
// @see https://etherscan.io/token/0x???
const DREAM_CAR_TOKEN_ADDRESS_MAINNET =
  "0x4a75602789c382f0b5e24f22310c27ef39feaa6d";

// Ropsten - Ethereum
// @see https://rinkeby.etherscan.io/token/0xd97243b693c3173b165e975fc0bc1590e6acee15
const DREAM_CAR_TOKEN_ADDRESS_RINKEBY =
  "0x975fc0bc1596acee15d97243b693c3173b165e0e";

// Mainnet - Klaytn
// @see https://baobab.klaytnscope.com/account/0x
const DREAM_CAR_TOKEN_ADDRESS_CYPRESS = "";

// Baobab - Klaytn
// @see https://baobab.klaytnscope.com/account/0xe0e047204b6cf09ca49f8b318053cc81c996bf53
const DREAM_CAR_TOKEN_ADDRESS_BAOBAB =
  "0xe0e047204b6cf09ca49f18053cc81c996bf538b3";

// Deployer
const TokenContractDeployer = (deployer, network) => {
  if (
    network === "ropsten" ||
    network === "baobab" || // TestNet
    network === "mainnet" ||
    network === "cypress"
  ) {
    // MainNet
    deployer
      .deploy(DreamCarToken, name, symbol, decimals, initialSupply)
      .then((_) =>
        console.log(
          "DREAM_CAR Token contract has been deployed successfully. DreamCarToken.address =" +
            DreamCarToken.address
        )
      );
  } else {
    throw new Error("Unknown network!");
  }
};

/*************************************************************/

/************* DREAM_CAR Crowdsale deployed information ***************/

// Mainnet - Ethereum
// @see https://etherscan.io/0x
// const DREAM_CAR_CROWDSALE_ADDRESS = '';

// Ropsten - Ethereum
// @see https://rinkeby.etherscan.io/0xb0eb24ce9b029a9e771a7878c7983e1d06f5895d
// const DREAM_CAR_CROWDSALE_ADDRESS = '0xe9b029a9e771a7878c7983e1d06f5895db0eb24c';

// Deployer
const SaleContractDeployer = (deployer, network) => {
  deployer
    .deploy(
      DreamCarCrowdsale,
      rate,
      wallet,
      getTokenAddress(network),
      totalSaleCap
    )
    .then((_) =>
      console.log(
        `DREAM_CAR Crowdsale contract has been deployed successfully on ${network}.`
      )
    );
};

function getTokenAddress(network) {
  switch (network) {
    case "mainnet":
      return DREAM_CAR_TOKEN_ADDRESS_MAINNET;
    case "ropsten":
      return DREAM_CAR_TOKEN_ADDRESS_ROPSTEN;
    case "baobab":
      return DREAM_CAR_TOKEN_ADDRESS_BAOBAB;
    case "cypress":
      return DREAM_CAR_TOKEN_ADDRESS_CYPRESS;
    default:
      throw new Error("Unknown network!");
  }
}

/************* DREAM_CAR Airdrop deployed information ***************/

// Baobab - Klaytn
// const DREAM_CAR_AIRDROP_ADDRESS = '0x84b148d389a94bf97abba8bf04bc4b0f33355418';

// Deployer
const AirdropContractDeployer = (deployer, network) => {
  deployer
    .deploy(DreamCarAirdrop, getTokenAddress(network))
    .then((_) =>
      console.log(
        `DREAM_CAR Airdrop contract has been deployed successfully on ${network}.`
      )
    );
};

/*****************************************************************/

module.exports = (deployer, network) => {
  /**
   * Token contract deploy.
   */
  TokenContractDeployer(deployer, network);

  /**
   * Sale contract deploy.
   */
  // SaleContractDeployer(deployer, network);

  /**
   * Sale contract deploy.
   */
  // AirdropContractDeployer(deployer, network);
};
