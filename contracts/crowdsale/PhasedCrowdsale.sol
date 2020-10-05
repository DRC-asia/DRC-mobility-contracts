pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Crowdsale.sol";
import "../accessControl/AdminRole.sol";

/**
 * @title PhasedCrowdsale
 * @dev Crowdsale accepting contributions only within 
 *      a time frame which can be repeated over time.
 */
contract PhasedCrowdsale is Crowdsale, AdminRole {
  using SafeMath for uint256;

  uint256 private _phaseIndex;
  uint256 private _phaseStartTime;
  uint256 private _phaseEndTime;
  uint256 private _phaseBonusRate;

  /**
   * @dev Reverts if not in the current phase time range.
   */
  modifier onlyWhilePhaseActive {
    require(isActive());
    _;
  }

  /**
   * @dev Reverts if in the current phase time range.
   */
  modifier onlyWhilePhaseDeactive {
    require(!isActive());
    _;
  }

  constructor() internal {
      _phaseIndex = 0;
      _phaseStartTime = 0;
      _phaseEndTime = 0;
      _phaseBonusRate = 0;
  }

  /**
   * @return phase start time.
   */
  function phaseStartTime() public view returns (uint256) {
    return _phaseStartTime;
  }

  /**
   * @return phase end time.
   */
  function phaseEndTime() public view returns (uint256) {
    return _phaseEndTime;
  }

  /**
   * @return phase bonus rate.
   */
  function phaseBonusRate() public view returns (uint256) {
    return _phaseBonusRate;
  }

  /**
   * @return phase index.
   */
  function phaseIndex() public view returns (uint256) {
    return _phaseIndex;
  }

  /**
   * @return true if the phase is active, false otherwise.
   */
  function isActive() public view returns (bool) {
    // solium-disable-next-line security/no-block-members
    return block.timestamp >= _phaseStartTime && block.timestamp <= _phaseEndTime;
  }

  /**
   * @dev Sets phase variables
   * @param purchaseRate Purchase rate
   * @param startTime Phase start time
   * @param endTime Phase end time
   * @param bonusRate Phase bonus ratei in percentage multiplied by 100
   */
  function setPhase(
    uint256 purchaseRate,
    uint256 startTime,
    uint256 endTime,
    uint256 bonusRate
  )
    public
    onlyAdmin
    onlyWhilePhaseDeactive
  {
    // solium-disable-next-line security/no-block-members
    require(startTime >= block.timestamp);
    require(endTime > startTime);

    super._setRate(purchaseRate);
    _phaseStartTime = startTime;
    _phaseEndTime = endTime;
    _phaseBonusRate = bonusRate;

    _phaseIndex++;
  }

  /**
   * @dev Extend parent behavior requiring to be within contributing period
   * @param beneficiary Token purchaser
   * @param weiAmount Amount of wei contributed
   */
  function _preValidatePurchase(
    address beneficiary,
    uint256 weiAmount
  )
    internal
    onlyWhilePhaseActive
    view
  {
    super._preValidatePurchase(beneficiary, weiAmount);
  }
}
