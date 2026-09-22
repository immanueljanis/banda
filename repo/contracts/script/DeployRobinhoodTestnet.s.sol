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
import {MockNavAdapter} from "../src/banda/mocks/MockNavAdapter.sol";

interface Vm {
    function envUint(string calldata name) external view returns (uint256 value);
    function envAddress(string calldata name) external view returns (address value);
    function addr(uint256 privateKey) external pure returns (address keyAddr);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

/// @notice Testnet-only rehearsal. It deploys public-mint tUSDG and mock strategies.
contract DeployRobinhoodTestnet {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 private constant ROBINHOOD_TESTNET_CHAIN_ID = 46_630;
    uint96 private constant MINIMUM_DEPOSIT = 10_000_000; // 10 tUSDG

    function run() external returns (Diamond diamond, MockUSDG settlement, MockNavAdapter navAdapter) {
        require(block.chainid == ROBINHOOD_TESTNET_CHAIN_ID, "Deploy: wrong chain");

        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address admin = vm.envAddress("BANDA_ADMIN");
        address operator = vm.envAddress("BANDA_OPERATOR");
        address feeRecipient = vm.envAddress("BANDA_FEE_RECIPIENT");
        require(admin == vm.addr(deployerKey), "Deploy: admin must broadcast");
        require(operator != address(0) && operator != admin, "Deploy: distinct operator required");
        require(feeRecipient != address(0), "Deploy: fee recipient required");

        vm.startBroadcast(deployerKey);

        settlement = new MockUSDG();
        navAdapter = new MockNavAdapter();
        Mock6551Registry registry = new Mock6551Registry();
        BasketAccount accountImplementation = new BasketAccount(address(0), 0, address(0));
        BandaInit init = new BandaInit();

        IDiamondCut.FacetCut[] memory cuts = _deployCuts();
        diamond = new Diamond(
            admin,
            cuts,
            address(init),
            abi.encodeCall(BandaInit.init, (address(settlement), address(registry), address(accountImplementation)))
        );

        AdminFacet adminFacet = AdminFacet(address(diamond));
        adminFacet.configureNavGuard(address(navAdapter), 1 hours);
        adminFacet.setRebalanceOperator(operator);
        _configureMandate(adminFacet, settlement, feeRecipient, 200); // NEURAL
        _configureMandate(adminFacet, settlement, feeRecipient, 200); // RAILS
        _configureMandate(adminFacet, settlement, feeRecipient, 100); // RESERVE
        _configureMandate(adminFacet, settlement, feeRecipient, 200); // FRONTIER
        _configureMandate(adminFacet, settlement, feeRecipient, 100); // FORTRESS
        adminFacet.setPaused(true);

        vm.stopBroadcast();
    }

    function _configureMandate(
        AdminFacet adminFacet,
        MockUSDG settlement,
        address feeRecipient,
        uint16 annualFeeBps
    ) private {
        MockStrategy strategy = new MockStrategy(address(settlement));
        adminFacet.configureStrategy(0, address(strategy), MINIMUM_DEPOSIT, annualFeeBps, feeRecipient, true);
    }

    function _deployCuts() private returns (IDiamondCut.FacetCut[] memory cuts) {
        cuts = new IDiamondCut.FacetCut[](10);
        cuts[0] = _cut(address(new DiamondCutFacet()), _cutSelectors());
        cuts[1] = _cut(address(new DiamondLoupeFacet()), _loupeSelectors());
        cuts[2] = _cut(address(new OwnershipFacet()), _ownershipSelectors());
        cuts[3] = _cut(address(new AdminFacet()), _adminSelectors());
        cuts[4] = _cut(address(new BasketNFTFacet()), _nftSelectors());
        cuts[5] = _cut(address(new DepositFacet()), _depositSelectors());
        cuts[6] = _cut(address(new BasketViewFacet()), _viewSelectors());
        cuts[7] = _cut(address(new RedeemFacet()), _redeemSelectors());
        cuts[8] = _cut(address(new NavGuardFacet()), _navSelectors());
        cuts[9] = _cut(address(new RebalanceFacet()), _rebalanceSelectors());
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
