// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AdminFacet} from "../src/banda/facets/AdminFacet.sol";
import {BasketNFTFacet} from "../src/banda/facets/BasketNFTFacet.sol";
import {BasketViewFacet} from "../src/banda/facets/BasketViewFacet.sol";
import {DepositFacet} from "../src/banda/facets/DepositFacet.sol";
import {RedeemFacet} from "../src/banda/facets/RedeemFacet.sol";
import {NavGuardFacet} from "../src/banda/facets/NavGuardFacet.sol";
import {MockUSDG} from "../src/banda/mocks/MockUSDG.sol";
import {SecureMockNavAdapter} from "../src/banda/mocks/SecureMockNavAdapter.sol";

interface SmokeVm {
    function envAddress(string calldata name) external view returns (address value);
    function startBroadcast() external;
    function stopBroadcast() external;
}

/// @notice Exercises one complete testnet basket lifecycle and restores pause.
contract SmokeRobinhoodTestnet {
    SmokeVm private constant vm = SmokeVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 private constant ROBINHOOD_TESTNET_CHAIN_ID = 46_630;
    address private constant DIAMOND = 0xB1dD20D06fc0741237c812Ca904bD8dc3f7DE4e7;
    address private constant SETTLEMENT = 0xB42Df4e64356cAFbAEB63f572Ec95CC3BAE75dba;
    uint32 private constant STRATEGY_ID = 3;
    uint256 private constant DEPOSIT_ASSETS = 20_000_000;
    uint256 private constant PARTIAL_SHARES = 8_000_000;

    function run() external returns (uint256 tokenId, address account) {
        require(block.chainid == ROBINHOOD_TESTNET_CHAIN_ID, "Smoke: wrong chain");
        require(BasketViewFacet(DIAMOND).isPaused(), "Smoke: expected paused start");
        require(BasketViewFacet(DIAMOND).settlementAsset() == SETTLEMENT, "Smoke: wrong settlement");
        address admin = vm.envAddress("BANDA_ADMIN");
        (address adapter,) = NavGuardFacet(DIAMOND).navGuard();
        (address strategy,,,,) = BasketViewFacet(DIAMOND).strategy(STRATEGY_ID);
        uint256 balanceBefore = MockUSDG(SETTLEMENT).balanceOf(admin);

        vm.startBroadcast();
        SecureMockNavAdapter(adapter).setQuote(strategy, 1e18, block.timestamp, block.number, true);
        AdminFacet(DIAMOND).setPaused(false);
        MockUSDG(SETTLEMENT).mint(admin, DEPOSIT_ASSETS);
        MockUSDG(SETTLEMENT).approve(DIAMOND, DEPOSIT_ASSETS);
        uint256 shares;
        (tokenId, account, shares) = DepositFacet(DIAMOND).deposit(STRATEGY_ID, DEPOSIT_ASSETS);
        require(shares == DEPOSIT_ASSETS, "Smoke: wrong deposit shares");
        RedeemFacet(DIAMOND).redeem(tokenId, PARTIAL_SHARES, PARTIAL_SHARES - 1_000);
        require(BasketNFTFacet(DIAMOND).ownerOf(tokenId) == admin, "Smoke: partial redeem burned NFT");
        (,, uint128 remainingShares) = BasketViewFacet(DIAMOND).basket(tokenId);
        require(remainingShares == DEPOSIT_ASSETS - PARTIAL_SHARES, "Smoke: wrong remaining shares");
        RedeemFacet(DIAMOND).redeem(tokenId, remainingShares, remainingShares - 1_000);
        AdminFacet(DIAMOND).setPaused(true);
        vm.stopBroadcast();

        (bool ownerRead,) = DIAMOND.staticcall(abi.encodeCall(BasketNFTFacet.ownerOf, (tokenId)));
        require(!ownerRead, "Smoke: full redeem did not burn NFT");
        require(BasketViewFacet(DIAMOND).isPaused(), "Smoke: final state not paused");
        require(
            MockUSDG(SETTLEMENT).balanceOf(admin) + 2_000 >= balanceBefore + DEPOSIT_ASSETS, "Smoke: payout shortfall"
        );
    }
}
