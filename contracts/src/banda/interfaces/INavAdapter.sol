// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Read-only boundary for a recent, settlement-denominated strategy quote.
interface INavAdapter {
    function quote(address strategy, uint256 shares)
        external
        view
        returns (uint256 grossAssets, uint256 updatedAt, uint256 observedBlock, bool valid);
}
