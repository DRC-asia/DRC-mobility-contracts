pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "./Crowdsale.sol";
import "./CappedCrowdsale.sol";
import "./PhasedCrowdsale.sol";
import "./Withdrawable.sol";
import "./Lockable.sol";
import "../accessControl/Whitelisted.sol";

contract DreamCarCrowdsale is
    Crowdsale,
    CappedCrowdsale,
    PhasedCrowdsale,
    Lockable,
    Whitelisted,
    Withdrawable
{
    using SafeMath for uint256;

    bytes32 internal constant _REASON_VESTING_1ST_PARTY = "vesting_1st_party";
    bytes32 internal constant _REASON_VESTING_2ND_PARTY = "vesting_2nd_party";
    bytes32 internal constant _REASON_VESTING_3RD_PARTY = "vesting_3rd_party";
    bytes32 internal constant _REASON_VESTING_4TH_PARTY = "vesting_4th_party";
    bytes32 internal constant _REASON_BONUS = "bonus";
    mapping(bytes32 => uint256) internal lockPeriods;

    constructor(
        uint256 rate,
        address wallet,
        IERC20 token,
        uint256 totalSaleCap
    )
        public
        Crowdsale(rate, wallet, token)
        CappedCrowdsale(totalSaleCap)
        Lockable(token)
    {
        // TODO: Fix the lock periods!!!
        lockPeriods[_REASON_BONUS] = 1559358000; // 2019/06/01, 12:00 PM, GMT+9
        lockPeriods[_REASON_VESTING_1ST_PARTY] = 1583031600; // 2020/03/01, 12:00 PM, GMT+9
        lockPeriods[_REASON_VESTING_2ND_PARTY] = 1593572400; // 2020/07/01, 12:00 PM, GMT+9
        lockPeriods[_REASON_VESTING_3RD_PARTY] = 1604199600; // 2020/09/01, 12:00 PM, GMT+9
        lockPeriods[_REASON_VESTING_4TH_PARTY] = 1614567600; // 2021/03/01, 12:00 PM, GMT+9
    }

    /**
     * @dev Used for testnet deployments
     * @param periods Lock periods
     */
    function setLockPeriods(uint256[] periods) external onlyAdmin {
        // TODO: Check for dates in the past
        lockPeriods[_REASON_BONUS] = periods[0];
        lockPeriods[_REASON_VESTING_1ST_PARTY] = periods[1];
        lockPeriods[_REASON_VESTING_2ND_PARTY] = periods[2];
        lockPeriods[_REASON_VESTING_3RD_PARTY] = periods[3];
        lockPeriods[_REASON_VESTING_4TH_PARTY] = periods[4];
    }

    /**
     * @dev Sets fund collector address
     * @param wallet New fund collector address
     */
    function setWallet(address wallet) public onlyAdmin {
        _setWallet(wallet);
    }

    /**
     * @dev Withdraw ether
     * @param amount uint256 Amount of ether to be withdrawn
     */
    function withdrawEther(uint256 amount) public onlyAdmin {
        _withdrawEther(amount);
    }

    /**
     * @dev Withdraws any kind of ERC20 compatible token
     * @param amount uint256 Amount of the token to be withdrawn
     */
    function withdrawToken(uint256 amount) public onlyAdmin {
        require(
            token().balanceOf(address(this)) >=
                getTotalLockedAmount().add(amount),
            "Insufficient token balance!"
        );
        _withdrawToken(address(token()), amount);
    }

    /**
     * @dev Locks a specified amount of tokens,
     *      for a specified reason and time
     * @param to list of addresses to which tokens are to be transfered
     * @param reason List of reasons to lock tokens
     * @param amount List of amount of tokens to be locked
     * @param time List of lock expiration times in seconds (unix epoch time)
     */
    function lock(
        address[] to,
        bytes32[] reason,
        uint256[] amount,
        uint256[] time
    ) external onlyAdmin {
        for (uint256 i = 0; i < to.length; i++) {
            _lock(to[i], reason[i], amount[i], time[i]);
        }
    }

    /**
     * @dev Locks sale tokens manually for the purchases done through thirdparty ICO platforms
     * @param beneficiaries address to which tokens are to be transfered
     * @param tokenAmounts Number of tokens to be transfered
     * @param bonusAmounts Bonus tokens for the purchase to be locked
     * @param bonusExpiry Expiry date of bonus tokens to be locked
     */
    function deliverPurchasedTokensManually(
        address[] beneficiaries,
        uint256[] tokenAmounts,
        uint256[] bonusAmounts,
        uint256 bonusExpiry
    ) external onlyAdmin {
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            // Check if the contract has enough tokens which are not locked
            require(
                token().balanceOf(address(this)) >=
                    getTotalLockedAmount().add(tokenAmounts[i]),
                "Insufficient token balance!"
            );
            // Send the purchased tokens immediately
            require(
                token().transfer(beneficiaries[i], tokenAmounts[i]),
                "Token transfer failed"
            );

            if (bonusAmounts[i] > 0) {
                _lock(
                    beneficiaries[i],
                    _REASON_BONUS,
                    bonusAmounts[i],
                    bonusExpiry
                );
            }
        }
    }

    /**
     * @dev Increase number of tokens locked for a specified reason against an address
     * @param to Adress to which tokens are to be transfered
     * @param reason The reason to lock tokens
     * @param amount Number of tokens to be increased
     */
    function increaseLockAmount(
        address to,
        bytes32 reason,
        uint256 amount
    ) public onlyAdmin {
        _increaseLockAmount(to, reason, amount);
    }

    /**
     * @dev Adjust lock period for an address and a specified reason
     * @param to Address of the token receiver
     * @param reason The reason that tokens locked previously
     * @param time New date the lock expires
     */
    function adjustLockPeriod(
        address to,
        bytes32 reason,
        uint256 time
    ) public onlyAdmin {
        _adjustLockPeriod(to, reason, time);
    }

    /**
     * @dev The order of the accounts and the token amounts should be same
     * @param dedicatedAccounts Address list to be vested for
     * @param dedicatedTokens List of token amounts to be vested per each vesting party for
     */
    function vestDedicatedTokens(
        address[] dedicatedAccounts,
        uint256[] dedicatedTokens
    ) external onlyAdmin {
        for (uint256 i = 0; i < dedicatedAccounts.length; i++) {
            _vestToken(dedicatedAccounts[i], dedicatedTokens[i]);
        }
    }

    /**
     * @dev Unlocks the tokens for the provided addresses
     *      only for the locks of which the validity expired
     * @param accounts List of addresses that the tokens to be unlocked
     */
    function releaseTokens(address[] accounts) external {
        for (uint256 i = 0; i < accounts.length; i++) {
            unlock(accounts[i]);
        }
    }

    /**
     * @dev Vests the given amount of tokens for the given beneficiary
     *      Vesting occurs in four parties each having different
     *      vesting period with the same amount provided by `tokenAmount`.
     * @param beneficiary Address that the tokens to be vested for
     * @param tokenAmount Amount of tokens to be vested
     */
    function _vestToken(address beneficiary, uint256 tokenAmount) internal {
        _lock(
            beneficiary,
            _REASON_VESTING_1ST_PARTY,
            tokenAmount,
            lockPeriods[_REASON_VESTING_1ST_PARTY]
        );

        _lock(
            beneficiary,
            _REASON_VESTING_2ND_PARTY,
            tokenAmount,
            lockPeriods[_REASON_VESTING_2ND_PARTY]
        );

        _lock(
            beneficiary,
            _REASON_VESTING_3RD_PARTY,
            tokenAmount,
            lockPeriods[_REASON_VESTING_3RD_PARTY]
        );

        _lock(
            beneficiary,
            _REASON_VESTING_4TH_PARTY,
            tokenAmount,
            lockPeriods[_REASON_VESTING_4TH_PARTY]
        );
    }

    /**
     * @dev Extend parent behavior requiring to be within contributing period
     * @param beneficiary Address performing the token purchase
     * @param weiAmount Value in wei involved in the purchase
     */
    function _preValidatePurchase(address beneficiary, uint256 weiAmount)
        internal
        view
        onlyWhitelisted
    {
        super._preValidatePurchase(beneficiary, weiAmount);
    }

    /**
     * @dev Transfers and locks purchased and bonus tokens.
     *      Amount of bonus tokens are calculated with the
     *      bonus rate of the current phase
     * @param beneficiary Address performing the token purchase
     * @param tokenAmount Number of tokens to be emitted
     */
    function _deliverTokens(address beneficiary, uint256 tokenAmount) internal {
        // Get the bonus rate for the current phase and calculate the bonus tokens
        uint256 bonusAmount = _calculateBonus(tokenAmount, phaseBonusRate());
        _deliverPurchasedTokens(beneficiary, tokenAmount, bonusAmount);
    }

    /**
     * @dev Override to extend the way in which ether is converted to tokens.
     * @param weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified _weiAmount
     */
    function _getTokenAmount(uint256 weiAmount)
        internal
        view
        returns (uint256)
    {
        return weiAmount.mul(rate());
    }

    /**
     * @param tokenAmount Token amount to be invested
     * @param bonusRate Bonus rate in percentage multiplied by 100
     */
    function _calculateBonus(uint256 tokenAmount, uint256 bonusRate)
        private
        pure
        returns (uint256)
    {
        return tokenAmount.mul(bonusRate).div(10000);
    }

    /**
     * @dev Locks sale tokens
     * @param beneficiary address to which tokens are to be transfered
     * @param tokenAmount Number of tokens to be transfered and locked
     * @param bonusAmount Bonus amount for the purchase
     */
    function _deliverPurchasedTokens(
        address beneficiary,
        uint256 tokenAmount,
        uint256 bonusAmount
    ) internal {
        // Send the purchased tokens immediately
        require(
            token().transfer(beneficiary, tokenAmount),
            "Token transfer failed"
        );

        // Lock the bonus tokens
        if (tokensLocked(beneficiary, _REASON_BONUS) == 0) {
            _lock(
                beneficiary,
                _REASON_BONUS,
                bonusAmount,
                lockPeriods[_REASON_BONUS]
            );
        } else {
            _increaseLockAmount(beneficiary, _REASON_BONUS, bonusAmount);
        }
    }
}
