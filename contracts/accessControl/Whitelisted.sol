pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/access/Roles.sol";
import "./AdminRole.sol";

contract Whitelisted is AdminRole {
  using Roles for Roles.Role;

  event AddedToWhitelist(address indexed account);
  event RemovedFromWhitelist(address indexed account);

  Roles.Role private whitelist;


  modifier onlyWhitelisted() {
    require(isWhitelisted(msg.sender));
    _;
  }

  constructor() internal {}

  function isWhitelisted(address account) public view returns (bool) {
    return whitelist.has(account);
  }

  function addToWhitelist(address account) public onlyAdmin {
    whitelist.add(account);
    emit AddedToWhitelist(account);
  }

  function addWhitelist(address[] accounts) external onlyAdmin {
    for (uint i = 0; i < accounts.length; i++) {
      addToWhitelist(accounts[i]);
    }
  }

  function removeFromWhitelist(address account) public onlyAdmin {
    whitelist.remove(account);
    emit RemovedFromWhitelist(account);
  }
}
