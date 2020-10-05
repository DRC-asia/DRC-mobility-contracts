var Migrations = artifacts.require("./Migrations.sol");

// Notice that we set a delay before resolving the deployer.deploy() fucntion
// because, the transactions are not immediately available even if they are mined
// at that specific time. Therefore we need to wait a while until the tx is available.
// The delay period is not certain, set by trial!!!
// You do not need to use this delay in testnet deployments.
module.exports = (deployer) => {
    deployer.deploy(Migrations)
        .then(() => Migrations.deployed())
        // .then(registry => new Promise(resolve => setTimeout(() => resolve(registry), 100000)))
        .catch(e => console.log(`Deployer failed. ${e}`));
};
