/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from 'ethers';
import type { Provider } from '@ethersproject/providers';
import type { SparkFlashLoanCallback, SparkFlashLoanCallbackInterface } from '../SparkFlashLoanCallback';

const _abi = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'router_',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'sparkProvider_',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'feeRate_',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'asset',
        type: 'address',
      },
    ],
    name: 'InvalidBalance',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidCaller',
    type: 'error',
  },
  {
    inputs: [],
    name: 'sparkProvider',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address[]',
        name: 'assets',
        type: 'address[]',
      },
      {
        internalType: 'uint256[]',
        name: 'amounts',
        type: 'uint256[]',
      },
      {
        internalType: 'uint256[]',
        name: 'premiums',
        type: 'uint256[]',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
      {
        internalType: 'bytes',
        name: 'params',
        type: 'bytes',
      },
    ],
    name: 'executeOperation',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'feeRate',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'metadata',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'router',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export class SparkFlashLoanCallback__factory {
  static readonly abi = _abi;
  static createInterface(): SparkFlashLoanCallbackInterface {
    return new utils.Interface(_abi) as SparkFlashLoanCallbackInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): SparkFlashLoanCallback {
    return new Contract(address, _abi, signerOrProvider) as SparkFlashLoanCallback;
  }
}