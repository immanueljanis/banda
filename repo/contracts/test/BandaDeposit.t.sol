// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Diamond} from "../src/diamond/Diamond.sol";
import {IDiamondCut} from "../src/diamond/interfaces/IDiamondCut.sol";
import {DiamondCutFacet} from "../src/diamond/facets/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "../src/diamond/facets/DiamondLoupeFacet.sol";
import {OwnershipFacet} from "../src/diamond/facets/OwnershipFacet.sol";
import {BandaInit} from "../src/banda/BandaInit.sol";
import {AdminFacet} from "../src/banda/facets/AdminFacet.sol";
import {BasketNFTFacet} from "../src/banda/facets/BasketNFTFacet.sol";
import {DepositFacet} from "../src/banda/facets/DepositFacet.sol";
import {BasketViewFacet} from "../src/banda/facets/BasketViewFacet.sol";
import {RedeemFacet} from "../src/banda/facets/RedeemFacet.sol";
import {NavGuardFacet} from "../src/banda/facets/NavGuardFacet.sol";
import {RebalanceFacet} from "../src/banda/facets/RebalanceFacet.sol";
import {BasketAccount} from "../src/banda/accounts/BasketAccount.sol";
import {MockUSDG} from "../src/banda/mocks/MockUSDG.sol";
import {MockStrategy} from "../src/banda/mocks/MockStrategy.sol";
import {Mock6551Registry} from "../src/banda/mocks/Mock6551Registry.sol";
import {MockReentrantStrategy} from "../src/banda/mocks/MockReentrantStrategy.sol";
import {MockNavAdapter} from "../src/banda/mocks/MockNavAdapter.sol";
import {MockCanonicalAsset} from "../src/banda/mocks/MockCanonicalAsset.sol";
import {MockUsdGAssetPool} from "../src/banda/mocks/MockUsdGAssetPool.sol";
import {MockGatewayStrategy} from "../src/banda/mocks/MockGatewayStrategy.sol";
import {MockRebalanceStrategy} from "../src/banda/mocks/MockRebalanceStrategy.sol";

interface Vm {
    function prank(address) external;
    function warp(uint256) external;
}

contract BandaDepositTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant USER = address(0xB0B);
    address constant USER_TWO = address(0xB0B2);
    address constant REBALANCE_OPERATOR = address(0x0A7);
    address constant APPROVED_OPERATOR = address(0xA11CE);
    address constant FEE_RECIPIENT = address(0xFEE);
    MockUSDG usdg;
    MockStrategy strategy;
    MockNavAdapter navAdapter;
    Diamond diamond;

    function setUp() public {
        usdg = new MockUSDG();
        strategy = new MockStrategy(address(usdg));
        DiamondCutFacet cutFacet = new DiamondCutFacet();
        DiamondLoupeFacet loupeFacet = new DiamondLoupeFacet();
        OwnershipFacet ownershipFacet = new OwnershipFacet();
        AdminFacet adminFacet = new AdminFacet();
        BasketNFTFacet nftFacet = new BasketNFTFacet();
        DepositFacet depositFacet = new DepositFacet();
        BasketViewFacet viewFacet = new BasketViewFacet();
        RedeemFacet redeemFacet = new RedeemFacet();
        NavGuardFacet navFacet = new NavGuardFacet();
        RebalanceFacet rebalanceFacet = new RebalanceFacet();
        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](10);
        cuts[0] = _cut(address(cutFacet), _cutSelectors());
        cuts[1] = _cut(address(loupeFacet), _loupeSelectors());
        cuts[2] = _cut(address(ownershipFacet), _ownershipSelectors());
        cuts[3] = _cut(address(adminFacet), _adminSelectors());
        cuts[4] = _cut(address(nftFacet), _nftSelectors());
        cuts[5] = _cut(address(depositFacet), _depositSelectors());
        cuts[6] = _cut(address(viewFacet), _viewSelectors());
        cuts[7] = _cut(address(redeemFacet), _redeemSelectors());
        cuts[8] = _cut(address(navFacet), _navSelectors());
        cuts[9] = _cut(address(rebalanceFacet), _rebalanceSelectors());
        BandaInit init = new BandaInit();
        Mock6551Registry registry = new Mock6551Registry();
        BasketAccount accountImplementation = new BasketAccount(address(0), 0, address(0));
        diamond = new Diamond(
            address(this),
            cuts,
            address(init),
            abi.encodeCall(BandaInit.init, (address(usdg), address(registry), address(accountImplementation)))
        );
        navAdapter = new MockNavAdapter();
        AdminFacet(address(diamond)).configureNavGuard(address(navAdapter), 1 hours);
        AdminFacet(address(diamond)).configureStrategy(0, address(strategy), 10_000_000, 100, FEE_RECIPIENT, true);
        usdg.mint(USER, 100_000_000);
        usdg.mint(USER_TWO, 100_000_000);
        vm.prank(USER);
        usdg.approve(address(diamond), type(uint256).max);
        vm.prank(USER_TWO);
        usdg.approve(address(diamond), type(uint256).max);
    }

    function testDepositAtomicallyMintsBasketAccountAndShares() public {
        vm.prank(USER);
        (uint256 tokenId, address account, uint256 shares) = DepositFacet(address(diamond)).deposit(1, 25_000_000);
        require(tokenId == 1 && shares == 25_000_000, "unexpected receipt");
        require(BasketNFTFacet(address(diamond)).ownerOf(tokenId) == USER, "wrong NFT owner");
        require(BasketNFTFacet(address(diamond)).balanceOf(USER) == 1, "wrong NFT balance");
        (uint32 strategyId, address storedAccount, uint128 storedShares) =
            BasketViewFacet(address(diamond)).basket(tokenId);
        require(strategyId == 1 && storedAccount == account && storedShares == shares, "wrong basket state");
        require(strategy.shareBalance(account) == shares, "shares not held by account");
        require(usdg.balanceOf(USER) == 75_000_000 && usdg.balanceOf(address(diamond)) == 0, "settlement stranded");
    }

    function testStrategyFailureRollsBackPaymentNftAccountAndRegistryState() public {
        strategy.setFailDeposits(true);
        uint256 beforeUser = usdg.balanceOf(USER);
        vm.prank(USER);
        (bool ok,) = address(diamond).call(abi.encodeCall(DepositFacet.deposit, (1, 25_000_000)));
        require(!ok, "forced strategy failure accepted");
        require(usdg.balanceOf(USER) == beforeUser && usdg.balanceOf(address(diamond)) == 0, "payment not rolled back");
        (bool ownerRead,) = address(diamond).staticcall(abi.encodeCall(BasketNFTFacet.ownerOf, (1)));
        require(!ownerRead, "NFT persisted after revert");
        (bool basketRead,) = address(diamond).staticcall(abi.encodeCall(BasketViewFacet.basket, (1)));
        require(!basketRead, "basket persisted after revert");
    }

    function testPauseBlocksDeposit() public {
        AdminFacet(address(diamond)).setPaused(true);
        vm.prank(USER);
        (bool ok,) = address(diamond).call(abi.encodeCall(DepositFacet.deposit, (1, 25_000_000)));
        require(!ok, "paused deposit accepted");
        require(usdg.balanceOf(USER) == 100_000_000, "paused call moved funds");
    }

    function testPauseStillAllowsRedeem() public {
        vm.prank(USER);
        DepositFacet(address(diamond)).deposit(1, 25_000_000);
        AdminFacet(address(diamond)).setPaused(true);
        vm.prank(USER);
        uint256 assets = RedeemFacet(address(diamond)).redeem(1, 25_000_000, 25_000_000);
        require(assets == 25_000_000 && usdg.balanceOf(USER) == 100_000_000, "pause blocked valid redeem");
    }

    function testOnlyDiamondOwnerCanConfigureOrPause() public {
        vm.prank(USER);
        (bool configureOk,) = address(diamond)
            .call(
                abi.encodeCall(
                    AdminFacet.configureStrategy,
                    (uint32(1), address(strategy), uint96(1), uint16(100), FEE_RECIPIENT, true)
                )
            );
        require(!configureOk, "user configured strategy");
        vm.prank(USER);
        (bool pauseOk,) = address(diamond).call(abi.encodeCall(AdminFacet.setPaused, (true)));
        require(!pauseOk, "user paused protocol");
        vm.prank(USER);
        (bool navOk,) =
            address(diamond).call(abi.encodeCall(AdminFacet.configureNavGuard, (address(navAdapter), uint48(1 hours))));
        require(!navOk, "user configured NAV guard");
    }

    function testOnlyDiamondOwnerCanUpgrade() public {
        IDiamondCut.FacetCut[] memory noChanges = new IDiamondCut.FacetCut[](0);
        vm.prank(USER);
        (bool ok,) = address(diamond).call(abi.encodeCall(DiamondCutFacet.diamondCut, (noChanges, address(0), "")));
        require(!ok, "user upgraded diamond");
    }

    function testStrategyCannotReenterDeposit() public {
        MockReentrantStrategy malicious = new MockReentrantStrategy(address(usdg), address(diamond), 2);
        AdminFacet(address(diamond)).configureStrategy(0, address(malicious), 10_000_000, 200, FEE_RECIPIENT, true);
        vm.prank(USER);
        DepositFacet(address(diamond)).deposit(2, 25_000_000);
        require(malicious.nestedCallBlocked(), "strategy reentered deposit");
    }

    function testConfiguredStrategyCannotBeReplaced() public {
        MockStrategy replacement = new MockStrategy(address(usdg));
        (bool ok,) = address(diamond)
            .call(
                abi.encodeCall(
                    AdminFacet.configureStrategy,
                    (uint32(1), address(replacement), uint96(10_000_000), uint16(100), FEE_RECIPIENT, true)
                )
            );
        require(!ok, "strategy mandate was replaced");
    }

    function testPartialRedeemKeepsNftAccountAndProRataShares() public {
        vm.prank(USER);
        (, address account,) = DepositFacet(address(diamond)).deposit(1, 25_000_000);
        vm.prank(USER);
        uint256 assets = RedeemFacet(address(diamond)).redeem(1, 10_000_000, 10_000_000);
        require(assets == 10_000_000 && usdg.balanceOf(USER) == 85_000_000, "incorrect partial payout");
        require(BasketNFTFacet(address(diamond)).ownerOf(1) == USER, "partial redeem burned NFT");
        (, address storedAccount, uint128 shares) = BasketViewFacet(address(diamond)).basket(1);
        require(
            storedAccount == account && shares == 15_000_000 && strategy.shareBalance(account) == 15_000_000,
            "partial position wrong"
        );
    }

    function testPreviewReportsGrossFeeAndNetPayout() public {
        vm.prank(USER);
        DepositFacet(address(diamond)).deposit(1, 25_000_000);
        vm.warp(block.timestamp + 365 days);
        navAdapter.setQuote(1e18, block.timestamp, block.number, true);
        (uint256 grossAssets, uint256 fee, uint256 netAssets) =
            RedeemFacet(address(diamond)).previewRedeem(1, 10_000_000);
        require(grossAssets == 10_000_000 && fee == 100_000 && netAssets == 9_900_000, "incorrect redeem preview");
    }

    function testStaleNavBlocksDepositWithoutMovingUsdG() public {
        vm.warp(10_000);
        navAdapter.setQuote(1e18, block.timestamp - 1 hours - 1, block.number, true);
        vm.prank(USER);
        (bool ok,) = address(diamond).call(abi.encodeCall(DepositFacet.deposit, (1, 25_000_000)));
        require(!ok && usdg.balanceOf(USER) == 100_000_000, "stale NAV accepted deposit");
    }

    function testStaleNavBlocksRedeemWithoutChangingPosition() public {
        vm.prank(USER);
        (, address account,) = DepositFacet(address(diamond)).deposit(1, 25_000_000);
        vm.warp(block.timestamp + 1 hours + 1);
        navAdapter.setQuote(1e18, block.timestamp - 1 hours - 1, block.number, true);
        vm.prank(USER);
        (bool ok,) = address(diamond).call(abi.encodeCall(RedeemFacet.redeem, (1, 10_000_000, 0)));
        require(!ok, "stale NAV accepted redeem");
        (, address storedAccount, uint128 shares) = BasketViewFacet(address(diamond)).basket(1);
        require(
            storedAccount == account && shares == 25_000_000 && strategy.shareBalance(account) == 25_000_000,
            "stale NAV changed position"
        );
    }

    function testMixedBlockNavBlocksDeposit() public {
        navAdapter.setQuote(1e18, block.timestamp, block.number + 1, true);
        vm.prank(USER);
        (bool ok,) = address(diamond).call(abi.encodeCall(DepositFacet.deposit, (1, 25_000_000)));
        require(!ok, "mixed-block NAV accepted deposit");
    }

    function testFutureDatedNavBlocksDeposit() public {
        navAdapter.setQuote(1e18, block.timestamp + 1, block.number, true);
        vm.prank(USER);
        (bool ok,) = address(diamond).call(abi.encodeCall(DepositFacet.deposit, (1, 25_000_000)));
        require(!ok, "future NAV accepted deposit");
    }

    function testGatewayBuysCanonicalTestAssetAndPartialRedeemReturnsUsdG() public {
        MockCanonicalAsset twbtc = new MockCanonicalAsset();
        MockUsdGAssetPool pool = new MockUsdGAssetPool(address(usdg), address(twbtc));
        twbtc.setMinter(address(pool));
        MockGatewayStrategy gateway = new MockGatewayStrategy(address(usdg), address(pool));
        AdminFacet(address(diamond)).configureStrategy(0, address(gateway), 10_000_000, 100, FEE_RECIPIENT, true);

        vm.prank(USER);
        (, address account, uint256 shares) = DepositFacet(address(diamond)).deposit(2, 25_000_000);
        require(shares == 25_000_000 && twbtc.balanceOf(account) == shares, "gateway did not buy canonical asset");
        require(usdg.balanceOf(address(pool)) == 25_000_000, "gateway pool did not receive USDG");

        vm.prank(USER);
        uint256 proceeds = RedeemFacet(address(diamond)).redeem(1, 10_000_000, 10_000_000);
        require(proceeds == 10_000_000 && twbtc.balanceOf(account) == 15_000_000, "partial gateway redeem incorrect");
        require(
            usdg.balanceOf(USER) == 85_000_000 && usdg.balanceOf(address(pool)) == 15_000_000, "USDG exit incorrect"
        );
    }

    function testGatewayMinimumPayoutRevertPreservesCanonicalPosition() public {
        MockCanonicalAsset twbtc = new MockCanonicalAsset();
        MockUsdGAssetPool pool = new MockUsdGAssetPool(address(usdg), address(twbtc));
        twbtc.setMinter(address(pool));
        MockGatewayStrategy gateway = new MockGatewayStrategy(address(usdg), address(pool));
        AdminFacet(address(diamond)).configureStrategy(0, address(gateway), 10_000_000, 100, FEE_RECIPIENT, true);

        vm.prank(USER);
        (, address account,) = DepositFacet(address(diamond)).deposit(2, 25_000_000);

        vm.prank(USER);
        (bool ok,) = address(diamond).call(abi.encodeCall(RedeemFacet.redeem, (1, 10_000_000, 10_000_001)));
        require(!ok, "gateway minimum payout ignored");
        (, address storedAccount, uint128 shares) = BasketViewFacet(address(diamond)).basket(1);
        require(
            storedAccount == account && shares == 25_000_000 && twbtc.balanceOf(account) == 25_000_000,
            "gateway slippage revert changed position"
        );
        require(
            usdg.balanceOf(USER) == 75_000_000 && usdg.balanceOf(address(pool)) == 25_000_000, "gateway funds changed"
        );
    }

    function testMinimumPayoutRevertPreservesPosition() public {
        vm.prank(USER);
        (, address account,) = DepositFacet(address(diamond)).deposit(1, 25_000_000);
        vm.prank(USER);
        (bool ok,) = address(diamond).call(abi.encodeCall(RedeemFacet.redeem, (1, 10_000_000, 10_000_001)));
        require(!ok, "minimum payout ignored");
        (, address storedAccount, uint128 shares) = BasketViewFacet(address(diamond)).basket(1);
        require(
            storedAccount == account && shares == 25_000_000 && strategy.shareBalance(account) == 25_000_000,
            "slippage revert lost position"
        );
    }

    function testPayoutFailureRollsBackSharesAndNft() public {
        vm.prank(USER);
        (, address account,) = DepositFacet(address(diamond)).deposit(1, 25_000_000);
        usdg.setRejectRecipient(USER, true);
        vm.prank(USER);
        (bool ok,) = address(diamond).call(abi.encodeCall(RedeemFacet.redeem, (1, 10_000_000, 0)));
        require(!ok, "failed payout accepted");
        require(BasketNFTFacet(address(diamond)).ownerOf(1) == USER, "failed payout burned NFT");
        (, address storedAccount, uint128 shares) = BasketViewFacet(address(diamond)).basket(1);
        require(
            storedAccount == account && shares == 25_000_000 && strategy.shareBalance(account) == 25_000_000,
            "failed payout changed position"
        );
    }

    function testApprovedOperatorRedeemPaysNftOwner() public {
        vm.prank(USER);
        DepositFacet(address(diamond)).deposit(1, 25_000_000);
        vm.prank(USER);
        BasketNFTFacet(address(diamond)).approve(APPROVED_OPERATOR, 1);
        vm.prank(APPROVED_OPERATOR);
        RedeemFacet(address(diamond)).redeem(1, 10_000_000, 10_000_000);
        require(usdg.balanceOf(USER) == 85_000_000 && usdg.balanceOf(APPROVED_OPERATOR) == 0, "payout sent to caller");
    }

    function testFullRedeemPaysThenBurnsBasket() public {
        vm.prank(USER);
        DepositFacet(address(diamond)).deposit(1, 25_000_000);
        vm.prank(USER);
        RedeemFacet(address(diamond)).redeem(1, 25_000_000, 25_000_000);
        require(usdg.balanceOf(USER) == 100_000_000, "full payout missing");
        (bool ownerRead,) = address(diamond).staticcall(abi.encodeCall(BasketNFTFacet.ownerOf, (1)));
        require(!ownerRead, "full redeem did not burn NFT");
    }

    function testAnnualFeeIsAccruedOnceAndAllocatedProRataAcrossRedeems() public {
        vm.prank(USER);
        DepositFacet(address(diamond)).deposit(1, 25_000_000);
        vm.warp(block.timestamp + 365 days);
        navAdapter.setQuote(1e18, block.timestamp, block.number, true);
        vm.prank(USER);
        RedeemFacet(address(diamond)).redeem(1, 10_000_000, 9_900_000);
        require(usdg.balanceOf(FEE_RECIPIENT) == 100_000, "incorrect partial fee");
        (uint128 liability,,) = BasketViewFacet(address(diamond)).feeState(1);
        require(liability == 150_000, "remaining fee incorrect");
        vm.prank(USER);
        RedeemFacet(address(diamond)).redeem(1, 15_000_000, 14_850_000);
        require(usdg.balanceOf(FEE_RECIPIENT) == 250_000, "fee charged twice or lost");
        require(usdg.balanceOf(USER) == 99_750_000, "net investor value incorrect");
    }

    function testRebalanceChangesOnlySelectedAccountWithinMandate() public {
        MockRebalanceStrategy managed = _setupRebalanceStrategy();
        vm.prank(USER);
        (, address first,) = DepositFacet(address(diamond)).deposit(2, 25_000_000);
        vm.prank(USER_TWO);
        (, address second,) = DepositFacet(address(diamond)).deposit(2, 35_000_000);

        vm.prank(REBALANCE_OPERATOR);
        uint256 navAfter = RebalanceFacet(address(diamond)).rebalance(1, 6000, 25_000_000, keccak256("adjust sleeve"));
        require(navAfter == 25_000_000, "NAV changed");
        require(managed.sleeveBps(first) == 6000 && managed.sleeveBps(second) == 0, "wrong account changed");
        vm.prank(REBALANCE_OPERATOR);
        uint256 secondNav =
            RebalanceFacet(address(diamond)).rebalance(2, 4000, 35_000_000, keccak256("adjust second sleeve"));
        require(secondNav == 35_000_000, "second NAV changed");
        require(managed.sleeveBps(first) == 6000 && managed.sleeveBps(second) == 4000, "accounts not isolated");
        require(
            managed.shareBalance(first) == 25_000_000 && managed.shareBalance(second) == 35_000_000, "shares changed"
        );
        (, address storedFirst, uint128 firstShares) = BasketViewFacet(address(diamond)).basket(1);
        (, address storedSecond, uint128 secondShares) = BasketViewFacet(address(diamond)).basket(2);
        require(storedFirst == first && firstShares == 25_000_000, "first basket changed");
        require(storedSecond == second && secondShares == 35_000_000, "second basket changed");
        require(BasketNFTFacet(address(diamond)).ownerOf(1) == USER, "first NFT owner changed");
        require(BasketNFTFacet(address(diamond)).ownerOf(2) == USER_TWO, "second NFT owner changed");
    }

    function testRebalanceRejectsWrongRolePauseBoundsAndInvalidNav() public {
        MockRebalanceStrategy managed = _setupRebalanceStrategy();
        vm.prank(USER);
        (, address account,) = DepositFacet(address(diamond)).deposit(2, 25_000_000);
        bytes memory action =
            abi.encodeCall(RebalanceFacet.rebalance, (1, 6000, 25_000_000, keccak256("adjust sleeve")));
        vm.prank(USER);
        (bool userOk,) = address(diamond).call(action);
        require(!userOk, "holder rebalanced");
        AdminFacet(address(diamond)).setPaused(true);
        vm.prank(REBALANCE_OPERATOR);
        (bool pausedOk,) = address(diamond).call(action);
        require(!pausedOk, "paused rebalance accepted");
        AdminFacet(address(diamond)).setPaused(false);
        vm.prank(REBALANCE_OPERATOR);
        (bool boundsOk,) =
            address(diamond).call(abi.encodeCall(RebalanceFacet.rebalance, (1, 9000, 0, keccak256("outside bounds"))));
        require(!boundsOk, "out of bounds accepted");
        vm.prank(REBALANCE_OPERATOR);
        (bool minOk,) =
            address(diamond).call(abi.encodeCall(RebalanceFacet.rebalance, (1, 6000, 25_000_001, keccak256("min NAV"))));
        require(!minOk, "low NAV accepted");
        require(managed.sleeveBps(account) == 0, "failed rebalance persisted");
        navAdapter.setQuote(1e18, block.timestamp, block.number + 1, true);
        vm.prank(REBALANCE_OPERATOR);
        (bool navOk,) = address(diamond).call(action);
        require(!navOk && managed.sleeveBps(account) == 0, "invalid NAV accepted");
    }

    function _setupRebalanceStrategy() private returns (MockRebalanceStrategy managed) {
        managed = new MockRebalanceStrategy(address(usdg), address(diamond));
        AdminFacet(address(diamond)).configureStrategy(0, address(managed), 10_000_000, 100, FEE_RECIPIENT, true);
        AdminFacet(address(diamond)).setRebalanceOperator(REBALANCE_OPERATOR);
        AdminFacet(address(diamond)).setRebalanceBounds(2, 2000, 8000);
    }

    function _cut(address facet, bytes4[] memory selectors) private pure returns (IDiamondCut.FacetCut memory) {
        return IDiamondCut.FacetCut(facet, IDiamondCut.FacetCutAction.Add, selectors);
    }

    function _cutSelectors() private pure returns (bytes4[] memory x) {
        x = new bytes4[](1);
        x[0] = DiamondCutFacet.diamondCut.selector;
    }

    function _loupeSelectors() private pure returns (bytes4[] memory x) {
        x = new bytes4[](4);
        x[0] = DiamondLoupeFacet.facets.selector;
        x[1] = DiamondLoupeFacet.facetFunctionSelectors.selector;
        x[2] = DiamondLoupeFacet.facetAddresses.selector;
        x[3] = DiamondLoupeFacet.facetAddress.selector;
    }

    function _ownershipSelectors() private pure returns (bytes4[] memory x) {
        x = new bytes4[](2);
        x[0] = OwnershipFacet.owner.selector;
        x[1] = OwnershipFacet.transferOwnership.selector;
    }

    function _adminSelectors() private pure returns (bytes4[] memory x) {
        x = new bytes4[](5);
        x[0] = AdminFacet.configureStrategy.selector;
        x[1] = AdminFacet.setPaused.selector;
        x[2] = AdminFacet.configureNavGuard.selector;
        x[3] = AdminFacet.setRebalanceOperator.selector;
        x[4] = AdminFacet.setRebalanceBounds.selector;
    }

    function _nftSelectors() private pure returns (bytes4[] memory x) {
        x = new bytes4[](11);
        x[0] = BasketNFTFacet.name.selector;
        x[1] = BasketNFTFacet.symbol.selector;
        x[2] = BasketNFTFacet.ownerOf.selector;
        x[3] = BasketNFTFacet.balanceOf.selector;
        x[4] = BasketNFTFacet.getApproved.selector;
        x[5] = BasketNFTFacet.isApprovedForAll.selector;
        x[6] = BasketNFTFacet.approve.selector;
        x[7] = BasketNFTFacet.setApprovalForAll.selector;
        x[8] = BasketNFTFacet.transferFrom.selector;
        x[9] = bytes4(keccak256("safeTransferFrom(address,address,uint256)"));
        x[10] = bytes4(keccak256("safeTransferFrom(address,address,uint256,bytes)"));
    }

    function _depositSelectors() private pure returns (bytes4[] memory x) {
        x = new bytes4[](1);
        x[0] = DepositFacet.deposit.selector;
    }

    function _viewSelectors() private pure returns (bytes4[] memory x) {
        x = new bytes4[](5);
        x[0] = BasketViewFacet.settlementAsset.selector;
        x[1] = BasketViewFacet.isPaused.selector;
        x[2] = BasketViewFacet.strategy.selector;
        x[3] = BasketViewFacet.basket.selector;
        x[4] = BasketViewFacet.feeState.selector;
    }

    function _redeemSelectors() private pure returns (bytes4[] memory x) {
        x = new bytes4[](2);
        x[0] = RedeemFacet.redeem.selector;
        x[1] = RedeemFacet.previewRedeem.selector;
    }

    function _navSelectors() private pure returns (bytes4[] memory x) {
        x = new bytes4[](2);
        x[0] = NavGuardFacet.navGuard.selector;
        x[1] = NavGuardFacet.previewNav.selector;
    }

    function _rebalanceSelectors() private pure returns (bytes4[] memory x) {
        x = new bytes4[](1);
        x[0] = RebalanceFacet.rebalance.selector;
    }
}
