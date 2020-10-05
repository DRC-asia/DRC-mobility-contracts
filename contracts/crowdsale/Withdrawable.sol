pragma solidity ^0.4.24;


import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";


/**
 * @title Withdrawable
 * @dev Safe withdrawal pattern
 */
contract Withdrawable {

  event TokenWithdraw(address token, address indexed sendTo, uint256 amount);
  event EtherWithdraw(address indexed sendTo, uint256 amount);

  /**
   * @dev Withdraws any kind of ERC20 compatible token
   * @param token ERC20 The address of the token contract
   * @param amount uint256 Amount of the token to be withdrawn
   */
  function _withdrawToken(address token, uint256 amount) internal {

    require(ERC20(token).transfer(msg.sender, amount));
    emit TokenWithdraw(token, msg.sender, amount);
  }

  /**
   * @dev Withdraw ether
   * @param amount uint256 Amount of ether to be withdrawn
   */
  function _withdrawEther(uint256 amount) internal {
    msg.sender.transfer(amount);
    emit EtherWithdraw(msg.sender, amount);
  }
}