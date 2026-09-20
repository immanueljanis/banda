// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "../interfaces/IERC20.sol";
import {IManagedStrategy} from "../interfaces/IManagedStrategy.sol";
import {IERC6551Registry} from "../interfaces/IERC6551Registry.sol";
import {LibBandaStorage} from "../libraries/LibBandaStorage.sol";
import {LibNavGuard} from "../libraries/LibNavGuard.sol";
import {BasketNFTFacet} from "./BasketNFTFacet.sol";

/// @notice Atomically collects settlement assets, mints a basket, binds an account, and receives shares.
contract DepositFacet is BasketNFTFacet {
    event BasketDeposited(
        uint256 indexed tokenId,
        uint32 indexed strategyId,
        address indexed owner,
        address account,
        uint256 assets,
        uint256 shares
    );

    function deposit(uint32 strategyId, uint256 assets)
        external
        returns (uint256 tokenId, address account, uint256 shares)
    {
        LibBandaStorage.AppStorage storage s = LibBandaStorage.appStorage();
        require(!s.depositEntered, "Banda: reentrant deposit");
        s.depositEntered = true;
        require(!s.paused, "Banda: paused");
        LibBandaStorage.StrategyConfig memory config = s.strategies[strategyId];
        require(config.enabled, "Banda: strategy disabled");
        require(assets >= config.minimumDeposit, "Banda: deposit too small");
        LibNavGuard.requireValidQuote(config.strategy, assets);

        IERC20 settlement = IERC20(s.settlement);
        uint256 beforeBalance = settlement.balanceOf(address(this));
        require(settlement.transferFrom(msg.sender, address(this), assets), "Banda: transfer failed");
        require(settlement.balanceOf(address(this)) == beforeBalance + assets, "Banda: inexact transfer");

        tokenId = ++s.nextTokenId;
        _mint(msg.sender, tokenId);
        account = IERC6551Registry(s.accountRegistry)
            .createAccount(s.accountImplementation, block.chainid, address(this), tokenId, 0, "");
        require(account != address(0) && account.code.length != 0, "Banda: account failed");

        require(settlement.approve(config.strategy, 0), "Banda: approval reset failed");
        require(settlement.approve(config.strategy, assets), "Banda: approval failed");
        shares = IManagedStrategy(config.strategy).deposit(assets, account);
        require(settlement.approve(config.strategy, 0), "Banda: approval revoke failed");
        require(shares != 0 && shares <= type(uint128).max, "Banda: invalid shares");
        require(settlement.balanceOf(address(this)) == beforeBalance, "Banda: strategy settlement mismatch");

        s.baskets[tokenId] = LibBandaStorage.Basket({
            strategyId: strategyId,
            account: account,
            shares: uint128(shares),
            feeLiability: 0,
            feeCheckpoint: uint40(block.timestamp),
            feeRemainder: 0
        });
        ++s.strategyBasketCount[strategyId];
        s.depositEntered = false;
        emit BasketDeposited(tokenId, strategyId, msg.sender, account, assets, shares);
    }
}
