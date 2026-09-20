// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
import {LibBandaStorage} from "../libraries/LibBandaStorage.sol";

contract BasketViewFacet {
    function settlementAsset() external view returns (address) {
        return LibBandaStorage.appStorage().settlement;
    }

    function isPaused() external view returns (bool) {
        return LibBandaStorage.appStorage().paused;
    }

    function strategy(uint32 strategyId)
        external
        view
        returns (address assetStrategy, uint96 minimumDeposit, uint16 annualFeeBps, address feeRecipient, bool enabled)
    {
        LibBandaStorage.StrategyConfig storage c = LibBandaStorage.appStorage().strategies[strategyId];
        return (c.strategy, c.minimumDeposit, c.annualFeeBps, c.feeRecipient, c.enabled);
    }

    function basket(uint256 tokenId) external view returns (uint32 strategyId, address account, uint128 shares) {
        LibBandaStorage.Basket storage b = LibBandaStorage.appStorage().baskets[tokenId];
        require(b.account != address(0), "Banda: basket missing");
        return (b.strategyId, b.account, b.shares);
    }

    function feeState(uint256 tokenId) external view returns (uint128 liability, uint40 checkpoint, uint256 remainder) {
        LibBandaStorage.Basket storage b = LibBandaStorage.appStorage().baskets[tokenId];
        require(b.account != address(0), "Banda: basket missing");
        return (b.feeLiability, b.feeCheckpoint, b.feeRemainder);
    }
}
