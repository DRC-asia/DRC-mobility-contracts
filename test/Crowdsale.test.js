const { ether } = require("./utils/ether");
const { getCurrentTimestamp, increaseTime } = require("./utils/evm");
const { calculateBonus } = require("./utils/crowdsale");
const DreamCarToken = artifacts.require("DreamCarToken");
const DreamCarCrowdsale = artifacts.require("DreamCarCrowdsale");
const BigNumber = web3.BigNumber;
require("chai")
  .use(require("chai-bignumber")(BigNumber))
  .use(require("chai-as-promised"))
  .should();

contract(
  "DreamCarCrowdsale",
  ([
    creator,
    wallet,
    funder,
    thirdParty,
    thirdPartyAlt,
    address5,
    address6,
    address7,
    address8,
  ]) => {
    const NAME = "DREAM_CAR Protocol";
    const SYMBOL = "DREAM_CAR";
    const DECIMALS = 18;
    const INITIAL_SUPPLY = new BigNumber(1250000000); // 1.25 Billion DREAM_CAR tokens

    const EXCHANGE_RATE = new BigNumber(1000); // 1 ether = 1000 DREAM_CAR
    const TOTAL_SALE_CAP = ether(10);
    const VESTING_TOKEN_AMOUNT = new BigNumber("4e22"); // 40,000 DREAM_CAR
    const BONUS_RATE = new BigNumber(2500); // 25% Bonus rate which is multiplied by 100 for better resolution

    // These values are for testing purposes. The values set in DreamCarCrowdsale
    // contract which will be deployed in mainnet will be different.
    const SALE_PERIOD = 600; // 10 minutes
    const BONUS_TOKEN_RELEASE_TIME = 1200; // 20 minutes
    const VESTING_PARTY_RELEASE_TIME = 3600; // 1 hour per vesting (incremental)
    const lockPeriods = new Array(6);
    const fundingAmount = ether(2); // 2 ether
    const vestAmount_funder = new BigNumber("2.5e21"); // 2,500 DREAM_CAR
    const vestAmount_thirdParty = new BigNumber("1e21"); // 1,000 DREAM_CAR
    const vestAmount_thirdPartyAlt = new BigNumber("5e21"); // 5,000 DREAM_CAR

    beforeEach(async () => {
      this.token = await DreamCarToken.new(
        NAME,
        SYMBOL,
        DECIMALS,
        INITIAL_SUPPLY
      );
      this.crowdsale = await DreamCarCrowdsale.new(
        EXCHANGE_RATE,
        wallet,
        this.token.address,
        TOTAL_SALE_CAP
      );

      // Fund the crowdsale contract with tokens
      await this.token.transfer(
        this.crowdsale.address,
        TOTAL_SALE_CAP.mul(EXCHANGE_RATE).add(
          VESTING_TOKEN_AMOUNT.mul(1 + BONUS_RATE / 10000)
        )
      );

      let now = await getCurrentTimestamp();
      lockPeriods[0] = now + BONUS_TOKEN_RELEASE_TIME;
      lockPeriods[1] = now + VESTING_PARTY_RELEASE_TIME * 1;
      lockPeriods[2] = now + VESTING_PARTY_RELEASE_TIME * 2;
      lockPeriods[3] = now + VESTING_PARTY_RELEASE_TIME * 3;
      lockPeriods[4] = now + VESTING_PARTY_RELEASE_TIME * 4;

      // Set lock periods
      await this.crowdsale.setLockPeriods(lockPeriods);
    });

    describe("Crowdsale", () => {
      it("has an purchase rate", async () => {
        (await this.crowdsale.rate()).should.be.bignumber.equal(EXCHANGE_RATE);
      });

      it("has a collector wallet", async () => {
        (await this.crowdsale.wallet()).should.equal(wallet);
      });

      it("has a token", async () => {
        (await this.crowdsale.token()).should.be.equal(this.token.address);
      });
    });

    describe("Crowdsale::Admin", () => {
      it("admin can add a new admin", async () => {
        await this.crowdsale.addAdmin(thirdParty).should.be.fulfilled;
        (await this.crowdsale.isAdmin(thirdParty)).should.be.true;
      });

      it("admin can add a new collector wallet", async () => {
        await this.crowdsale.setWallet(address5).should.be.fulfilled;
        let newWallet = await this.crowdsale.wallet();
        newWallet.should.be.equal(address5);
      });

      it("does not allow an unauthorized address to add a new collector wallet", async () => {
        await this.crowdsale.setWallet(address5, { from: thirdParty }).should.be
          .rejected;
      });

      it("does not allow an unauthorized address to add an admin", async () => {
        (await this.crowdsale.isAdmin(thirdPartyAlt)).should.be.false;
        await this.crowdsale.addAdmin(thirdParty, { from: thirdPartyAlt })
          .should.be.rejected;
      });
    });

    describe("Crowdsale::Whitelisted", () => {
      it("admin can add account/s to whitelist", async () => {
        await this.crowdsale.addToWhitelist(funder).should.be.fulfilled;
        await this.crowdsale.addWhitelist([thirdParty, thirdPartyAlt]).should.be
          .fulfilled;

        (await this.crowdsale.isWhitelisted(funder)).should.be.true;
        (await this.crowdsale.isWhitelisted(thirdParty)).should.be.true;
        (await this.crowdsale.isWhitelisted(thirdPartyAlt)).should.be.true;
      });

      it("admin can remove an account from whitelist", async () => {
        await this.crowdsale.addWhitelist([funder, thirdParty]).should.be
          .fulfilled;
        await this.crowdsale.removeFromWhitelist(funder).should.be.fulfilled;
        await this.crowdsale.removeFromWhitelist(thirdParty).should.be
          .fulfilled;

        (await this.crowdsale.isWhitelisted(funder)).should.be.false;
        (await this.crowdsale.isWhitelisted(thirdParty)).should.be.false;
      });

      it("does not allow unauthorized accounts to add/remove accounts to whitelist", async () => {
        await this.crowdsale.addToWhitelist(funder, { from: thirdParty }).should
          .be.rejected;
        await this.crowdsale.addWhitelist([funder, thirdParty], {
          from: thirdParty,
        }).should.be.rejected;

        await this.crowdsale.addWhitelist([funder, thirdParty, thirdPartyAlt])
          .should.be.fulfilled;
        await this.crowdsale.removeFromWhitelist(funder, { from: thirdParty })
          .should.be.rejected;
      });
    });

    describe("Crowdsale::Withdrawable", () => {
      it("admin can withdraw ether from the contract", async () => {
        // Notice that there is no way to have ether in crowdsale contract
        // unless, in deployment time, fund collector wallet is set as the contract itself
        // Therefore just testing whether this function can be called or not.
        let contractPreBalanceEth = await web3.eth.getBalance(
          this.crowdsale.address
        );
        await this.crowdsale.withdrawToken(0).should.be.fulfilled;

        let contractPostBalanceEth = await web3.eth.getBalance(
          this.crowdsale.address
        );
        contractPostBalanceEth.should.be.bignumber.equal(
          contractPreBalanceEth.sub(0)
        );
      });

      it("admin can withdraw token from the contract", async () => {
        let contractPreBalanceToken = await this.token.balanceOf(
          this.crowdsale.address
        );
        await this.crowdsale.withdrawToken(VESTING_TOKEN_AMOUNT).should.be
          .fulfilled;

        let contractPostBalanceToken = await this.token.balanceOf(
          this.crowdsale.address
        );
        contractPostBalanceToken.should.be.bignumber.equal(
          contractPreBalanceToken.sub(VESTING_TOKEN_AMOUNT)
        );
      });

      it("does not allow to withdraw amount of token more than the contract balance minus total locked token amount", async () => {
        // Try to withdraw an amount of token more than the contract balance
        await this.crowdsale.withdrawToken(
          TOTAL_SALE_CAP.mul(EXCHANGE_RATE)
            .add(VESTING_TOKEN_AMOUNT.mul(1 + BONUS_RATE / 10000))
            .add(1)
        ).should.be.rejected;

        let currentTimestamp = await getCurrentTimestamp();

        // First lock some tokens to the contract
        await this.crowdsale.lock(
          [funder],
          ["fake_lock_reason"],
          [
            TOTAL_SALE_CAP.mul(EXCHANGE_RATE).add(
              VESTING_TOKEN_AMOUNT.mul(1 + BONUS_RATE / 10000)
            ),
          ],
          [currentTimestamp + 1000]
        ).should.be.fulfilled;

        // And try to withdraw some amount more than the contract balance minus total locked token amount
        await this.crowdsale.withdrawToken(1).should.be.rejected;
      });

      it("does not allow an unauthorized account to withdraw token/ether", async () => {
        await this.crowdsale.withdrawToken(VESTING_TOKEN_AMOUNT, {
          from: thirdParty,
        }).should.be.rejected;
        await this.crowdsale.withdrawEther(ether(0), { from: thirdParty })
          .should.be.rejected;
      });
    });

    describe("Crowdsale::Phased", () => {
      let walletPreBalanceEther;
      let walletPostBalanceEther;
      let phaseStartTime;

      beforeEach(async () => {
        walletPreBalanceEther = await web3.eth.getBalance(wallet);
        phaseStartTime = (await getCurrentTimestamp()) + 10;

        // Add `funder` to whitelist
        await this.crowdsale.addToWhitelist(funder);

        // Start a phase
        await this.crowdsale.setPhase(
          EXCHANGE_RATE,
          phaseStartTime,
          SALE_PERIOD + phaseStartTime,
          BONUS_RATE
        ).should.be.fulfilled;

        // Wind EVM time forward so that the sale starts
        await increaseTime(20);
        (await this.crowdsale.isActive()).should.be.true;
      });

      it("sets phase variables correctly", async () => {
        // Compare the actual phase variables with the expected ones
        (await this.crowdsale.phaseStartTime()).should.be.bignumber.equal(
          phaseStartTime
        );
        (await this.crowdsale.phaseEndTime()).should.be.bignumber.equal(
          SALE_PERIOD + phaseStartTime
        );
        (await this.crowdsale.phaseBonusRate()).should.be.bignumber.equal(
          BONUS_RATE
        );
      });

      it("transfers and locks tokens upon a purchase", async () => {
        let tokenAmount = EXCHANGE_RATE.mul(fundingAmount);
        let bonusAmount = calculateBonus(tokenAmount, BONUS_RATE);
        let funderPreBalance = await this.token.balanceOf(funder);

        // Send some ether for purchase as `funder`
        await this.crowdsale.sendTransaction({
          from: funder,
          value: fundingAmount,
        });

        // Check whether funder gets the purchased tokens
        let funderPostBalance = await this.token.balanceOf(funder);
        funderPostBalance.should.be.bignumber.equal(
          funderPreBalance.add(tokenAmount)
        );

        // Check amount of bonus tokens locked against funder address
        let lockedTokens = await this.crowdsale.getTotalLockedTokens(funder);
        lockedTokens.should.be.bignumber.equal(bonusAmount);

        // Check whether fund collector get the ether sent for purchased
        walletPostBalanceEther = await web3.eth.getBalance(wallet);
        walletPostBalanceEther.should.be.bignumber.equal(
          walletPreBalanceEther.add(fundingAmount)
        );
      });

      it("does not allow to set a phase while there is an active phase", async () => {
        phaseStartTime = (await getCurrentTimestamp()) + 100;

        // Start a phase
        await this.crowdsale.setPhase(
          EXCHANGE_RATE,
          phaseStartTime,
          SALE_PERIOD + phaseStartTime,
          BONUS_RATE
        ).should.be.rejected;
      });

      it("does not allow a non-whitelisted address to make a purchase", async () => {
        // Send some ether for purchase as `thirdParty`
        await this.crowdsale.sendTransaction({
          from: thirdParty,
          value: fundingAmount,
        }).should.be.rejected;
      });

      it("does not allow to make a purchase when the sale phase deactive", async () => {
        await increaseTime(SALE_PERIOD);
        (await this.crowdsale.isActive()).should.be.false;
        // Send some ether for purchase as `funder`
        await this.crowdsale.sendTransaction({
          from: funder,
          value: fundingAmount,
        }).should.be.rejected;
      });

      it("does not allow an unauthorized address to set a phase", async () => {
        await increaseTime(SALE_PERIOD);

        phaseStartTime = (await getCurrentTimestamp()) + 100;

        // Start a phase
        await this.crowdsale.setPhase(
          EXCHANGE_RATE,
          phaseStartTime,
          SALE_PERIOD + phaseStartTime,
          BONUS_RATE,
          { from: thirdParty }
        ).should.be.rejected;
      });

      it("does not allow to set a phase in past", async () => {
        await increaseTime(SALE_PERIOD);

        // Start a phase
        await this.crowdsale.setPhase(
          EXCHANGE_RATE,
          phaseStartTime,
          SALE_PERIOD + phaseStartTime,
          BONUS_RATE
        ).should.be.rejected;
      });

      it("does not allow to set a phase with 0 purchase rate", async () => {
        await increaseTime(SALE_PERIOD);

        phaseStartTime = (await getCurrentTimestamp()) + 100;

        // Start a phase
        await this.crowdsale.setPhase(
          0,
          phaseStartTime,
          SALE_PERIOD + phaseStartTime,
          BONUS_RATE
        ).should.be.rejected;
      });
    });

    describe("Crowdsale::Capped", () => {
      let phaseStartTime;

      beforeEach(async () => {
        phaseStartTime = (await getCurrentTimestamp()) + 10;

        // Add `funder` to whitelist
        await this.crowdsale.addToWhitelist(funder);

        // Start a phase
        await this.crowdsale.setPhase(
          EXCHANGE_RATE,
          phaseStartTime,
          SALE_PERIOD + phaseStartTime,
          BONUS_RATE
        ).should.be.fulfilled;

        // Wind EVM time forward so that the sale starts
        await increaseTime(20);
        (await this.crowdsale.isActive()).should.be.true;
      });

      it("has a total sale cap", async () => {
        (await this.crowdsale.getTotalSaleCap()).should.be.bignumber.equal(
          TOTAL_SALE_CAP
        );
      });

      it("sets individual caps", async () => {
        await this.crowdsale.setIndividualCaps(ether(1), ether(5));

        // Validate actual caps
        let caps = await this.crowdsale.getIndividualCaps();
        caps[0].should.be.bignumber.equal(ether(1));
        caps[1].should.be.bignumber.equal(ether(5));
      });

      it("sets total sale cap", async () => {
        await this.crowdsale.setTotalSaleCap(ether(200));

        // Validate with actual total sale cap
        let cap = await this.crowdsale.getTotalSaleCap();
        cap.should.be.bignumber.equal(ether(200));
      });

      it("does not allow an unauthorized address to set individual caps", async () => {
        await this.crowdsale.setIndividualCaps(ether(1), ether(5), {
          from: thirdParty,
        }).should.be.rejected;
      });

      it("does not allow an unauthorized address to set total sale cap", async () => {
        await this.crowdsale.setTotalSaleCap(ether(100), { from: thirdParty })
          .should.be.rejected;
      });

      it("does not allow to make a purchase less than the minimum cap", async () => {
        await this.crowdsale.setIndividualCaps(ether(1), ether(4));
        await this.crowdsale.sendTransaction({
          from: funder,
          value: ether(0.1),
        }).should.be.rejected;
        await this.crowdsale.sendTransaction({ from: funder, value: ether(2) })
          .should.be.fulfilled;
      });

      it("does not allow to make a purchase more than the maximum cap", async () => {
        await this.crowdsale.setIndividualCaps(ether(1), ether(2));
        await this.crowdsale.sendTransaction({ from: funder, value: ether(3) })
          .should.be.rejected;
        await this.crowdsale.sendTransaction({ from: funder, value: ether(2) })
          .should.be.fulfilled;
        await this.crowdsale.sendTransaction({ from: funder, value: ether(1) })
          .should.be.rejected;
      });

      it("does not allow to make any more purchase when the total sale cap is reached", async () => {
        await this.crowdsale.sendTransaction({
          from: funder,
          value: TOTAL_SALE_CAP.sub(ether(1.001)),
        }).should.be.fulfilled;
        await this.crowdsale.sendTransaction({
          from: funder,
          value: ether(1.001),
        }).should.be.fulfilled;
        await this.crowdsale.sendTransaction({ from: funder, value: 1 }).should
          .be.rejected;
      });
    });

    describe("Crowdsale::Lockable", () => {
      const lockReason = "just_a_fake_reason";
      const lockedAmount = new BigNumber("200e18"); // 200 DREAM_CAR tokens
      const lockPeriod = 1000; // 1000 seconds
      let lockExpiryDate;
      let conctractPreBalance;
      let currentTimestamp;
      let initialTotalLockedTokens;
      let currentTotalLockedTokens;

      beforeEach(async () => {
        conctractPreBalance = await this.token.balanceOf(
          this.crowdsale.address
        );
        initialTotalLockedTokens = await this.crowdsale.getTotalLockedAmount();
        currentTimestamp = await getCurrentTimestamp();
        lockExpiryDate = currentTimestamp + lockPeriod; // now + 1000secs
      });

      it("locks token", async () => {
        await this.crowdsale.lock(
          [funder],
          [lockReason],
          [lockedAmount],
          [lockExpiryDate]
        ).should.be.fulfilled;

        // Check the total number of locked tokens in this contract after a new lock
        currentTotalLockedTokens = await this.crowdsale.getTotalLockedAmount();
        currentTotalLockedTokens.should.be.bignumber.equal(
          initialTotalLockedTokens.add(lockedAmount)
        );

        // Check the actually locked tokens
        let actualLockedAmount = await this.crowdsale.tokensLocked(
          funder,
          lockReason
        );
        actualLockedAmount.should.be.bignumber.equal(lockedAmount);

        // Check the locked tokens after lock period
        actualLockedAmount = await this.crowdsale.tokensLockedAtTime(
          creator,
          lockReason,
          lockExpiryDate.valueOf() + 1 // One second after the lock period expires
        );
        actualLockedAmount.should.be.bignumber.equal(0);
      });

      it("gets lock details", async () => {
        await this.crowdsale.lock(
          [funder],
          [lockReason],
          [lockedAmount],
          [lockExpiryDate]
        ).should.be.fulfilled;

        // Check the total number of locked tokens in this contract after a new lock
        currentTotalLockedTokens = await this.crowdsale.getTotalLockedAmount();
        currentTotalLockedTokens.should.be.bignumber.equal(
          initialTotalLockedTokens.add(lockedAmount)
        );

        // Check the actually locked tokens
        let actualLockedAmount = await this.crowdsale.tokensLocked(
          funder,
          lockReason
        );
        actualLockedAmount.should.be.bignumber.equal(lockedAmount);

        // Check the locked tokens after lock period
        let details = await this.crowdsale.getLockDetails(funder);
        console.log("Reasons", details[0]);
        console.log("Amounts", details[1]);
        console.log("Validities", details[2]);
        console.log("Status", details[3]);
      });

      it("unlocks tokens", async () => {
        let funderPreBalance = await this.token.balanceOf(funder);

        // First lock some tokens
        await this.crowdsale.lock(
          [funder],
          [lockReason],
          [lockedAmount],
          [lockExpiryDate]
        ).should.be.fulfilled;

        // Check the total number of locked tokens in this contract after a new lock
        currentTotalLockedTokens = await this.crowdsale.getTotalLockedAmount();
        currentTotalLockedTokens.should.be.bignumber.equal(
          initialTotalLockedTokens.add(lockedAmount)
        );
        initialTotalLockedTokens = currentTotalLockedTokens;

        // Check the actually locked tokens
        let actualLockAmount = await this.crowdsale.tokensLocked(
          funder,
          lockReason
        );
        actualLockAmount.should.be.bignumber.equal(lockedAmount);

        // Wind forward EVM block time to expiry date
        let lockedToken = await this.crowdsale.locked(funder, lockReason);
        await increaseTime(lockedToken[1].sub(currentTimestamp).toNumber());

        // Compare the amount of unlockable tokens at the end
        // of lock period with the initially locked token
        let unlockableTokenAmount = await this.crowdsale.getUnlockableTokens(
          funder
        );
        unlockableTokenAmount.should.be.bignumber.equal(actualLockAmount);

        // And finally unlock the tokens
        await this.crowdsale.unlock(funder).should.be.fulfilled;

        // Check the total number of locked tokens in this contract after unlocking a lock
        currentTotalLockedTokens = await this.crowdsale.getTotalLockedAmount();
        currentTotalLockedTokens.should.be.bignumber.equal(
          initialTotalLockedTokens.sub(lockedAmount)
        );

        // Check if the sender's balance is increased by amount of tokens unlocked
        let contractPostBalance = await this.token.balanceOf(
          this.crowdsale.address
        );
        contractPostBalance.should.be.bignumber.equal(
          conctractPreBalance.sub(unlockableTokenAmount)
        );

        let funderPostBalance = await this.token.balanceOf(funder);
        funderPostBalance.should.be.bignumber.equal(
          funderPreBalance.add(unlockableTokenAmount)
        );

        // Check, also if whether tokens are unlocked or not
        unlockableTokenAmount = await this.crowdsale.getUnlockableTokens(
          funder
        );
        unlockableTokenAmount.should.be.bignumber.equal(0);
      });

      it("increases the amount of tokens locked", async () => {
        // First lock some tokens
        await this.crowdsale.lock(
          [funder],
          [lockReason],
          [lockedAmount],
          [lockExpiryDate]
        ).should.be.fulfilled;

        // Check the actually locked tokens
        let actualLockAmount = await this.crowdsale.tokensLocked(
          funder,
          lockReason
        );
        actualLockAmount.should.be.bignumber.equal(lockedAmount);

        await this.crowdsale.increaseLockAmount(
          funder,
          lockReason,
          lockedAmount
        ).should.be.fulfilled;
        let increasedLockAmount = await this.crowdsale.tokensLocked(
          funder,
          lockReason
        );

        // Compare the pre-locked amount and increased lock amount
        increasedLockAmount.should.be.bignumber.equal(
          actualLockAmount.add(lockedAmount)
        );
      });

      it("extends lock period for an existing lock", async () => {
        // Notice that `this.token.locked(...)` returns
        // `locked` variable from the contract which is indeed a mapping to
        // a struct of shape of `{uint256 amount, uint256 validity, bool claimed}`
        // therefore returned `value[0]` is equal to `amount`, `value[1]` is
        // equal to `validity` and `value[2]` is `claimed`.

        // Lock some token first
        await this.crowdsale.lock(
          [funder],
          [lockReason],
          [lockedAmount],
          [lockExpiryDate]
        ).should.be.fulfilled;
        let lockedToken = await this.crowdsale.locked(funder, lockReason);

        await this.crowdsale.adjustLockPeriod(
          funder,
          lockReason,
          lockExpiryDate - 10
        ).should.be.fulfilled;
        let lockShortenedToken = await this.crowdsale.locked(
          funder,
          lockReason
        );

        // Compare the validity of the locked tokens
        lockShortenedToken[1].should.be.bignumber.equal(lockedToken[1].sub(10));

        await this.crowdsale.adjustLockPeriod(
          funder,
          lockReason,
          lockExpiryDate + 10
        ).should.be.fulfilled;
        let lockExtendedToken = await this.crowdsale.locked(funder, lockReason);

        // Compare the validity of the locked tokens
        lockExtendedToken[1].should.be.bignumber.equal(lockedToken[1].add(10));
      });

      it("locks tokens again after unlocking", async () => {
        await this.crowdsale.lock(
          [funder],
          [lockReason],
          [lockedAmount],
          [lockExpiryDate]
        ).should.be.fulfilled;

        // Wind forward EVM block time to expiry date
        let lockedToken = await this.crowdsale.locked(funder, lockReason);
        await increaseTime(lockedToken[1].sub(currentTimestamp).toNumber());

        await this.crowdsale.unlock(funder).should.be.fulfilled;
        await this.crowdsale.lock(
          [funder],
          [lockReason],
          [lockedAmount.add(100)],
          [lockExpiryDate + 100]
        ).should.be.fulfilled;

        // Check the actually locked tokens
        let actualLockAmount = await this.crowdsale.tokensLocked(
          funder,
          lockReason
        );
        actualLockAmount.should.be.bignumber.equal(lockedAmount.add(100));
      });

      it("returns 0 amount of locked token for unknown reasons", async () => {
        let actualLockedAmount = await this.crowdsale.tokensLocked(
          funder,
          lockReason
        );
        actualLockedAmount.should.be.bignumber.equal(0);
      });

      it("does not allow unauthorized addresses to call functions of lockable feature", async () => {
        await this.crowdsale.lock(
          [funder],
          [lockReason],
          [lockedAmount],
          [lockExpiryDate],
          { from: thirdParty }
        ).should.be.rejected;

        // Create a lock first
        await this.crowdsale.lock(
          [funder],
          [lockReason],
          [lockedAmount],
          [lockExpiryDate]
        ).should.be.fulfilled;

        await this.crowdsale.adjustLockPeriod(
          funder,
          lockReason,
          lockExpiryDate,
          { from: thirdParty }
        ).should.be.rejected;

        await this.crowdsale.increaseLockAmount(
          funder,
          lockReason,
          lockedAmount,
          { from: thirdParty }
        ).should.be.rejected;

        await this.crowdsale.setLockPeriods(lockPeriods, { from: thirdParty })
          .should.be.rejected;
      });

      it("does not allow to adjust exipry of locked tokens whose lock is already expired", async () => {
        // First lock some tokens
        await this.crowdsale.lock(
          [funder],
          [lockReason],
          [lockedAmount],
          [lockExpiryDate]
        ).should.be.fulfilled;

        // Wind forward EVM block time to the expiry date
        let lockedToken = await this.crowdsale.locked(funder, lockReason);
        await increaseTime(lockedToken[1].sub(currentTimestamp).toNumber() + 1);

        // Then try to increase the expiry of locked tokens whose lock is already expired
        await this.crowdsale.adjustLockPeriod(
          funder,
          lockReason,
          lockExpiryDate + 10
        ).should.be.rejected;
      });

      it("does not allow to lock with an expiry date in the past", async () => {
        await this.crowdsale.lock(
          [funder],
          [lockReason],
          [lockedAmount],
          [currentTimestamp - 1]
        ).should.be.rejected;
      });

      it("does not allow to lock more than the contract balance", async () => {
        // One time lock with the amount which exceeds total balance of the contract
        await this.crowdsale.lock(
          [funder],
          [lockReason],
          [
            TOTAL_SALE_CAP.mul(EXCHANGE_RATE)
              .add(VESTING_TOKEN_AMOUNT.mul(1 + BONUS_RATE / 10000))
              .add(1),
          ],
          [lockExpiryDate]
        ).should.be.rejected;

        // Or multiple time lock with the amount which exceeds total balance of the contract
        await this.crowdsale.lock(
          [funder],
          [lockReason],
          [
            TOTAL_SALE_CAP.mul(EXCHANGE_RATE).add(
              VESTING_TOKEN_AMOUNT.mul(1 + BONUS_RATE / 10000)
            ),
          ],
          [lockExpiryDate]
        ).should.be.fulfilled;

        await this.crowdsale.lock([funder], [lockReason], [1], [lockExpiryDate])
          .should.be.rejected;
      });

      it("does not allow to increase amount of locked tokens by amount more than the contract balance", async () => {
        // First lock exact amount of tokens as the contract balance
        await this.crowdsale.lock(
          [funder],
          [lockReason],
          [
            TOTAL_SALE_CAP.mul(EXCHANGE_RATE).add(
              VESTING_TOKEN_AMOUNT.mul(1 + BONUS_RATE / 10000)
            ),
          ],
          [lockExpiryDate]
        ).should.be.fulfilled;

        // Then try to increase amount of locked tokens by any amount which will exceeds the contract balance
        await this.crowdsale.increaseLockAmount(funder, lockReason, 1).should.be
          .rejected;
      });

      it("does not allow to adjust lock expiry to a date in the past", async () => {
        // Notice that `this.token.locked(...)` returns
        // `locked` variable from the contract which is indeed a mapping to
        // a struct of shape of `{uint256 amount, uint256 validity, bool claimed}`
        // therefore returned `value[0]` is equal to `amount`, `value[1]` is
        // equal to `validity` and `value[2]` is `claimed`.

        // Lock some token first
        await this.crowdsale.lock(
          [funder],
          [lockReason],
          [lockedAmount],
          [lockExpiryDate]
        ).should.be.fulfilled;
        let lockedToken = await this.crowdsale.locked(funder, lockReason);

        await this.crowdsale.adjustLockPeriod(
          funder,
          lockReason,
          currentTimestamp - 1
        ).should.be.rejected;

        // Compare the validity of the locked tokens
        lockedToken[1].should.be.bignumber.equal(lockExpiryDate);
      });

      it("does not allow to extend lock period and increasing lock amount for a non-existent lock", async () => {
        // Try to adjust time validity of a lock which does not exist
        await this.crowdsale.adjustLockPeriod(
          funder,
          lockReason,
          lockExpiryDate
        ).should.be.rejected;
        // Try to increase lock amount for a non-existent lock
        await this.crowdsale.increaseLockAmount(
          funder,
          lockReason,
          lockedAmount
        ).should.be.rejected;
      });

      it("does not allow to lock 0 amount of token", async () => {
        await this.crowdsale.lock([funder], [lockReason], [0], [lockExpiryDate])
          .should.be.rejected;
      });
    });

    describe("Crowdsale::Vesting&Releasing", () => {
      let walletPreBalanceEther;
      let tokenAmount;
      let bonusAmount;
      let currentTimestamp;

      beforeEach(async () => {
        walletPreBalanceEther = await web3.eth.getBalance(wallet);
        tokenAmount = EXCHANGE_RATE.mul(fundingAmount);
        bonusAmount = calculateBonus(tokenAmount, BONUS_RATE);

        // Add funders to whitelist
        await this.crowdsale.addWhitelist([funder, thirdParty, thirdPartyAlt])
          .should.be.fulfilled;

        let phaseStartTime = (await getCurrentTimestamp()) + 1;

        // Start a phase
        await this.crowdsale.setPhase(
          EXCHANGE_RATE,
          phaseStartTime,
          SALE_PERIOD + phaseStartTime,
          BONUS_RATE
        ).should.be.fulfilled;

        currentTimestamp = await getCurrentTimestamp();

        // Wind EVM time forward so that the sale starts
        await increaseTime(20);
        (await this.crowdsale.isActive()).should.be.true;
      });

      it("releases all locked tokens", async () => {
        // Check funders token balances
        let funderPreBalance = await this.token.balanceOf(funder);
        let thirdPartyPreBalance = await this.token.balanceOf(thirdParty);
        let thirdPartyAltPreBalance = await this.token.balanceOf(thirdPartyAlt);

        // Make some purchase from different funder addresses
        await this.crowdsale.sendTransaction({
          from: funder,
          value: fundingAmount,
        }).should.be.fulfilled;
        await this.crowdsale.sendTransaction({
          from: thirdParty,
          value: fundingAmount,
        }).should.be.fulfilled;
        await this.crowdsale.sendTransaction({
          from: thirdPartyAlt,
          value: fundingAmount,
        }).should.be.fulfilled;

        // Check whether the purchased tokens transferred
        let funderPostBalance = await this.token.balanceOf(funder);
        let thirdPartyPostBalance = await this.token.balanceOf(thirdParty);
        let thirdPartyAltPostBalance = await this.token.balanceOf(
          thirdPartyAlt
        );
        funderPostBalance.should.be.bignumber.equal(
          funderPreBalance.add(tokenAmount)
        );
        thirdPartyPostBalance.should.be.bignumber.equal(
          thirdPartyPreBalance.add(tokenAmount)
        );
        thirdPartyAltPostBalance.should.be.bignumber.equal(
          thirdPartyAltPreBalance.add(tokenAmount)
        );

        // Check whether fund collector gets the ether sent for purchases
        let walletPostBalanceEther = await web3.eth.getBalance(wallet);
        walletPostBalanceEther.should.be.bignumber.equal(
          walletPreBalanceEther.add(fundingAmount.mul(3))
        );

        // Check whether crowdsale token balance is reduced by the amount of total token transfered and locked
        let totalLockedTokenFunder = await this.crowdsale.getTotalLockedTokens(
          funder
        );
        let totalLockedTokenThirdParty = await this.crowdsale.getTotalLockedTokens(
          thirdParty
        );
        let totalLockedTokenThirdPartyAlt = await this.crowdsale.getTotalLockedTokens(
          thirdPartyAlt
        );
        bonusAmount
          .mul(3)
          .should.be.bignumber.equal(
            totalLockedTokenFunder
              .add(totalLockedTokenThirdParty)
              .add(totalLockedTokenThirdPartyAlt)
          );

        // Wind forward EVM blocktime to time when the all earned token locks expire
        await increaseTime(BONUS_TOKEN_RELEASE_TIME);

        // And release tokens
        await this.crowdsale.releaseTokens([funder, thirdParty, thirdPartyAlt])
          .should.be.fulfilled;

        // Check token balances after token release
        funderPostBalance = await this.token.balanceOf(funder);
        thirdPartyPostBalance = await this.token.balanceOf(thirdParty);
        thirdPartyAltPostBalance = await this.token.balanceOf(thirdPartyAlt);
        funderPostBalance.should.be.bignumber.equal(
          funderPreBalance.add(tokenAmount).add(bonusAmount)
        );
        thirdPartyPostBalance.should.be.bignumber.equal(
          thirdPartyPreBalance.add(tokenAmount).add(bonusAmount)
        );
        thirdPartyAltPostBalance.should.be.bignumber.equal(
          thirdPartyAltPreBalance.add(tokenAmount).add(bonusAmount)
        );
      });

      it("vests and releases vested tokens", async () => {
        let funderPreBalanceToken = await this.token.balanceOf(funder);
        let thirdPartyPreBalanceToken = await this.token.balanceOf(thirdParty);

        // Vest tokens for the dedicated accounts
        await this.crowdsale.vestDedicatedTokens(
          [funder, thirdParty],
          [vestAmount_funder, vestAmount_thirdParty]
        ).should.be.fulfilled;

        // Wind forward EVM blocktime to time when the first party of the vested token lock expires
        await increaseTime(VESTING_PARTY_RELEASE_TIME);

        // Release token for first party
        this.crowdsale.releaseTokens([funder, thirdParty]).should.be.fulfilled;

        // Check token balances
        let funderPostBalanceToken = await this.token.balanceOf(funder);
        let thirdPartyPostBalanceToken = await this.token.balanceOf(thirdParty);
        funderPostBalanceToken.should.be.bignumber.equal(
          funderPreBalanceToken.add(vestAmount_funder)
        );
        thirdPartyPostBalanceToken.should.be.bignumber.equal(
          thirdPartyPreBalanceToken.add(vestAmount_thirdParty)
        );

        // Wind forward EVM blocktime to time when the second party of the vested token lock expires
        await increaseTime(VESTING_PARTY_RELEASE_TIME);

        funderPreBalanceToken = funderPostBalanceToken;
        thirdPartyPreBalanceToken = thirdPartyPostBalanceToken;

        // Release token for first party
        this.crowdsale.releaseTokens([funder, thirdParty]).should.be.fulfilled;

        // Check token balances
        funderPostBalanceToken = await this.token.balanceOf(funder);
        thirdPartyPostBalanceToken = await this.token.balanceOf(thirdParty);
        funderPostBalanceToken.should.be.bignumber.equal(
          funderPreBalanceToken.add(vestAmount_funder)
        );
        thirdPartyPostBalanceToken.should.be.bignumber.equal(
          thirdPartyPreBalanceToken.add(vestAmount_thirdParty)
        );

        // Wind forward EVM blocktime to time when the third party of the vested token lock expires
        await increaseTime(VESTING_PARTY_RELEASE_TIME);

        funderPreBalanceToken = funderPostBalanceToken;
        thirdPartyPreBalanceToken = thirdPartyPostBalanceToken;

        // Release token for first party
        this.crowdsale.releaseTokens([funder, thirdParty]).should.be.fulfilled;

        // Check token balances
        funderPostBalanceToken = await this.token.balanceOf(funder);
        thirdPartyPostBalanceToken = await this.token.balanceOf(thirdParty);
        funderPostBalanceToken.should.be.bignumber.equal(
          funderPreBalanceToken.add(vestAmount_funder)
        );
        thirdPartyPostBalanceToken.should.be.bignumber.equal(
          thirdPartyPreBalanceToken.add(vestAmount_thirdParty)
        );

        // Wind forward EVM blocktime to time when the fourth party of the vested token lock expires
        await increaseTime(VESTING_PARTY_RELEASE_TIME);

        funderPreBalanceToken = funderPostBalanceToken;
        thirdPartyPreBalanceToken = thirdPartyPostBalanceToken;

        // Release token for first party
        this.crowdsale.releaseTokens([funder, thirdParty]).should.be.fulfilled;

        // Check token balances
        funderPostBalanceToken = await this.token.balanceOf(funder);
        thirdPartyPostBalanceToken = await this.token.balanceOf(thirdParty);
        funderPostBalanceToken.should.be.bignumber.equal(
          funderPreBalanceToken.add(vestAmount_funder)
        );
        thirdPartyPostBalanceToken.should.be.bignumber.equal(
          thirdPartyPreBalanceToken.add(vestAmount_thirdParty)
        );
      });

      it("delivers tokens manually for the purchases through thirdparty ICO platforms", async () => {
        let funderBonus = calculateBonus(vestAmount_funder, BONUS_RATE);
        let thirdPartyBonus = calculateBonus(vestAmount_thirdParty, BONUS_RATE);
        let funderPreBalance = await this.token.balanceOf(funder);
        let thirdPartyPreBalance = await this.token.balanceOf(thirdParty);

        await this.crowdsale.deliverPurchasedTokensManually(
          [funder, thirdParty],
          [vestAmount_funder, vestAmount_thirdParty],
          [funderBonus, thirdPartyBonus],
          currentTimestamp + BONUS_TOKEN_RELEASE_TIME
        ).should.be.fulfilled;

        let funderPostBalance = await this.token.balanceOf(funder);
        let thirdPartyPostBalance = await this.token.balanceOf(thirdParty);
        funderPostBalance.should.be.bignumber.equal(
          funderPreBalance.add(vestAmount_funder)
        );
        thirdPartyPostBalance.should.be.bignumber.equal(
          thirdPartyPreBalance.add(vestAmount_thirdParty)
        );

        funderPreBalance = funderPostBalance;
        thirdPartyPreBalance = thirdPartyPostBalance;

        // Wind forward EVM blocktime to time when the all earned token locks expire
        await increaseTime(BONUS_TOKEN_RELEASE_TIME);

        // Release token for first party
        this.crowdsale.releaseTokens([funder, thirdParty]).should.be.fulfilled;

        // Check token balances after token release
        funderPostBalance = await this.token.balanceOf(funder);
        thirdPartyPostBalance = await this.token.balanceOf(thirdParty);
        funderPostBalance.should.be.bignumber.equal(
          funderPreBalance.add(funderBonus)
        );
        thirdPartyPostBalance.should.be.bignumber.equal(
          thirdPartyPreBalance.add(thirdPartyBonus)
        );
      });

      it("does not allow an unauthorized address to vest and deliver tokens manually", async () => {
        // Try to vest tokens for the dedicated accounts as an unauthorized account
        await this.crowdsale.vestDedicatedTokens(
          [funder, thirdParty],
          [vestAmount_funder, vestAmount_thirdParty],
          { from: thirdParty }
        ).should.be.rejected;

        await this.crowdsale.deliverPurchasedTokensManually(
          [funder, thirdParty],
          [vestAmount_funder, vestAmount_thirdParty],
          [vestAmount_funder.div(10), vestAmount_thirdParty.div(10)],
          currentTimestamp + BONUS_TOKEN_RELEASE_TIME,
          { from: thirdParty }
        ).should.be.rejected;
      });

      it("does not release vested tokens before the vesting period expires", async () => {
        let funderPreBalanceToken = await this.token.balanceOf(funder);
        let thirdPartyPreBalanceToken = await this.token.balanceOf(thirdParty);

        // Vest tokens for the dedicated accounts
        await this.crowdsale.vestDedicatedTokens(
          [funder, thirdParty],
          [vestAmount_funder, vestAmount_thirdParty]
        ).should.be.fulfilled;

        // Try release tokens before the vesting period expires
        this.crowdsale.releaseTokens([funder, thirdParty]).should.be.fulfilled;

        // Check token balances
        let funderPostBalanceToken = await this.token.balanceOf(funder);
        let thirdPartyPostBalanceToken = await this.token.balanceOf(thirdParty);
        funderPostBalanceToken.should.be.bignumber.not.equal(
          funderPreBalanceToken.add(vestAmount_funder)
        );
        thirdPartyPostBalanceToken.should.be.bignumber.not.equal(
          thirdPartyPreBalanceToken.add(vestAmount_thirdParty)
        );
      });
    });

    describe("Gas analysis for whitelisting & funding & token vesting & release", () => {
      let currentTimestamp;

      beforeEach(async () => {
        let phaseStartTime = (await getCurrentTimestamp()) + 1;

        // Add funders to whitelist
        await this.crowdsale.addWhitelist([funder, thirdParty, thirdPartyAlt])
          .should.be.fulfilled;

        // Start a phase
        await this.crowdsale.setPhase(
          EXCHANGE_RATE,
          phaseStartTime,
          SALE_PERIOD + phaseStartTime,
          BONUS_RATE
        ).should.be.fulfilled;

        currentTimestamp = await getCurrentTimestamp();

        // Wind EVM time forward so that the sale starts
        await increaseTime(20);
        (await this.crowdsale.isActive()).should.be.true;
      });

      it("adding one address to whitelist", async () => {
        await this.crowdsale.addWhitelist([address5]).should.be.fulfilled;
      });

      it("adding multiple(2) addresses to whitelist", async () => {
        await this.crowdsale.addWhitelist([address5, address6]).should.be
          .fulfilled;
      });

      it("adding multiple(3) addresses to whitelist", async () => {
        await this.crowdsale.addWhitelist([address5, address6, address7]).should
          .be.fulfilled;
      });

      it("adding multiple(4) addresses to whitelist", async () => {
        await this.crowdsale.addWhitelist([
          address5,
          address6,
          address7,
          address8,
        ]).should.be.fulfilled;
      });

      it("funding from one address", async () => {
        await this.crowdsale.sendTransaction({ from: funder, value: ether(1) })
          .should.be.fulfilled;
      });

      it("multiple(2) funding from one address", async () => {
        await this.crowdsale.sendTransaction({ from: funder, value: ether(1) })
          .should.be.fulfilled;
        await this.crowdsale.sendTransaction({ from: funder, value: ether(1) })
          .should.be.fulfilled;
      });

      it("multiple(3) funding from one address", async () => {
        await this.crowdsale.sendTransaction({ from: funder, value: ether(1) })
          .should.be.fulfilled;
        await this.crowdsale.sendTransaction({ from: funder, value: ether(1) })
          .should.be.fulfilled;
        await this.crowdsale.sendTransaction({ from: funder, value: ether(1) })
          .should.be.fulfilled;
      });

      it("funding from multiple(2) addresses", async () => {
        await this.crowdsale.sendTransaction({ from: funder, value: ether(1) })
          .should.be.fulfilled;
        await this.crowdsale.sendTransaction({
          from: thirdParty,
          value: ether(2),
        }).should.be.fulfilled;
      });

      it("funding from multiple(3) addresses", async () => {
        await this.crowdsale.sendTransaction({ from: funder, value: ether(1) })
          .should.be.fulfilled;
        await this.crowdsale.sendTransaction({
          from: thirdParty,
          value: ether(2),
        }).should.be.fulfilled;
        await this.crowdsale.sendTransaction({
          from: thirdPartyAlt,
          value: ether(1.5),
        }).should.be.fulfilled;
      });

      it("manual token delivery for one address", async () => {
        await this.crowdsale.deliverPurchasedTokensManually(
          [funder],
          [vestAmount_funder],
          [calculateBonus(vestAmount_funder, BONUS_RATE)],
          currentTimestamp + BONUS_TOKEN_RELEASE_TIME
        ).should.be.fulfilled;
      });

      it("manual token delivery multiple(2) addresses", async () => {
        await this.crowdsale.deliverPurchasedTokensManually(
          [funder, thirdParty],
          [vestAmount_funder, vestAmount_thirdParty],
          [
            calculateBonus(vestAmount_funder, BONUS_RATE),
            calculateBonus(vestAmount_thirdParty, BONUS_RATE),
          ],
          currentTimestamp + BONUS_TOKEN_RELEASE_TIME
        ).should.be.fulfilled;
      });

      it("manual token delivery multiple(3) addresses", async () => {
        await this.crowdsale.deliverPurchasedTokensManually(
          [funder, thirdParty, thirdPartyAlt],
          [vestAmount_funder, vestAmount_thirdParty, vestAmount_thirdPartyAlt],
          [
            calculateBonus(vestAmount_funder, BONUS_RATE),
            calculateBonus(vestAmount_thirdParty, BONUS_RATE),
            calculateBonus(vestAmount_thirdPartyAlt, BONUS_RATE),
          ],
          currentTimestamp + BONUS_TOKEN_RELEASE_TIME
        ).should.be.fulfilled;
      });

      it("releasing for one address (Funding fee is also included!)", async () => {
        await this.crowdsale.sendTransaction({ from: funder, value: ether(1) })
          .should.be.fulfilled;
        await increaseTime(BONUS_TOKEN_RELEASE_TIME);
        await this.crowdsale.releaseTokens([funder]).should.be.fulfilled;
      });

      it("releasing for multiple(2) addresses (Funding fee is also included!)", async () => {
        await this.crowdsale.sendTransaction({ from: funder, value: ether(1) })
          .should.be.fulfilled;
        await this.crowdsale.sendTransaction({
          from: thirdParty,
          value: ether(2),
        }).should.be.fulfilled;
        await increaseTime(BONUS_TOKEN_RELEASE_TIME);
        await this.crowdsale.releaseTokens([funder, thirdParty]).should.be
          .fulfilled;
      });

      it("releasing for multiple(3) addresses (Funding fee is also included!)", async () => {
        await this.crowdsale.sendTransaction({ from: funder, value: ether(1) })
          .should.be.fulfilled;
        await this.crowdsale.sendTransaction({
          from: thirdParty,
          value: ether(2),
        }).should.be.fulfilled;
        await this.crowdsale.sendTransaction({
          from: thirdPartyAlt,
          value: ether(1.5),
        }).should.be.fulfilled;
        await increaseTime(BONUS_TOKEN_RELEASE_TIME);
        await this.crowdsale.releaseTokens([funder, thirdParty, thirdPartyAlt])
          .should.be.fulfilled;
      });
    });
  }
);
