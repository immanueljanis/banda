// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IDiamondCut} from "../src/diamond/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../src/diamond/interfaces/IDiamondLoupe.sol";
import {DiamondCutFacet} from "../src/diamond/facets/DiamondCutFacet.sol";
import {OwnershipFacet} from "../src/diamond/facets/OwnershipFacet.sol";
import {AdminFacet} from "../src/banda/facets/AdminFacet.sol";
import {BasketNFTFacet} from "../src/banda/facets/BasketNFTFacet.sol";
import {BasketViewFacet} from "../src/banda/facets/BasketViewFacet.sol";
import {DepositFacet} from "../src/banda/facets/DepositFacet.sol";
import {RedeemFacet} from "../src/banda/facets/RedeemFacet.sol";
import {RebalanceFacet} from "../src/banda/facets/RebalanceFacet.sol";
import {MockUSDG} from "../src/banda/mocks/MockUSDG.sol";
import {SecureMockNavAdapter} from "../src/banda/mocks/SecureMockNavAdapter.sol";

interface UpgradeForkVm {
    function createSelectFork(string calldata rpcUrl) external returns (uint256);
    function envOr(string calldata name, string calldata defaultValue) external returns (string memory);
    function skip(bool skipTest) external;
    function startPrank(address sender) external;
    function stopPrank() external;
}

/// @dev Fork-only regression for the exact live mixed-version Diamond; never broadcasts transactions.
contract RobinhoodNavUpgradeTest {
    UpgradeForkVm private constant vm = UpgradeForkVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant DIAMOND = 0xB1dD20D06fc0741237c812Ca904bD8dc3f7DE4e7;
    address private constant ADMIN = 0x3CFcB94fb9Dd45EA6083298f7Ebf12f228A07e90;
    address private constant SETTLEMENT = 0xB42Df4e64356cAFbAEB63f572Ec95CC3BAE75dba;
    address private constant ADAPTER = 0x50EB95DB909e7870B48D24c01234e69a19066011;

    function setUp() public {
        string memory rpcUrl = vm.envOr("ROBINHOOD_TESTNET_RPC_URL", string(""));
        if (bytes(rpcUrl).length == 0) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork(rpcUrl);
        require(block.chainid == 46_630, "wrong chain");
        require(BasketViewFacet(DIAMOND).isPaused(), "live Diamond not paused");
        require(OwnershipFacet(DIAMOND).owner() == ADMIN, "live owner changed");
    }

    function testUpgradeAllNavConsumersThenCompleteLifecycle() public {
        uint256 balanceBefore = MockUSDG(SETTLEMENT).balanceOf(ADMIN);
        DepositFacet depositFacet = new DepositFacet();
        RedeemFacet redeemFacet = new RedeemFacet();
        RebalanceFacet rebalanceFacet = new RebalanceFacet();

        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](3);
        cuts[0] = IDiamondCut.FacetCut({
            facetAddress: address(depositFacet),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: _one(DepositFacet.deposit.selector)
        });
        bytes4[] memory redeemSelectors = new bytes4[](2);
        redeemSelectors[0] = RedeemFacet.redeem.selector;
        redeemSelectors[1] = RedeemFacet.previewRedeem.selector;
        cuts[1] = IDiamondCut.FacetCut({
            facetAddress: address(redeemFacet),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: redeemSelectors
        });
        cuts[2] = IDiamondCut.FacetCut({
            facetAddress: address(rebalanceFacet),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: _one(RebalanceFacet.rebalance.selector)
        });

        vm.startPrank(ADMIN);
        DiamondCutFacet(DIAMOND).diamondCut(cuts, address(0), "");
        require(BasketViewFacet(DIAMOND).isPaused(), "upgrade changed pause state");
        require(IDiamondLoupe(DIAMOND).facetAddress(DepositFacet.deposit.selector) == address(depositFacet), "deposit");
        require(IDiamondLoupe(DIAMOND).facetAddress(RedeemFacet.redeem.selector) == address(redeemFacet), "redeem");
        require(
            IDiamondLoupe(DIAMOND).facetAddress(RebalanceFacet.rebalance.selector) == address(rebalanceFacet),
            "rebalance"
        );

        (address strategy,,,,) = BasketViewFacet(DIAMOND).strategy(3);
        SecureMockNavAdapter(ADAPTER).setQuote(strategy, 1e18, block.timestamp, block.number, true);
        AdminFacet(DIAMOND).setPaused(false);
        MockUSDG(SETTLEMENT).mint(ADMIN, 20_000_000);
        MockUSDG(SETTLEMENT).approve(DIAMOND, 20_000_000);
        (uint256 tokenId, address account, uint256 shares) = DepositFacet(DIAMOND).deposit(3, 20_000_000);
        require(account.code.length != 0 && shares == 20_000_000, "deposit failed");

        RedeemFacet(DIAMOND).redeem(tokenId, 8_000_000, 7_999_000);
        require(BasketNFTFacet(DIAMOND).ownerOf(tokenId) == ADMIN, "partial redeem burned NFT");
        (,, uint128 remainingShares) = BasketViewFacet(DIAMOND).basket(tokenId);
        require(remainingShares == 12_000_000, "wrong partial remainder");
        RedeemFacet(DIAMOND).redeem(tokenId, remainingShares, remainingShares - 1_000);
        AdminFacet(DIAMOND).setPaused(true);
        vm.stopPrank();

        (bool ownerRead,) = DIAMOND.staticcall(abi.encodeCall(BasketNFTFacet.ownerOf, (tokenId)));
        require(!ownerRead, "full redeem retained NFT");
        require(BasketViewFacet(DIAMOND).isPaused(), "final state not paused");
        require(MockUSDG(SETTLEMENT).balanceOf(ADMIN) == balanceBefore + 20_000_000, "funds not returned");
        require(OwnershipFacet(DIAMOND).owner() == ADMIN, "owner changed");
    }

    function _one(bytes4 selector) private pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](1);
        selectors[0] = selector;
    }
}
