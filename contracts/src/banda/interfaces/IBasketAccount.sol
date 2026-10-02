// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IBasketAccount {
    function execute(address target, uint256 value, bytes calldata data) external returns (bytes memory result);
}
