// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {BandaDepositTest} from "./BandaDeposit.t.sol";
import {IDiamondCut} from "../src/diamond/interfaces/IDiamondCut.sol";
import {AdminFacet} from "../src/banda/facets/AdminFacet.sol";
import {DepositFacet} from "../src/banda/facets/DepositFacet.sol";
import {RedeemFacet} from "../src/banda/facets/RedeemFacet.sol";
import {BasketNFTFacet} from "../src/banda/facets/BasketNFTFacet.sol";
import {SettlementMigrationInit} from "../src/banda/SettlementMigrationInit.sol";
import {GatewayToken} from "../src/banda/gateway/GatewayToken.sol";
import {BandaAssetPool} from "../src/banda/gateway/BandaAssetPool.sol";
import {BasketStrategy} from "../src/banda/gateway/BasketStrategy.sol";
import {MockUSDG} from "../src/banda/mocks/MockUSDG.sol";

contract BandaGatewayTest is BandaDepositTest {
    BandaAssetPool pool;
    GatewayToken nvda;
    MockUSDG amd;
    BasketStrategy basket;

    function _gateway() private returns (uint32 strategyId) {
        pool = new BandaAssetPool(address(usdg), address(this));
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

    function testBasketAccountHoldsEveryLegAfterDeposit() public {
        uint32 id = _gateway();
        vm.prank(USER);
        (, address account, uint256 shares) = DepositFacet(address(diamond)).deposit(id, 20_000_000);
        require(shares == 20_000_000, "shares");
        require(nvda.balanceOf(account) == uint256(10_000_000) * 1e18 / 180_000_000, "NVDA leg not in account");
        require(amd.balanceOf(account) == uint256(7_000_000) * 1e18 / 150_000_000, "AMD leg not in account");
        require(usdg.balanceOf(account) == 3_000_000, "USDG sleeve not in account");
        require(usdg.balanceOf(address(basket)) == 0 && nvda.balanceOf(address(basket)) == 0, "strategy kept funds");
    }

    function testPartialRedeemMovesProRataHoldingsAndKeepsNft() public {
        uint32 id = _gateway();
        vm.prank(USER);
        (, address account,) = DepositFacet(address(diamond)).deposit(id, 20_000_000);
        uint256 nvdaBefore = nvda.balanceOf(account);
        uint256 amdBefore = amd.balanceOf(account);
        vm.prank(USER);
        uint256 proceeds = RedeemFacet(address(diamond)).redeem(1, 8_000_000, 7_960_000);
        require(proceeds >= 7_999_990 && proceeds <= 8_000_000, "partial proceeds");
        require(nvda.balanceOf(account) == nvdaBefore - nvdaBefore * 2 / 5, "NVDA not pro-rata");
        require(amd.balanceOf(account) == amdBefore - amdBefore * 2 / 5, "AMD not pro-rata");
        require(usdg.balanceOf(account) == 1_800_000, "USDG sleeve not pro-rata");
        require(BasketNFTFacet(address(diamond)).ownerOf(1) == USER, "partial redeem burned NFT");
    }

    function testFullRedeemEmptiesAccountRestoresInventoryAndBurns() public {
        uint32 id = _gateway();
        vm.prank(USER);
        (, address account,) = DepositFacet(address(diamond)).deposit(id, 20_000_000);
        vm.prank(USER);
        uint256 proceeds = RedeemFacet(address(diamond)).redeem(1, 20_000_000, 19_900_000);
        require(proceeds >= 19_999_990, "full proceeds");
        require(nvda.balanceOf(account) == 0 && amd.balanceOf(account) == 0 && usdg.balanceOf(account) == 0, "dust left");
        require(amd.balanceOf(address(pool)) == 100e18 && nvda.totalSupply() == 0, "inventory not restored");
        (bool exists,) = address(diamond).staticcall(abi.encodeCall(BasketNFTFacet.ownerOf, (1)));
        require(!exists, "full redeem kept NFT");
    }

    function testMinimumPayoutRevertLeavesHoldingsInAccount() public {
        uint32 id = _gateway();
        vm.prank(USER);
        (, address account,) = DepositFacet(address(diamond)).deposit(id, 20_000_000);
        uint256 nvdaBefore = nvda.balanceOf(account);
        vm.prank(USER);
        (bool ok,) = address(diamond).call(abi.encodeCall(RedeemFacet.redeem, (1, 8_000_000, 8_000_001)));
        require(!ok && nvda.balanceOf(account) == nvdaBefore && usdg.balanceOf(account) == 3_000_000, "revert moved holdings");
    }

    function testStrategyAndPoolRejectOutsiders() public {
        _gateway();
        vm.prank(USER);
        (bool deposited,) = address(basket).call(abi.encodeCall(BasketStrategy.deposit, (10_000_000, USER)));
        vm.prank(USER);
        (bool listed,) = address(pool).call(abi.encodeCall(BandaAssetPool.list, (address(usdg), 1, 1, true)));
        vm.prank(USER);
        (bool minted,) = address(nvda).call(abi.encodeCall(GatewayToken.mint, (USER, 1)));
        require(!deposited && !listed && !minted, "outsider accepted");
    }

    function testEmptyInventoryRevertsDepositAtomically() public {
        uint32 id = _gateway();
        MockUSDG richUser = usdg;
        richUser.mint(USER, 50_000e6);
        vm.prank(USER);
        (bool ok,) = address(diamond).call(abi.encodeCall(DepositFacet.deposit, (id, 50_000e6)));
        require(!ok && usdg.balanceOf(USER) == 50_100e6, "inventory shortfall was not atomic");
    }

    function testSettlementMigrationRefusesOpenBasketsThenSwitches() public {
        vm.prank(USER);
        DepositFacet(address(diamond)).deposit(1, 10_000_000);
        MockUSDG paxos = new MockUSDG();
        SettlementMigrationInit migration = new SettlementMigrationInit();
        bytes memory data = abi.encodeCall(SettlementMigrationInit.init, (address(paxos)));
        (bool blocked,) = address(diamond).call(
            abi.encodeCall(IDiamondCut.diamondCut, (new IDiamondCut.FacetCut[](0), address(migration), data))
        );
        require(!blocked, "migrated with an open basket");
        vm.prank(USER);
        RedeemFacet(address(diamond)).redeem(1, 10_000_000, 1);
        IDiamondCut(address(diamond)).diamondCut(new IDiamondCut.FacetCut[](0), address(migration), data);
        paxos.mint(USER, 50_000_000);
        vm.prank(USER);
        paxos.approve(address(diamond), type(uint256).max);
        BasketStrategy paxosBasket = _paxosBasket(address(paxos));
        AdminFacet(address(diamond)).configureStrategy(0, address(paxosBasket), 10_000_000, 25, FEE_RECIPIENT, true);
        vm.prank(USER);
        (, address account,) = DepositFacet(address(diamond)).deposit(2, 10_000_000);
        require(paxos.balanceOf(account) == 10_000_000 && paxos.balanceOf(USER) == 40_000_000, "new settlement unused");
    }

    function _paxosBasket(address paxos) private returns (BasketStrategy) {
        BandaAssetPool paxosPool = new BandaAssetPool(paxos, address(this));
        address[] memory tokens = new address[](1);
        uint16[] memory weights = new uint16[](1);
        (tokens[0], weights[0]) = (paxos, 10_000);
        return new BasketStrategy(paxos, address(paxosPool), address(diamond), tokens, weights);
    }
}
