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
import {BasketAccount} from "../src/banda/accounts/BasketAccount.sol";
import {MockUSDG} from "../src/banda/mocks/MockUSDG.sol";
import {MockStrategy} from "../src/banda/mocks/MockStrategy.sol";
import {Mock6551Registry} from "../src/banda/mocks/Mock6551Registry.sol";
import {MockReentrantStrategy} from "../src/banda/mocks/MockReentrantStrategy.sol";

interface Vm {
    function prank(address) external;
    function warp(uint256) external;
}

contract BandaDepositTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant USER = address(0xB0B);
    address constant FEE_RECIPIENT = address(0xFEE);
    MockUSDG usdg;
    MockStrategy strategy;
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
        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](8);
        cuts[0] = _cut(address(cutFacet), _cutSelectors());
        cuts[1] = _cut(address(loupeFacet), _loupeSelectors());
        cuts[2] = _cut(address(ownershipFacet), _ownershipSelectors());
        cuts[3] = _cut(address(adminFacet), _adminSelectors());
        cuts[4] = _cut(address(nftFacet), _nftSelectors());
        cuts[5] = _cut(address(depositFacet), _depositSelectors());
        cuts[6] = _cut(address(viewFacet), _viewSelectors());
        cuts[7] = _cut(address(redeemFacet), _redeemSelectors());
        BandaInit init = new BandaInit();
        Mock6551Registry registry = new Mock6551Registry();
        BasketAccount accountImplementation = new BasketAccount(address(0), 0, address(0));
        diamond = new Diamond(
            address(this),
            cuts,
            address(init),
            abi.encodeCall(BandaInit.init, (address(usdg), address(registry), address(accountImplementation)))
        );
        AdminFacet(address(diamond)).configureStrategy(0, address(strategy), 10_000_000, 100, FEE_RECIPIENT, true);
        usdg.mint(USER, 100_000_000);
        vm.prank(USER);
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
        uint256 assets = RedeemFacet(address(diamond)).redeem(1, 25_000_000);
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
        uint256 assets = RedeemFacet(address(diamond)).redeem(1, 10_000_000);
        require(assets == 10_000_000 && usdg.balanceOf(USER) == 85_000_000, "incorrect partial payout");
        require(BasketNFTFacet(address(diamond)).ownerOf(1) == USER, "partial redeem burned NFT");
        (, address storedAccount, uint128 shares) = BasketViewFacet(address(diamond)).basket(1);
        require(
            storedAccount == account && shares == 15_000_000 && strategy.shareBalance(account) == 15_000_000,
            "partial position wrong"
        );
    }

    function testFullRedeemPaysThenBurnsBasket() public {
        vm.prank(USER);
        DepositFacet(address(diamond)).deposit(1, 25_000_000);
        vm.prank(USER);
        RedeemFacet(address(diamond)).redeem(1, 25_000_000);
        require(usdg.balanceOf(USER) == 100_000_000, "full payout missing");
        (bool ownerRead,) = address(diamond).staticcall(abi.encodeCall(BasketNFTFacet.ownerOf, (1)));
        require(!ownerRead, "full redeem did not burn NFT");
    }

    function testAnnualFeeIsAccruedOnceAndAllocatedProRataAcrossRedeems() public {
        vm.prank(USER);
        DepositFacet(address(diamond)).deposit(1, 25_000_000);
        vm.warp(block.timestamp + 365 days);
        vm.prank(USER);
        RedeemFacet(address(diamond)).redeem(1, 10_000_000);
        require(usdg.balanceOf(FEE_RECIPIENT) == 100_000, "incorrect partial fee");
        (uint128 liability,,) = BasketViewFacet(address(diamond)).feeState(1);
        require(liability == 150_000, "remaining fee incorrect");
        vm.prank(USER);
        RedeemFacet(address(diamond)).redeem(1, 15_000_000);
        require(usdg.balanceOf(FEE_RECIPIENT) == 250_000, "fee charged twice or lost");
        require(usdg.balanceOf(USER) == 99_750_000, "net investor value incorrect");
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
        x = new bytes4[](2);
        x[0] = AdminFacet.configureStrategy.selector;
        x[1] = AdminFacet.setPaused.selector;
    }

    function _nftSelectors() private pure returns (bytes4[] memory x) {
        x = new bytes4[](9);
        x[0] = BasketNFTFacet.name.selector;
        x[1] = BasketNFTFacet.symbol.selector;
        x[2] = BasketNFTFacet.ownerOf.selector;
        x[3] = BasketNFTFacet.balanceOf.selector;
        x[4] = BasketNFTFacet.getApproved.selector;
        x[5] = BasketNFTFacet.isApprovedForAll.selector;
        x[6] = BasketNFTFacet.approve.selector;
        x[7] = BasketNFTFacet.setApprovalForAll.selector;
        x[8] = BasketNFTFacet.transferFrom.selector;
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
        x = new bytes4[](1);
        x[0] = RedeemFacet.redeem.selector;
    }
}
