// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Implemented by strategies whose positions are held as tokens inside the basket account.
/// @dev The diamond moves the returned amounts from the account to the strategy before calling redeem.
interface IBasketHoldings {
    function holdingsFor(address account, uint256 shares)
        external
        view
        returns (address[] memory tokens, uint256[] memory amounts);
}
