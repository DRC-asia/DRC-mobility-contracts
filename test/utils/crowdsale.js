function calculateBonus(tokenAmount, bonusRate) {
  return tokenAmount.mul(bonusRate).div(10000);
}

module.exports = {
  calculateBonus
}