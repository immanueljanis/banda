// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {LibBandaStorage} from "../libraries/LibBandaStorage.sol";
import {LibNavGuard} from "../libraries/LibNavGuard.sol";

/// @notice Exposes the active NAV guard configuration and validates read-only quotes.
contract NavGuardFacet {
    function navGuard() external view returns (address adapter, uint48 maxAge) {
        LibBandaStorage.AppStorage storage s = LibBandaStorage.appStorage();
        return (s.navAdapter, s.maxNavAge);
    }

    function navBlockLag() external view returns (uint48) {
        return LibBandaStorage.appStorage().maxNavBlockLag;
    }

    function previewNav(address strategy, uint256 shares) external view returns (uint256 grossAssets) {
        return LibNavGuard.requireValidQuote(strategy, shares);
    }
}
