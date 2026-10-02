// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {BandaDepositTest} from "./BandaDeposit.t.sol";
import {AdminFacet} from "../src/banda/facets/AdminFacet.sol";
import {DepositFacet} from "../src/banda/facets/DepositFacet.sol";
import {RedeemFacet} from "../src/banda/facets/RedeemFacet.sol";
import {GatewayToken} from "../src/banda/gateway/GatewayToken.sol";
import {PricedAssetPool} from "../src/banda/gateway/PricedAssetPool.sol";
import {BasketStrategy} from "../src/banda/gateway/BasketStrategy.sol";
import {MockUSDG} from "../src/banda/mocks/MockUSDG.sol";

contract BandaPricedGatewayTest is BandaDepositTest {
    address constant UPDATER = address(0x0DA7A);
    PricedAssetPool pool;
    GatewayToken nvda;
    MockUSDG amd;
    BasketStrategy basket;

    function _priced() private returns (uint32) {
        pool = new PricedAssetPool(address(usdg), address(this), UPDATER, 15 minutes, 2_000);
        nvda = new GatewayToken("NVIDIA (testnet mock)", "NVDA", 18, address(pool));
        amd = new MockUSDG();
        pool.list(address(nvda), 180_000_000, 1e18, true);
        pool.list(address(amd), 150_000_000, 1e18, false);
        amd.mint(address(pool), 100e18);
        address[] memory tokens = new address[](3);
        uint16[] memory weights = new uint16[](3);
        (tokens[0], tokens[1], tokens[2]) = (address(nvda), address(amd), address(usdg));
        (weights[0], weights[1], weights[2]) = (5_000, 3_500, 1_500);
        basket = new BasketStrategy(address(usdg), address(pool), address(diamond), tokens, weights);
        AdminFacet(address(diamond)).configureStrategy(0, address(basket), 10_000_000, 25, FEE_RECIPIENT, true);
        return 2;
    }

    function _setNvda(uint128 price) private {
        address[] memory assets = new address[](1);
        uint128[] memory prices = new uint128[](1);
        (assets[0], prices[0]) = (address(nvda), price);
        vm.prank(UPDATER);
        pool.setPrices(assets, prices);
    }

    function testRedeemPaysMarketValueAfterPriceRises() public {
        uint32 id = _priced();
        usdg.mint(address(pool), 5_000_000);
        vm.prank(USER);
        DepositFacet(address(diamond)).deposit(id, 20_000_000);
        _setNvda(198_000_000);
        vm.prank(USER);
        uint256 proceeds = RedeemFacet(address(diamond)).redeem(1, 20_000_000, 20_900_000);
        require(proceeds >= 20_999_990 && proceeds <= 21_000_000, "NVDA leg did not reprice +10%");
    }

    function testRedeemPaysLessAfterPriceFalls() public {
        uint32 id = _priced();
        vm.prank(USER);
        DepositFacet(address(diamond)).deposit(id, 20_000_000);
        _setNvda(162_000_000);
        vm.prank(USER);
        uint256 proceeds = RedeemFacet(address(diamond)).redeem(1, 20_000_000, 18_900_000);
        require(proceeds >= 18_999_990 && proceeds <= 19_000_000, "NVDA leg did not reprice -10%");
    }

    function testStalePricesBlockDepositAndRedeemAtomically() public {
        uint32 id = _priced();
        vm.prank(USER);
        (, address account,) = DepositFacet(address(diamond)).deposit(id, 20_000_000);
        uint256 nvdaHeld = nvda.balanceOf(account);
        vm.warp(block.timestamp + 16 minutes);
        vm.prank(USER);
        (bool deposited,) = address(diamond).call(abi.encodeCall(DepositFacet.deposit, (id, 10_000_000)));
        vm.prank(USER);
        (bool redeemed,) = address(diamond).call(abi.encodeCall(RedeemFacet.redeem, (1, 20_000_000, 1)));
        require(!deposited && !redeemed && nvda.balanceOf(account) == nvdaHeld, "stale price was accepted");
    }

    function testInsolventPoolRevertsRedeemWithoutMovingHoldings() public {
        uint32 id = _priced();
        vm.prank(USER);
        (, address account,) = DepositFacet(address(diamond)).deposit(id, 20_000_000);
        _setNvda(216_000_000);
        uint256 nvdaHeld = nvda.balanceOf(account);
        vm.prank(USER);
        (bool ok,) = address(diamond).call(abi.encodeCall(RedeemFacet.redeem, (1, 20_000_000, 1)));
        require(!ok && nvda.balanceOf(account) == nvdaHeld && usdg.balanceOf(account) == 3_000_000, "insolvent sell moved funds");
    }

    function testOnlyUpdaterWithinDeviationOrOwnerForce() public {
        _priced();
        address[] memory assets = new address[](1);
        uint128[] memory prices = new uint128[](1);
        (assets[0], prices[0]) = (address(nvda), 200_000_000);
        vm.prank(USER);
        (bool outsider,) = address(pool).call(abi.encodeCall(PricedAssetPool.setPrices, (assets, prices)));
        prices[0] = 240_000_000;
        vm.prank(UPDATER);
        (bool jump,) = address(pool).call(abi.encodeCall(PricedAssetPool.setPrices, (assets, prices)));
        vm.prank(UPDATER);
        (bool updaterForce,) = address(pool).call(abi.encodeCall(PricedAssetPool.forcePrice, (address(nvda), 240_000_000)));
        require(!outsider && !jump && !updaterForce, "price control bypassed");
        pool.forcePrice(address(nvda), 240_000_000);
        (uint128 price,,,,) = pool.listings(address(nvda));
        require(price == 240_000_000, "owner force failed");
    }
}
