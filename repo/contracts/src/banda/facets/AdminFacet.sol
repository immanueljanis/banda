// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {LibDiamond} from "../../diamond/libraries/LibDiamond.sol";
import {LibBandaStorage} from "../libraries/LibBandaStorage.sol";

/// @notice Administrative configuration only. This facet has no asset withdrawal path.
contract AdminFacet {
    event PauseSet(bool paused);
    event NavGuardConfigured(address indexed adapter, uint48 maxAge);
    event StrategyConfigured(
        uint32 indexed strategyId,
        address indexed strategy,
        uint96 minimumDeposit,
        uint16 annualFeeBps,
        address feeRecipient,
        bool enabled
    );

    function configureStrategy(
        uint32 strategyId,
        address strategy,
        uint96 minimumDeposit,
        uint16 annualFeeBps,
        address feeRecipient,
        bool enabled
    ) external {
        LibDiamond.enforceIsContractOwner();
        require(strategy.code.length != 0, "Banda: invalid strategy");
        require(annualFeeBps <= 10_000 && feeRecipient != address(0), "Banda: invalid fee");
        LibBandaStorage.AppStorage storage s = LibBandaStorage.appStorage();
        if (strategyId == 0) {
            strategyId = ++s.nextStrategyId;
            s.strategies[strategyId] = LibBandaStorage.StrategyConfig({
                strategy: strategy,
                minimumDeposit: minimumDeposit,
                annualFeeBps: annualFeeBps,
                feeRecipient: feeRecipient,
                enabled: enabled
            });
        } else {
            require(strategyId <= s.nextStrategyId, "Banda: strategy missing");
            LibBandaStorage.StrategyConfig storage existing = s.strategies[strategyId];
            // A live basket must never be silently moved to a different strategy.
            require(
                existing.strategy == strategy && existing.minimumDeposit == minimumDeposit
                    && existing.annualFeeBps == annualFeeBps && existing.feeRecipient == feeRecipient,
                "Banda: immutable mandate"
            );
            existing.enabled = enabled;
        }
        emit StrategyConfigured(strategyId, strategy, minimumDeposit, annualFeeBps, feeRecipient, enabled);
    }

    function setPaused(bool paused) external {
        LibDiamond.enforceIsContractOwner();
        LibBandaStorage.appStorage().paused = paused;
        emit PauseSet(paused);
    }

    function configureNavGuard(address adapter, uint48 maxAge) external {
        LibDiamond.enforceIsContractOwner();
        require(adapter.code.length != 0 && maxAge != 0, "Banda: invalid NAV guard");
        LibBandaStorage.AppStorage storage s = LibBandaStorage.appStorage();
        s.navAdapter = adapter;
        s.maxNavAge = maxAge;
        emit NavGuardConfigured(adapter, maxAge);
    }
}
