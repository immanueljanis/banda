// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "../interfaces/IERC20.sol";
import {IManagedStrategy} from "../interfaces/IManagedStrategy.sol";
import {IBasketAccount} from "../interfaces/IBasketAccount.sol";
import {LibBandaStorage} from "../libraries/LibBandaStorage.sol";
import {LibNavGuard} from "../libraries/LibNavGuard.sol";
import {BasketNFTFacet} from "./BasketNFTFacet.sol";

/// @notice Redeems a requested fraction of the basket's strategy shares.
/// @dev Fees and multi-asset routes belong to their own facets; this is the validated single-strategy lifecycle.
contract RedeemFacet is BasketNFTFacet {
    uint256 private constant FEE_DENOMINATOR = 365 days * 10_000;

    event BasketRedeemed(
        uint256 indexed tokenId,
        address indexed recipient,
        uint256 shares,
        uint256 grossAssets,
        uint256 fee,
        bool closed
    );

    function redeem(uint256 tokenId, uint256 shares, uint256 minAssetsOut) external returns (uint256 assets) {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Banda: not basket authority");
        LibBandaStorage.AppStorage storage s = LibBandaStorage.appStorage();
        require(!s.depositEntered, "Banda: lifecycle busy");
        s.depositEntered = true;
        LibBandaStorage.Basket storage b = s.baskets[tokenId];
        require(shares != 0 && shares <= b.shares, "Banda: invalid shares");
        address owner_ = ownerOf(tokenId);
        LibBandaStorage.StrategyConfig storage config = s.strategies[b.strategyId];
        address strategy = config.strategy;
        _checkpointFee(b, config);
        uint256 fee = shares == b.shares ? b.feeLiability : uint256(b.feeLiability) * shares / b.shares;
        IERC20 settlement = IERC20(s.settlement);
        uint256 beforeBalance = settlement.balanceOf(address(this));
        IBasketAccount(b.account)
            .execute(strategy, 0, abi.encodeCall(IManagedStrategy.redeem, (shares, address(this), b.account)));
        assets = settlement.balanceOf(address(this)) - beforeBalance;
        require(assets != 0, "Banda: empty redeem");
        require(assets >= fee, "Banda: fee exceeds proceeds");
        require(assets - fee >= minAssetsOut, "Banda: minimum payout");
        b.shares -= uint128(shares);
        b.feeLiability -= uint128(fee);
        if (fee != 0) require(settlement.transfer(config.feeRecipient, fee), "Banda: fee transfer failed");
        require(settlement.transfer(owner_, assets - fee), "Banda: payout failed");
        bool closed = b.shares == 0;
        if (closed) {
            delete s.baskets[tokenId];
            _burn(tokenId);
        }
        s.depositEntered = false;
        emit BasketRedeemed(tokenId, owner_, shares, assets, fee, closed);
    }

    function previewRedeem(uint256 tokenId, uint256 shares)
        external
        view
        returns (uint256 grossAssets, uint256 fee, uint256 netAssets)
    {
        LibBandaStorage.AppStorage storage s = LibBandaStorage.appStorage();
        LibBandaStorage.Basket storage b = s.baskets[tokenId];
        require(b.account != address(0) && shares != 0 && shares <= b.shares, "Banda: invalid shares");
        LibBandaStorage.StrategyConfig storage config = s.strategies[b.strategyId];
        grossAssets = LibNavGuard.requireValidQuote(config.strategy, shares);
        uint256 liability = uint256(b.feeLiability) + _pendingFee(b, config);
        fee = shares == b.shares ? liability : liability * shares / b.shares;
        require(grossAssets >= fee, "Banda: fee exceeds proceeds");
        netAssets = grossAssets - fee;
    }

    function _checkpointFee(LibBandaStorage.Basket storage b, LibBandaStorage.StrategyConfig storage config) private {
        uint256 elapsed = block.timestamp - b.feeCheckpoint;
        if (elapsed == 0 || config.annualFeeBps == 0) return;
        uint256 grossNav = LibNavGuard.requireValidQuote(config.strategy, b.shares);
        uint256 numerator = grossNav * config.annualFeeBps * elapsed + b.feeRemainder;
        uint256 accrued = numerator / FEE_DENOMINATOR;
        b.feeRemainder = numerator % FEE_DENOMINATOR;
        require(
            accrued <= grossNav - b.feeLiability && accrued <= type(uint128).max - b.feeLiability,
            "Banda: fee insolvent"
        );
        b.feeLiability += uint128(accrued);
        b.feeCheckpoint = uint40(block.timestamp);
    }

    function _pendingFee(LibBandaStorage.Basket storage b, LibBandaStorage.StrategyConfig storage config)
        private
        view
        returns (uint256)
    {
        uint256 elapsed = block.timestamp - b.feeCheckpoint;
        if (elapsed == 0 || config.annualFeeBps == 0) return 0;
        uint256 grossNav = LibNavGuard.requireValidQuote(config.strategy, b.shares);
        return (grossNav * config.annualFeeBps * elapsed + b.feeRemainder) / FEE_DENOMINATOR;
    }
}
