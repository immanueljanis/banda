// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {LibBandaStorage} from "./libraries/LibBandaStorage.sol";

/// @notice One-time diamondCut initializer that moves settlement to a new token.
/// @dev Refuses while any basket is still open, so no position can be stranded on the old token.
contract SettlementMigrationInit {
    event SettlementMigrated(address indexed previous, address indexed current);

    function init(address settlement) external {
        LibBandaStorage.AppStorage storage s = LibBandaStorage.appStorage();
        require(s.initialized && settlement.code.length != 0 && settlement != s.settlement, "Banda: invalid settlement");
        for (uint256 tokenId = 1; tokenId <= s.nextTokenId; ++tokenId) {
            require(s.baskets[tokenId].account == address(0), "Banda: open basket");
        }
        emit SettlementMigrated(s.settlement, settlement);
        s.settlement = settlement;
    }
}
