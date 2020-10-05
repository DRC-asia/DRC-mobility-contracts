pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Pausable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";

contract DreamCarToken is ERC20Detailed, ERC20Pausable, ERC20Burnable {
    /**
     * @dev constructor to mint initial tokens
     * @param name string
     * @param symbol string
     * @param decimals uint8
     * @param initialSupply uint256
     */
    constructor(
        string name,
        string symbol,
        uint8 decimals,
        uint256 initialSupply
    ) public ERC20Detailed(name, symbol, decimals) {
        // Mint the initial supply
        require(initialSupply > 0, "initialSupply must be greater than zero.");
        _mint(msg.sender, initialSupply * (10**uint256(decimals)));
    }
}
