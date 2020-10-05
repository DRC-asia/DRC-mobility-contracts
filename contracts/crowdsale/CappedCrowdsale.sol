pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Crowdsale.sol";
import "../accessControl/AdminRole.sol";


/**
 * @title CappedCrowdsale 
 * @dev Crowdsale capped indiviually and totally
 */
contract CappedCrowdsale is Crowdsale, AdminRole {
  using SafeMath for uint256;

  mapping(address => uint256) private _contributions;
  uint256 private _totalSaleCap;
  uint256 private _maxIndividualCap;
  uint256 private _minIndividualCap;

  event IndividualCapsSet(uint256 minCap, uint256 maxCap);


  constructor(uint256 totalSaleCap) internal {
    require(totalSaleCap > 0);
    _totalSaleCap = totalSaleCap;
    // No indiviual caps for the deployment time
    _maxIndividualCap = ~uint256(0);
    _minIndividualCap = 0;
  }

  /**
   * @dev Sets a specific beneficiary's maximum contribution.
   * @param minCap Minimum wei limit for individual contribution
   * @param maxCap Maximum wei limit for individual contribution
   */
  function setIndividualCaps(
    uint256 minCap,
    uint256 maxCap
  )
    external
    onlyAdmin
  {
    _minIndividualCap = minCap;
    _maxIndividualCap = maxCap;

    emit IndividualCapsSet(minCap, maxCap);
  }

  /**
   * @dev Sets total sale cap in wei
   * @param totalSaleCap Sale cap in wei
   */
  function setTotalSaleCap(uint256 totalSaleCap)
    external
    onlyAdmin
  {
    require(totalSaleCap >= 0, "Total sale cannot be negative");
    _totalSaleCap = totalSaleCap;
  }

  /**
   * @dev Returns the total sale cap
   * @return total sale cap
   */
  function getTotalSaleCap()
    public
    view
    returns (uint256)
  {
    return _totalSaleCap;
  }

  /**
   * @dev Checks whether the total sale cap has been reached.
   * @return Whether the cap was reached
   */
  function isTotalSaleCapReached()
    public
    view
    returns (bool) 
  {
    return weiRaised() >= _totalSaleCap;
  }

  /**
   * @dev Returns the individual caps
   * @return individual caps
   */
  function getIndividualCaps()
    public
    view
    returns (uint256, uint256)
  {
    return (_minIndividualCap, _maxIndividualCap);
  }

  /**
   * @dev Returns the amount contributed so far by a specific beneficiary.
   * @param beneficiary Address of contributor
   * @return Beneficiary contribution so far
   */
  function getContribution(address beneficiary)
    public
    view
    returns (uint256)
  {
    return _contributions[beneficiary];
  }

  /**
   * @dev Extend parent behavior requiring purchase to respect the beneficiary's funding cap.
   * @param beneficiary Token purchaser
   * @param weiAmount Amount of wei contributed
   */
  function _preValidatePurchase(
    address beneficiary,
    uint256 weiAmount
  )
    internal
    view
  {
    super._preValidatePurchase(beneficiary, weiAmount);
    require(weiRaised().add(weiAmount) <= _totalSaleCap);
    require(weiAmount >= _minIndividualCap);
    require(_contributions[beneficiary].add(weiAmount) <= _maxIndividualCap);
  }

  /**
   * @dev Extend parent behavior to update beneficiary contributions
   * @param beneficiary Token purchaser
   * @param weiAmount Amount of wei contributed
   */
  function _updatePurchasingState(
    address beneficiary,
    uint256 weiAmount
  )
    internal
  {
    super._updatePurchasingState(beneficiary, weiAmount);
    _contributions[beneficiary] = _contributions[beneficiary].add(weiAmount);
  }
}
