// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @dev Test-only settlement NAV source. Values use 1e18 price precision.
contract MockNavAdapter {
    uint256 public price = 1e18;
    uint256 public updatedAt;
    uint256 public observedBlock;
    bool public valid = true;

    constructor() {
        updatedAt = block.timestamp;
        observedBlock = block.number;
    }

    function setQuote(uint256 price_, uint256 updatedAt_, uint256 observedBlock_, bool valid_) external {
        price = price_;
        updatedAt = updatedAt_;
        observedBlock = observedBlock_;
        valid = valid_;
    }

    function quote(address, uint256 shares)
        external
        view
        returns (uint256 grossAssets, uint256 quoteUpdatedAt, uint256 quoteObservedBlock, bool quoteValid)
    {
        return (shares * price / 1e18, updatedAt, observedBlock, valid);
    }
}
