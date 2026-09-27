// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IDiamondCut} from "../src/diamond/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../src/diamond/interfaces/IDiamondLoupe.sol";
import {DiamondCutFacet} from "../src/diamond/facets/DiamondCutFacet.sol";
import {BasketViewFacet} from "../src/banda/facets/BasketViewFacet.sol";
import {DepositFacet} from "../src/banda/facets/DepositFacet.sol";
import {RedeemFacet} from "../src/banda/facets/RedeemFacet.sol";
import {RebalanceFacet} from "../src/banda/facets/RebalanceFacet.sol";

interface NavConsumerUpgradeVm {
    function startBroadcast() external;
    function stopBroadcast() external;
}

/// @notice Replaces every facet that embeds LibNavGuard while the Diamond remains paused.
contract UpgradeNavConsumersRobinhoodTestnet {
    NavConsumerUpgradeVm private constant vm =
        NavConsumerUpgradeVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 private constant ROBINHOOD_TESTNET_CHAIN_ID = 46_630;
    address private constant DIAMOND = 0xB1dD20D06fc0741237c812Ca904bD8dc3f7DE4e7;

    function run()
        external
        returns (DepositFacet depositFacet, RedeemFacet redeemFacet, RebalanceFacet rebalanceFacet)
    {
        require(block.chainid == ROBINHOOD_TESTNET_CHAIN_ID, "Upgrade: wrong chain");
        require(BasketViewFacet(DIAMOND).isPaused(), "Upgrade: Diamond must be paused");

        vm.startBroadcast();
        depositFacet = new DepositFacet();
        redeemFacet = new RedeemFacet();
        rebalanceFacet = new RebalanceFacet();

        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](3);
        cuts[0] = IDiamondCut.FacetCut({
            facetAddress: address(depositFacet),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: _depositSelectors()
        });
        cuts[1] = IDiamondCut.FacetCut({
            facetAddress: address(redeemFacet),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: _redeemSelectors()
        });
        cuts[2] = IDiamondCut.FacetCut({
            facetAddress: address(rebalanceFacet),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: _rebalanceSelectors()
        });
        DiamondCutFacet(DIAMOND).diamondCut(cuts, address(0), "");
        vm.stopBroadcast();

        require(BasketViewFacet(DIAMOND).isPaused(), "Upgrade: Diamond unpaused");
        require(
            IDiamondLoupe(DIAMOND).facetAddress(DepositFacet.deposit.selector) == address(depositFacet),
            "Upgrade: deposit selector mismatch"
        );
        require(
            IDiamondLoupe(DIAMOND).facetAddress(RedeemFacet.redeem.selector) == address(redeemFacet)
                && IDiamondLoupe(DIAMOND).facetAddress(RedeemFacet.previewRedeem.selector) == address(redeemFacet),
            "Upgrade: redeem selector mismatch"
        );
        require(
            IDiamondLoupe(DIAMOND).facetAddress(RebalanceFacet.rebalance.selector) == address(rebalanceFacet),
            "Upgrade: rebalance selector mismatch"
        );
    }

    function _depositSelectors() private pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](1);
        selectors[0] = DepositFacet.deposit.selector;
    }

    function _redeemSelectors() private pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](2);
        selectors[0] = RedeemFacet.redeem.selector;
        selectors[1] = RedeemFacet.previewRedeem.selector;
    }

    function _rebalanceSelectors() private pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](1);
        selectors[0] = RebalanceFacet.rebalance.selector;
    }
}
