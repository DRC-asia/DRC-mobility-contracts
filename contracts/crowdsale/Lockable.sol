pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";


contract Lockable {
  using SafeMath for uint256;

  /**
    * @dev Reasons why a user's tokens have been locked
    */
  mapping(address => bytes32[]) public lockReason;

  /**
   * @dev locked token structure
   */
  struct lockToken {
    uint256 amount;
    uint256 validity;
    bool claimed;
  }

  /**
   * @dev Holds number & validity of tokens locked for a given reason for
   *      a specified address
   */
  mapping(address => mapping(bytes32 => lockToken)) public locked;

  /**
   * @dev Total amount of tokens locked in this contract another saying
   *      total amount of tokens which are not claimed yet
   */
  uint256 internal totalLockedAmount;

  /**
   * @dev ERC20 Token under lockable functionality
   */
  IERC20 internal erc20Token;

  /**
   * @dev Records data of all the tokens Locked
   */
  event Locked(
    address indexed _of,
    bytes32 indexed _reason,
    uint256 _amount,
    uint256 _validity
  );

  /**
   * @dev Records data of all the tokens unlocked
   */
  event Unlocked(
    address indexed _of,
    bytes32 indexed _reason,
    uint256 _amount
  );
    
  /**
   * @dev Error messages for require statements
   */
  string internal constant _ALREADY_LOCKED = 'Tokens already locked';
  string internal constant _NOT_LOCKED = 'No tokens locked';
  string internal constant _AMOUNT_ZERO = 'Amount can not be 0';
  string internal constant _TOKEN_INSUFFICIENT = 'Token balance of this contract is insufficient';
  string internal constant _VALIDITY_IN_PAST = 'Validity time is in past';
  string internal constant _VALIDITY_EXPIRED = 'Cannot modify a lock whose validity time is already expired';


  constructor(IERC20 _token) internal {
    erc20Token = _token;
  }

  /**
   * @dev Locks a specified amount of tokens,
   *      for a specified reason and time
   * @param to adress to which tokens are to be transfered
   * @param reason The reason to lock tokens
   * @param amount Number of tokens to be transfered and locked
   * @param time Lock time in seconds
   */
  function _lock(address to, bytes32 reason, uint256 amount, uint256 time)
    internal
    returns (bool)
  {
    require(time > now, _VALIDITY_IN_PAST); //solhint-disable-line
    require(tokensLocked(to, reason) == 0, _ALREADY_LOCKED);
    require(amount != 0, _AMOUNT_ZERO);

    if (locked[to][reason].amount == 0) {
      lockReason[to].push(reason);
    }

    require(erc20Token.balanceOf(address(this)) >= totalLockedAmount.add(amount), _TOKEN_INSUFFICIENT);

    locked[to][reason] = lockToken(amount, time, false);
    totalLockedAmount = totalLockedAmount.add(amount);

    emit Locked(to, reason, amount, time);
    return true;
  }

  /**
   * @dev Increase number of tokens locked for a specified reason against an address
   * @param to Adress to which tokens are to be transfered
   * @param reason The reason to lock tokens
   * @param amount Number of tokens to be increased
   */
  function _increaseLockAmount(address to, bytes32 reason, uint256 amount)
    internal
    returns (bool)
  {
    require(tokensLocked(to, reason) > 0, _NOT_LOCKED);
    require(erc20Token.balanceOf(address(this)) >= totalLockedAmount.add(amount), _TOKEN_INSUFFICIENT);

    locked[to][reason].amount = locked[to][reason].amount.add(amount);
    totalLockedAmount = totalLockedAmount.add(amount);

    emit Locked(to, reason, locked[to][reason].amount, locked[to][reason].validity);
    return true;
  }

  /**
   * @dev Adjust lock period for an address and a specified reason
   * @param to Address of the token receiver
   * @param reason The reason that tokens locked previously
   * @param time Lock period adjustment in seconds
   * otherwise, extends the lock by the given amount of seconds.
   */
  function _adjustLockPeriod(address to, bytes32 reason, uint256 time)
    internal
    returns (bool)
  {
    require(time > now, _VALIDITY_IN_PAST); //solhint-disable-line
    require(tokensLocked(to, reason) > 0, _NOT_LOCKED);
    require(tokensUnlockable(to, reason) == 0, _VALIDITY_EXPIRED);

    locked[to][reason].validity = time;

    emit Locked(to, reason, locked[to][reason].amount, locked[to][reason].validity);
    return true;
  }

  /**
   * @dev Unlocks the unlockable tokens of a specified address
   * @param _of Address of user, claiming back unlockable tokens
   */
  function unlock(address _of)
    public
    returns (uint256 unlockableTokens)
  {
    uint256 lockedTokens;

    for (uint256 i = 0; i < lockReason[_of].length; i++) {
      lockedTokens = tokensUnlockable(_of, lockReason[_of][i]);
      if (lockedTokens > 0) {
        unlockableTokens = unlockableTokens.add(lockedTokens);
        locked[_of][lockReason[_of][i]].claimed = true;
        emit Unlocked(_of, lockReason[_of][i], lockedTokens);
      }
    }

    if (unlockableTokens > 0) {
      // Notice that calling `transfer` with `this` results in external call
      // so that the `msg` params are not passed to the call. By this way,
      // token contract can send tokens to the caller of this function
      erc20Token.transfer(_of, unlockableTokens);
      totalLockedAmount = totalLockedAmount.sub(unlockableTokens);
    }
  }

  /**
   * @dev Returns tokens under lock (but not claimed yet) 
   *      regardless of the fact that the validity expired or not 
   *      for a specified address for a specified reason
   * @param _of The address whose tokens are locked
   * @param reason The reason to query the lock tokens for
   */
  function tokensLocked(address _of, bytes32 reason)
    public
    view
    returns (uint256 amount)
  {
    if (!locked[_of][reason].claimed) {
      amount = locked[_of][reason].amount;
    }
  }

  /**
   * @dev Returns tokens locked for a specified address for a
   *      specified reason at a specific time regardless of
   *      the fact that they're claimed or not
   * @param _of The address whose tokens are locked
   * @param reason The reason to query the lock tokens for
   * @param time The timestamp to query the lock tokens for
   */
  function tokensLockedAtTime(address _of, bytes32 reason, uint256 time)
    public
    view
    returns (uint256 amount)
  {
    if (locked[_of][reason].validity > time) {
      amount = locked[_of][reason].amount;
    }
  }

  /**
   * @dev Returns total tokens held by an address (locked + transferable)
   * @param _of The address to query the total balance of
   */
  function getTotalLockedTokens(address _of)
    public
    view
    returns (uint256 amount)
  {
    for (uint256 i = 0; i < lockReason[_of].length; i++) {
      amount = amount.add(tokensLocked(_of, lockReason[_of][i]));
    }
  }

  /**
   * @dev Returns tokens that their validity expired but not claimed yet
   *      for a specified address for a specified reason
   * @param _of The address to query the the unlockable token count of
   * @param reason The reason to query the unlockable tokens for
   */
  function tokensUnlockable(address _of, bytes32 reason)
    public
    view
    returns (uint256 amount)
  {
    if (locked[_of][reason].validity <= now && !locked[_of][reason].claimed) {  //solhint-disable-line
      amount = locked[_of][reason].amount;
    }
  }

  /**
   * @dev Gets the unlockable tokens of a specified address
   * @param _of The address to query the the unlockable token count of
   */
  function getUnlockableTokens(address _of)
    public
    view
    returns (uint256 unlockableTokens)
  {
    for (uint256 i = 0; i < lockReason[_of].length; i++) {
      unlockableTokens = unlockableTokens.add(tokensUnlockable(_of, lockReason[_of][i]));
    }
  }

  /**
   * @dev Returns the total amount of tokens locked in this contract
   *      which are not claimed yet
   */
  function getTotalLockedAmount() public view returns (uint256) {
    return totalLockedAmount;
  }

  /**
   * @dev Returns details of all the locked tokens for a given address
   */
  function getLockDetails(address lockee) public view returns (bytes32[], uint256[], uint256[], bool[]) {
    bytes32[] memory reasons = lockReason[lockee];
    uint256[] memory  amounts = new uint256[](lockReason[lockee].length);
    uint256[] memory validities = new uint256[](lockReason[lockee].length);
    bool[] memory claimStatus = new bool[](lockReason[lockee].length);

    for (uint256 i = 0; i < lockReason[lockee].length; i++) {
      bytes32 reason = lockReason[lockee][i];
      lockToken token = locked[lockee][reason];

      amounts[i] = token.amount;
      validities[i] = token.validity;
      claimStatus[i] = token.claimed;
    }

    return (reasons, amounts, validities, claimStatus);
  }
}
