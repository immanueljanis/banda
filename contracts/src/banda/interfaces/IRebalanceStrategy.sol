// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IRebalanceStrategy {
    function rebalance(address account, uint16 targetBps) external returns (uint256 sharesAfter);
}
