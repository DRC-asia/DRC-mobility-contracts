function getCurrentTimestamp() {
    return web3.eth.getBlock('latest').timestamp;
}

/**
 * Increase the block time of local EVM manually
 * to mock the real-time block generation
 * 
 * @param {number} duration Time amount in seconds 
 */
async function increaseTime(duration) {
  let {err, res} = await web3.currentProvider.send({
    jsonrpc: '2.0',
    method: 'evm_increaseTime',
    params: [duration],
    id: new Date().getMilliseconds()
  });

  if (!err) {
    await web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_mine',
      params: [],
      id: new Date().getMilliseconds()
    });
  }
};


module.exports = {
    increaseTime,
    getCurrentTimestamp
}