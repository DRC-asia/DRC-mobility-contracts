const { decodeLogs } = require("./utils/decodeLogs");
const { ether } = require("./utils/ether");
const DreamCarToken = artifacts.require("DreamCarToken");
const Airdrop = artifacts.require("DreamCarAirdrop");
const BigNumber = web3.BigNumber;
require("chai")
  .use(require("chai-bignumber")(BigNumber))
  .use(require("chai-as-promised"))
  .should();

const NAME = "DREAM_CAR Protocol";
const SYMBOL = "DREAM_CAR";
const DECIMALS = 18;
const INITIAL_SUPPLY = 1250000000; // 1.25 Billion DREAM_CAR tokens

contract("Airdrop", ([creator, addr1, addr2, addr3, addr4, addr5]) => {
  const airdropFund = new BigNumber("10000e18"); // 10000 DREAM_CAR tokens
  const withdrawalAmount = new BigNumber("100e18"); // 100 DREAM_CAR tokens
  const airdrop1 = new BigNumber("100e18");
  const airdrop2 = new BigNumber("200e18");
  const airdrop3 = new BigNumber("300e18");
  const airdrop4 = new BigNumber("400e18");
  const airdrop5 = new BigNumber("500e18");

  beforeEach(async () => {
    this.token = await DreamCarToken.new(
      NAME,
      SYMBOL,
      DECIMALS,
      INITIAL_SUPPLY
    );
    this.airdrop = await Airdrop.new(this.token.address, { amount: ether(5) });
  });

  describe("Airdrop::functions", () => {
    it("sets token to be airdropped", async () => {
      let newToken = await DreamCarToken.new(
        NAME,
        SYMBOL,
        DECIMALS,
        INITIAL_SUPPLY
      );
      await this.airdrop.setToken(newToken.address).should.be.fulfilled;

      let tokenAddr = await this.airdrop.getToken();

      tokenAddr.should.be.equal(newToken.address);
    });

    it("withdraws token from the contract", async () => {
      let preBalance;
      let postBalance;
      // First fund the airdrop contract with some tokens
      await this.token.transfer(this.airdrop.address, airdropFund).should.be
        .fulfilled;
      preBalance = await this.token.balanceOf(this.airdrop.address);
      // Withdraw some tokens
      await this.airdrop.withdrawToken(withdrawalAmount).should.be.fulfilled;

      postBalance = await this.token.balanceOf(this.airdrop.address);
      postBalance.should.be.bignumber.equal(preBalance.sub(withdrawalAmount));
    });

    it("sends airdrops to airdropees", async () => {
      // First fund the airdrop contract with some tokens
      await this.token.transfer(this.airdrop.address, airdropFund).should.be
        .fulfilled;

      await this.airdrop.bulkAirdrop(
        [addr1, addr2, addr3, addr4, addr5],
        [airdrop1, airdrop2, airdrop3, airdrop4, airdrop5]
      ).should.be.fulfilled;

      let balance = await this.token.balanceOf(addr1);
      balance.should.be.bignumber.equal(airdrop1);

      balance = await this.token.balanceOf(addr2);
      balance.should.be.bignumber.equal(airdrop2);

      balance = await this.token.balanceOf(addr3);
      balance.should.be.bignumber.equal(airdrop3);

      balance = await this.token.balanceOf(addr4);
      balance.should.be.bignumber.equal(airdrop4);

      balance = await this.token.balanceOf(addr5);
      balance.should.be.bignumber.equal(airdrop5);
    });

    it("sends 1 airdrops to airdropees", async () => {
      // First fund the airdrop contract with some tokens
      await this.token.transfer(this.airdrop.address, airdropFund).should.be
        .fulfilled;

      await this.airdrop.bulkAirdrop([addr1], [airdrop1]).should.be.fulfilled;

      let balance = await this.token.balanceOf(addr1);
      balance.should.be.bignumber.equal(airdrop1);
    });

    it("sends 2 airdrops to airdropees", async () => {
      // First fund the airdrop contract with some tokens
      await this.token.transfer(this.airdrop.address, airdropFund).should.be
        .fulfilled;

      await this.airdrop.bulkAirdrop([addr1, addr2], [airdrop1, airdrop2])
        .should.be.fulfilled;

      let balance = await this.token.balanceOf(addr1);
      balance.should.be.bignumber.equal(airdrop1);

      balance = await this.token.balanceOf(addr2);
      balance.should.be.bignumber.equal(airdrop2);
    });
  });

  describe("Airdrop::authority", () => {
    it("does not allows an unauthorized address to set token to be airdropped", async () => {
      let newToken = await DreamCarToken.new(
        NAME,
        SYMBOL,
        DECIMALS,
        INITIAL_SUPPLY
      );
      await this.airdrop.setToken(newToken.address, { from: addr1 }).should.be
        .rejected;
    });

    it("does not allow an unauthorized address to withdraw token from the contract", async () => {
      await this.token.transfer(this.airdrop.address, airdropFund).should.be
        .fulfilled;
      // Withdraw some tokens
      await this.airdrop.withdrawToken(withdrawalAmount, { from: addr1 }).should
        .be.rejected;
    });

    it("does not allow an unauthorized address to withdraw ether from the contract", async () => {
      await this.airdrop.withdrawToken(ether(1), { from: addr1 }).should.be
        .rejected;
    });

    it("does not allow an unauthorized address to send airdrops to airdropees", async () => {
      await this.airdrop.bulkAirdrop(
        [addr1, addr2, addr3, addr4, addr5],
        [airdrop1, airdrop2, airdrop3, airdrop4, airdrop5],
        { from: addr1 }
      ).should.be.rejected;
    });
  });
});
