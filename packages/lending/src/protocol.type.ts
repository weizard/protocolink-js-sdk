import BigNumberJS from 'bignumber.js';
import * as common from '@protocolink/common';

export interface Market {
  id: string;
  chainId: number;
}

export const defaultInterestRateMode = 2;

export const defaultSlippage = 100;

export type Operation =
  | 'deposit'
  | 'withdraw'
  | 'borrow'
  | 'repay'
  | 'open'
  | 'close'
  | 'collateral_swap'
  | 'debt_swap'
  | 'leverage'
  | 'deleverage';

export interface AssetInfo {
  token: common.Token;
  price: string;
  formattedPrice: string;
  balance: string;
  formattedBalance: string;
  apy: string;
  formattedAPY: string;
}

export interface SupplyObject {
  token: common.Token;
  price: string;
  balance: string;
  apy: string;
  usageAsCollateralEnabled: boolean;
  ltv: string;
  liquidationThreshold: string;
  isNotCollateral?: boolean;
  supplyCap?: string;
  totalSupply: string;
}

export interface BorrowObject {
  token: common.Token;
  price: string;
  balances: string[];
  apys: string[];
  borrowMin?: string;
  borrowCap?: string;
  totalBorrow: string;
}

export interface SupplyParams {
  marketId: string;
  input: common.TokenAmount;
}

export interface SupplyFields {
  input: common.TokenAmountObject;
  output?: common.TokenAmountObject;
  balanceBps?: number;
}

export interface WithdrawParams {
  marketId: string;
  output: common.TokenAmount;
}

export interface WithdrawFields {
  input?: common.TokenAmountObject;
  output: common.TokenAmountObject;
  balanceBps?: number;
}

export interface BorrowParams {
  marketId: string;
  output: common.TokenAmount;
}

export interface BorrowFields {
  output: common.TokenAmountObject;
}

export interface RepayParams {
  marketId: string;
  input: common.TokenAmount;
  account: string;
}

export interface RepayFields {
  input: common.TokenAmountObject;
  borrower: string;
  balanceBps?: number;
}

export interface AdjustHealthRateInput {
  leverageToken: common.Token;
  deleverageToken: common.Token;
  targetHealthRate: BigNumberJS.Value;
}

export type AdjustHealthRateOutput =
  | { error: string }
  | {
      operation: 'leverageByCollateral' | 'deleverage';
      srcToken: common.Token;
      srcAmount: string;
      destToken: common.Token;
    };
