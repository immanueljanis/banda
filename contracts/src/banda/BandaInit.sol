// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
import {LibBandaStorage} from "./libraries/LibBandaStorage.sol";

contract BandaInit {
    function init(address settlement, address registry, address accountImplementation) external {
        LibBandaStorage.AppStorage storage s = LibBandaStorage.appStorage();
        require(!s.initialized, "Banda: initialized");
        require(
            settlement.code.length != 0 && registry.code.length != 0 && accountImplementation.code.length != 0,
            "Banda: invalid dependency"
        );
        s.initialized = true;
        s.settlement = settlement;
        s.accountRegistry = registry;
        s.accountImplementation = accountImplementation;
    }
}
