pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "./accessControl/AdminRole.sol";
import "./crowdsale/Withdrawable.sol";

contract DreamCarAirdrop is Withdrawable, AdminRole {
    /**
     * @dev ERC20 token to be airdropped
     */
    IERC20 private _token;

    constructor(IERC20 token) public {
        setToken(token);
    }

    function getToken() public view returns (address) {
        return address(_token);
    }

    function setToken(IERC20 token) public onlyAdmin {
        _token = token;
    }

    /**
     * @dev Send tokens to airdropees. The order of the airdropees and amounts array should match excatly
     *      which means that airdropees[0] => amounts[0], airdropees[1] => amounts[1] ... airdropees[n] => amounts[n],
     *
     * @param airdropees address[] Address list of airdropees
     * @param amounts uint256[] Amount list of airdrop per airdropee
     */
    function bulkAirdrop(address[] airdropees, uint256[] amounts)
        external
        onlyAdmin
    {
        for (uint256 i = 0; i < airdropees.length; i++) {
            require(
                _token.transfer(airdropees[i], amounts[i]),
                "Transfer failed"
            );
        }
    }

    /**
     * @dev Withdraw ether
     * @param amount uint256 Amount of ether to be withdrawn
     */
    function withdrawEther(uint256 amount) external onlyAdmin {
        _withdrawEther(amount);
    }

    /**
     * @dev Withdraws any kind of ERC20 compatible token
     * @param amount uint256 Amount of the token to be withdrawn
     */
    function withdrawToken(uint256 amount) external onlyAdmin {
        _withdrawToken(address(_token), amount);
    }
}
