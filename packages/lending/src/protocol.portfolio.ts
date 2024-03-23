import { AdjustHealthRateInput, AdjustHealthRateOutput, AssetInfo, BorrowObject, SupplyObject } from './protocol.type';
import BigNumberJS from 'bignumber.js';
import {
  abbreviateUSD,
  calcHealthRate,
  calcNetAPY,
  calcUtilization,
  formatPercentage,
  toLessThanString,
  toSignificantDigits,
} from './protocol.utils';
import * as common from '@protocolink/common';

export class Supply implements AssetInfo {
  token: common.Token;
  price: string;
  balance: string;
  apy: string;
  usageAsCollateralEnabled: boolean;
  ltv: string;
  liquidationThreshold: string;
  isNotCollateral: boolean;
  supplyCap: string;
  totalSupply: string;

  constructor({
    token,
    price,
    balance,
    apy,
    usageAsCollateralEnabled,
    ltv,
    liquidationThreshold,
    isNotCollateral = false,
    supplyCap = '0',
    totalSupply,
  }: SupplyObject) {
    this.token = token;
    this.price = price;
    this.balance = balance;
    this.apy = apy;
    this.usageAsCollateralEnabled = usageAsCollateralEnabled;
    this.ltv = ltv;
    this.liquidationThreshold = liquidationThreshold;
    this.isNotCollateral = isNotCollateral;
    this.supplyCap = supplyCap;
    this.totalSupply = totalSupply;
  }

  get isCollateral() {
    return !this.isNotCollateral;
  }

  get isZero() {
    return Number(this.balance) === 0;
  }

  get formattedPrice() {
    return abbreviateUSD(this.price);
  }

  get formattedBalance() {
    return toLessThanString(toSignificantDigits(this.balance, 4), 6);
  }

  get formattedAPY() {
    return formatPercentage(this.apy);
  }

  add(amount: string) {
    this.balance = new BigNumberJS(this.balance).plus(amount).toFixed();
  }

  sub(amount: string) {
    this.balance = new BigNumberJS(this.balance).minus(amount).toFixed();
  }

  getMaxWithdrawAmount(amount: string) {
    return new BigNumberJS(amount).gt(this.balance) ? this.balance : amount;
  }

  validateWithdraw(currentWithdrawAmount: string) {
    return new BigNumberJS(currentWithdrawAmount).lte(this.balance);
  }

  validateSupplyCap(currentSupplyAmount: string) {
    return this.supplyCap === '0' || new BigNumberJS(this.totalSupply).plus(currentSupplyAmount).lte(this.supplyCap);
  }
}

export function isSupply(v: any): v is Supply {
  return v instanceof Supply;
}

export class Borrow implements AssetInfo {
  token: common.Token;
  price: string;
  balances: string[];
  apys: string[];
  borrowMin: string;
  borrowCap: string;
  totalBorrow: string;

  constructor({ token, price, balances, apys, borrowMin = '0', borrowCap = '0', totalBorrow }: BorrowObject) {
    this.token = token;
    this.price = price;
    this.balances = [...balances];
    this.apys = [...apys];
    this.borrowMin = borrowMin;
    this.borrowCap = borrowCap;
    this.totalBorrow = totalBorrow;
  }

  get formattedPrice() {
    return abbreviateUSD(this.price);
  }

  get balance() {
    return this.balances.reduce((sum, balance) => sum.plus(balance), new BigNumberJS(0)).toFixed();
  }

  get formattedBalance() {
    return toLessThanString(toSignificantDigits(this.balance, 4), 6);
  }

  get isZero() {
    return Number(this.balance) === 0;
  }

  get apy() {
    return this.apys[0];
  }

  get formattedAPY() {
    return formatPercentage(this.apy);
  }

  add(amount: string) {
    this.balances[0] = new BigNumberJS(this.balances[0]).plus(amount).toFixed();
  }

  sub(amount: string) {
    this.balances[0] = new BigNumberJS(this.balances[0]).minus(amount).toFixed();
  }

  getMaxRepayAmount(repayAmount: string) {
    return new BigNumberJS(repayAmount).gt(this.balances[0]) ? this.balances[0] : repayAmount;
  }

  validateRepay(currentRepayAmount: string) {
    return new BigNumberJS(currentRepayAmount).lte(this.balances[0]);
  }

  validateBorrowMin(currentBorrowAmount: string) {
    return this.borrowMin == '0' || new BigNumberJS(this.balances[0]).plus(currentBorrowAmount).gte(this.borrowMin);
  }

  validateBorrowCap(currentBorrowAmount: string) {
    return this.borrowCap === '0' || new BigNumberJS(this.totalBorrow).plus(currentBorrowAmount).lte(this.borrowCap);
  }
}

export function isBorrow(v: any): v is Borrow {
  return v instanceof Borrow;
}

export class Portfolio {
  chainId: number;
  protocolId: string;
  marketId: string;
  supplies: Supply[] = [];
  supplyMap: { [key in string]?: Supply } = {};
  borrows: Borrow[] = [];
  borrowMap: { [key in string]?: Borrow } = {};

  totalSupplyUSD = new BigNumberJS(0);
  totalCollateralUSD = new BigNumberJS(0);
  positiveProportion = new BigNumberJS(0);
  totalBorrowUSD = new BigNumberJS(0);
  totalBorrowCapacityUSD = new BigNumberJS(0);
  negativeProportion = new BigNumberJS(0);
  liquidationLimit = new BigNumberJS(0);

  constructor(
    chainId: number,
    protocolId: string,
    marketId: string,
    supplies: SupplyObject[],
    borrows: BorrowObject[]
  ) {
    this.chainId = chainId;
    this.protocolId = protocolId;
    this.marketId = marketId;

    for (let i = 0; i < supplies.length; i++) {
      const supply = new Supply(supplies[i]);
      this.supplies.push(supply);
      this.supplyMap[supply.token.address] = supply;
      this.supply(supply);
    }

    for (let i = 0; i < borrows.length; i++) {
      const borrow = new Borrow(borrows[i]);
      this.borrows.push(borrow);
      this.borrowMap[borrow.token.address] = borrow;
      this.borrow(borrow);
    }
  }

  get nonZeroSupplies() {
    return this.supplies.filter((supply) => !supply.isZero);
  }

  get collaterals() {
    return this.supplies.filter((supply) => supply.isCollateral);
  }

  get nonZeroBorrows() {
    return this.borrows.filter((borrow) => !borrow.isZero);
  }

  get nonZeroBorrowsForRepay() {
    return this.borrows.filter((borrow) => Number(borrow.balances[0]) > 0);
  }

  get availableBorrowCapacityUSD() {
    return this.totalBorrowCapacityUSD.gte(this.totalBorrowUSD)
      ? this.totalBorrowCapacityUSD.minus(this.totalBorrowUSD)
      : new BigNumberJS(0);
  }

  get hasBorrowCapacity() {
    return !this.availableBorrowCapacityUSD.isZero();
  }

  get utilization() {
    return this.totalBorrowCapacityUSD.isZero()
      ? this.totalBorrowUSD.isZero()
        ? '0'
        : '1'
      : this.hasBorrowCapacity
      ? calcUtilization(this.totalBorrowCapacityUSD, this.totalBorrowUSD)
      : '1';
  }

  get formattedUtilization() {
    return formatPercentage(this.utilization);
  }

  get liquidationThreshold() {
    return this.totalCollateralUSD.isZero() ? '0' : this.liquidationLimit.div(this.totalCollateralUSD).toString();
  }

  get formattedLiquidationThreshold() {
    return formatPercentage(this.liquidationThreshold.toString());
  }

  get healthRate() {
    return calcHealthRate(this.totalCollateralUSD, this.totalBorrowUSD, this.liquidationLimit);
  }

  get formattedHealthRate() {
    return this.healthRate === 'Infinity' ? '∞' : common.formatBigUnit(this.healthRate, 2);
  }

  // more 1 BPS to ensure that transaction sending won't be hindered by discrepancies in contract calculations
  get isHealthy() {
    return new BigNumberJS(this.healthRate).gt(1.0001);
  }

  get netAPY() {
    return calcNetAPY(this.totalSupplyUSD, this.positiveProportion, this.totalBorrowUSD, this.negativeProportion);
  }

  get formattedNetAPY() {
    return formatPercentage(this.netAPY);
  }

  get formattedTotalSupplyUSD() {
    return abbreviateUSD(this.totalSupplyUSD.toFixed());
  }

  get formattedTotalBorrowUSD() {
    return abbreviateUSD(this.totalBorrowUSD.toFixed());
  }

  get formattedAvailableBorrowCapacityUSD() {
    return abbreviateUSD(this.availableBorrowCapacityUSD.toFixed());
  }

  get hasPositions() {
    return this.nonZeroSupplies.length > 0 || this.nonZeroBorrows.length > 0;
  }

  get canWithdraw() {
    return this.totalSupplyUSD.gt(0) && this.isHealthy;
  }

  get canBorrow() {
    return this.totalBorrowCapacityUSD.gt(0) && this.hasBorrowCapacity;
  }

  get canRepay() {
    return this.nonZeroBorrowsForRepay.length > 0;
  }

  clone() {
    return new Portfolio(this.chainId, this.protocolId, this.marketId, this.supplies, this.borrows);
  }

  findSupply(token: common.Token) {
    return this.supplyMap[token.unwrapped.address] ?? this.supplyMap[token.address];
  }

  findBorrow(token: common.Token) {
    return this.borrowMap[token.unwrapped.address] ?? this.borrowMap[token.address];
  }

  calcLeverageTimes(leverageToken: common.Token, afterPortfolio: Portfolio) {
    let leverageTimes = '0';

    if (!this.availableBorrowCapacityUSD.isZero()) {
      const supply = this.findSupply(leverageToken);
      const afterSupply = afterPortfolio.findSupply(leverageToken);
      if (supply && afterSupply) {
        const leverageUSD = new BigNumberJS(afterSupply.balance).minus(supply.balance).times(supply.price);
        leverageTimes = leverageUSD.div(this.availableBorrowCapacityUSD).toFixed();
      }
    }

    return leverageTimes;
  }

  calcMaxLeverageTimes(token: common.Token) {
    let maxLeverageTimes = '0';

    const supply = this.findSupply(token);
    if (supply) {
      maxLeverageTimes = new BigNumberJS(1).div(new BigNumberJS(1).minus(supply.ltv)).toFixed();
    }

    return maxLeverageTimes;
  }

  /**
   *
   * @param leverageToken token which be deposited in leverage
   * @param deleverageToken token which be borrowed in leverage
   * @param targetHealthRate
   */
  adjustHealthRate({
    leverageToken,
    deleverageToken,
    targetHealthRate,
  }: AdjustHealthRateInput): AdjustHealthRateOutput {
    const supply = this.findSupply(leverageToken);
    const borrow = this.findBorrow(deleverageToken);
    if (!supply || !borrow) return { error: `non support token` };

    let operation: 'leverageByCollateral' | 'deleverage' = 'leverageByCollateral';

    const supplyLiquidationThreshold = new BigNumberJS(supply.liquidationThreshold);
    const _targetHealthRate = new BigNumberJS(targetHealthRate);

    let srcToken: common.Token, destToken: common.Token;
    let srcAmount = '0';

    if (this.totalCollateralUSD.isZero()) return { error: `can't leverage without collateral` };
    if (this.totalBorrowUSD.isZero() || _targetHealthRate.lt(this.healthRate)) {
      operation = 'leverageByCollateral';
      [srcToken, destToken] = [leverageToken, deleverageToken];

      const supplyUSD = this.liquidationLimit
        .minus(_targetHealthRate.times(this.totalBorrowUSD))
        .div(_targetHealthRate.minus(supplyLiquidationThreshold));
      srcAmount = supplyUSD.div(supply.price).toFixed(leverageToken.decimals, 1);
    } else {
      operation = 'deleverage';
      [srcToken, destToken] = [deleverageToken, leverageToken];

      const withdrawUSD = this.liquidationLimit
        .minus(_targetHealthRate.times(this.totalBorrowUSD))
        .div(supplyLiquidationThreshold.minus(targetHealthRate));
      // repay token amount
      srcAmount = withdrawUSD.div(borrow.price).toFixed(deleverageToken.decimals, 1);
    }

    return { operation, srcToken, srcAmount, destToken };
  }

  supply(supply: Supply): void;
  supply(token: common.Token, amount: string): void;
  supply(arg0: any, arg1?: any) {
    let supply: Supply;
    let amount: string;
    if (isSupply(arg0)) {
      supply = arg0;
      amount = supply.balance;
    } else {
      const found = this.findSupply(arg0);
      if (!found) return;
      supply = found;
      amount = arg1;
      supply.add(amount);
    }
    if (Number(amount) === 0) return;

    const { price, apy, usageAsCollateralEnabled, ltv, liquidationThreshold } = supply;

    const supplyUSD = new BigNumberJS(amount).times(price);
    this.totalSupplyUSD = this.totalSupplyUSD.plus(supplyUSD);
    this.positiveProportion = this.positiveProportion.plus(supplyUSD.times(apy));
    if (usageAsCollateralEnabled) {
      this.totalCollateralUSD = this.totalCollateralUSD.plus(supplyUSD);
      this.totalBorrowCapacityUSD = this.totalBorrowCapacityUSD.plus(supplyUSD.times(ltv));
      this.liquidationLimit = this.liquidationLimit.plus(supplyUSD.times(liquidationThreshold));
    }
  }

  withdraw(token: common.Token, amount: string) {
    if (Number(amount) === 0) return;

    const supply = this.findSupply(token);
    if (!supply) return;
    amount = supply.getMaxWithdrawAmount(amount);
    supply.sub(amount);

    const { price, apy, usageAsCollateralEnabled, ltv, liquidationThreshold } = supply;

    const withdrawUSD = new BigNumberJS(amount).times(price);
    this.totalSupplyUSD = this.totalSupplyUSD.minus(withdrawUSD);
    this.positiveProportion = this.positiveProportion.minus(withdrawUSD.times(apy));
    if (usageAsCollateralEnabled) {
      this.totalCollateralUSD = this.totalCollateralUSD.minus(withdrawUSD);
      this.totalBorrowCapacityUSD = this.totalBorrowCapacityUSD.minus(withdrawUSD.times(ltv));
      this.liquidationLimit = this.liquidationLimit.minus(withdrawUSD.times(liquidationThreshold));
    }
  }

  borrow(borrow: Borrow): void;
  borrow(token: common.Token, amount: string): void;
  borrow(arg0: any, arg1?: any) {
    if (isBorrow(arg0)) {
      const borrow = arg0;
      for (let i = 0; i < borrow.balances.length; i++) {
        const balance = borrow.balances[i];
        if (Number(balance) === 0) continue;

        const balanceUSD = new BigNumberJS(balance).times(borrow.price);
        this.totalBorrowUSD = this.totalBorrowUSD.plus(balanceUSD);
        this.negativeProportion = this.negativeProportion.plus(balanceUSD.times(borrow.apys[i]));
      }
    } else {
      const amount = arg1;
      if (Number(amount) === 0) return;

      const borrow = this.findBorrow(arg0);
      if (!borrow) return;
      borrow.add(amount);

      const { price, apy } = borrow;

      const borrowUSD = new BigNumberJS(amount).times(price);
      this.totalBorrowUSD = this.totalBorrowUSD.plus(borrowUSD);
      this.negativeProportion = this.negativeProportion.plus(borrowUSD.times(apy));
    }
  }

  repay(token: common.Token, amount: string) {
    if (Number(amount) === 0) return;

    const borrow = this.findBorrow(token);
    if (!borrow) return;
    amount = borrow.getMaxRepayAmount(amount);
    borrow.sub(amount);

    const { price, apy } = borrow;

    const repayUSD = new BigNumberJS(amount).times(price);
    this.totalBorrowUSD = this.totalBorrowUSD.minus(repayUSD);
    this.negativeProportion = this.negativeProportion.minus(repayUSD.times(apy));
  }

  toJSON() {
    return {
      chainId: this.chainId,
      protocolId: this.protocolId,
      marketId: this.marketId,
      utilization: this.utilization,
      healthRate: this.healthRate,
      netAPY: this.netAPY,
      totalSupplyUSD: this.totalSupplyUSD.toFixed(),
      totalBorrowUSD: this.totalBorrowUSD.toFixed(),
      supplies: this.supplies,
      borrows: this.borrows,
    };
  }
}
