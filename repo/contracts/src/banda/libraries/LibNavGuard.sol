// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {INavAdapter} from "../interfaces/INavAdapter.sol";
import {LibBandaStorage} from "./LibBandaStorage.sol";

library LibNavGuard {
    function requireValidQuote(address strategy, uint256 shares) internal view returns (uint256 grossAssets) {
        LibBandaStorage.AppStorage storage s = LibBandaStorage.appStorage();
        require(s.navAdapter != address(0) && s.maxNavAge != 0, "Banda: nav guard unconfigured");
        uint256 updatedAt;
        uint256 observedBlock;
        bool valid;
        (grossAssets, updatedAt, observedBlock, valid) = INavAdapter(s.navAdapter).quote(strategy, shares);
        require(valid && grossAssets != 0, "Banda: invalid NAV");
        require(updatedAt <= block.timestamp && block.timestamp - updatedAt <= s.maxNavAge, "Banda: stale NAV");
        require(observedBlock == block.number, "Banda: mixed-block NAV");
    }
}
