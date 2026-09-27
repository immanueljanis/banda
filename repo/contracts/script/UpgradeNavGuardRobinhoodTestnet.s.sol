// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IDiamondCut} from "../src/diamond/interfaces/IDiamondCut.sol";
import {DiamondCutFacet} from "../src/diamond/facets/DiamondCutFacet.sol";
import {AdminFacet} from "../src/banda/facets/AdminFacet.sol";
import {BasketViewFacet} from "../src/banda/facets/BasketViewFacet.sol";
import {NavGuardFacet} from "../src/banda/facets/NavGuardFacet.sol";
import {SecureMockNavAdapter} from "../src/banda/mocks/SecureMockNavAdapter.sol";

interface UpgradeVm {
    function envAddress(string calldata name) external view returns (address value);
    function startBroadcast() external;
    function stopBroadcast() external;
}

/// @notice Replaces the deployed testnet NAV guard while the Diamond remains paused.
contract UpgradeNavGuardRobinhoodTestnet {
    UpgradeVm private constant vm = UpgradeVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 private constant ROBINHOOD_TESTNET_CHAIN_ID = 46_630;
    address private constant DIAMOND = 0xB1dD20D06fc0741237c812Ca904bD8dc3f7DE4e7;

    function run() external returns (SecureMockNavAdapter adapter, AdminFacet adminFacet, NavGuardFacet navFacet) {
        require(block.chainid == ROBINHOOD_TESTNET_CHAIN_ID, "Upgrade: wrong chain");
        require(BasketViewFacet(DIAMOND).isPaused(), "Upgrade: Diamond must be paused");
        address admin = vm.envAddress("BANDA_ADMIN");
        address operator = vm.envAddress("BANDA_OPERATOR");

        vm.startBroadcast();
        adapter = new SecureMockNavAdapter(admin, operator, 1_000);
        adminFacet = new AdminFacet();
        navFacet = new NavGuardFacet();

        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](4);
        cuts[0] = IDiamondCut.FacetCut({
            facetAddress: address(adminFacet),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: _adminReplaceSelectors()
        });
        cuts[1] = IDiamondCut.FacetCut({
            facetAddress: address(adminFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: _adminAddSelectors()
        });
        cuts[2] = IDiamondCut.FacetCut({
            facetAddress: address(navFacet),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: _navReplaceSelectors()
        });
        cuts[3] = IDiamondCut.FacetCut({
            facetAddress: address(navFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: _navAddSelectors()
        });
        DiamondCutFacet(DIAMOND).diamondCut(cuts, address(0), "");
        AdminFacet(DIAMOND).configureNavGuardPolicy(address(adapter), 15 minutes, 20);
        for (uint32 strategyId = 1; strategyId <= 5; ++strategyId) {
            (address strategy,,,,) = BasketViewFacet(DIAMOND).strategy(strategyId);
            adapter.setQuote(strategy, 1e18, block.timestamp, block.number, true);
        }
        vm.stopBroadcast();

        require(BasketViewFacet(DIAMOND).isPaused(), "Upgrade: Diamond unpaused");
        require(NavGuardFacet(DIAMOND).navBlockLag() == 20, "Upgrade: block lag not configured");
    }

    function _adminReplaceSelectors() private pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](5);
        selectors[0] = AdminFacet.configureStrategy.selector;
        selectors[1] = AdminFacet.setPaused.selector;
        selectors[2] = AdminFacet.configureNavGuard.selector;
        selectors[3] = AdminFacet.setRebalanceOperator.selector;
        selectors[4] = AdminFacet.setRebalanceBounds.selector;
    }

    function _adminAddSelectors() private pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](1);
        selectors[0] = AdminFacet.configureNavGuardPolicy.selector;
    }

    function _navReplaceSelectors() private pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](2);
        selectors[0] = NavGuardFacet.navGuard.selector;
        selectors[1] = NavGuardFacet.previewNav.selector;
    }

    function _navAddSelectors() private pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](1);
        selectors[0] = NavGuardFacet.navBlockLag.selector;
    }
}
