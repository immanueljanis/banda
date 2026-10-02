// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {BandaDepositTest} from "./BandaDeposit.t.sol";
import {BasketNFTFacet, IERC721Receiver} from "../src/banda/facets/BasketNFTFacet.sol";
import {BasketViewFacet} from "../src/banda/facets/BasketViewFacet.sol";
import {DepositFacet} from "../src/banda/facets/DepositFacet.sol";
import {RedeemFacet} from "../src/banda/facets/RedeemFacet.sol";
import {BasketAccount} from "../src/banda/accounts/BasketAccount.sol";

contract BasketReceiver is IERC721Receiver {
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}

contract BandaNFTTransferTest is BandaDepositTest {
    function testTransferMovesRedeemAuthorityWithoutMovingAccountShares() public {
        vm.prank(USER);
        (, address account, uint256 shares) = DepositFacet(address(diamond)).deposit(1, 25_000_000);
        vm.prank(USER);
        BasketNFTFacet(address(diamond)).approve(APPROVED_OPERATOR, 1);

        vm.prank(USER);
        BasketNFTFacet(address(diamond)).transferFrom(USER, USER_TWO, 1);
        require(BasketNFTFacet(address(diamond)).ownerOf(1) == USER_TWO, "owner did not change");
        require(BasketNFTFacet(address(diamond)).balanceOf(USER) == 0, "old balance remains");
        require(BasketNFTFacet(address(diamond)).balanceOf(USER_TWO) == 1, "new balance missing");
        require(BasketNFTFacet(address(diamond)).getApproved(1) == address(0), "old approval remains");
        (, address storedAccount, uint128 storedShares) = BasketViewFacet(address(diamond)).basket(1);
        require(storedAccount == account && storedShares == shares, "holding changed on transfer");
        require(strategy.shareBalance(account) == shares, "account shares moved");

        vm.prank(APPROVED_OPERATOR);
        (bool oldApprovalRedeemed,) = address(diamond).call(abi.encodeCall(RedeemFacet.redeem, (1, shares, 1)));
        require(!oldApprovalRedeemed, "stale approval redeemed");
        vm.prank(USER);
        (bool oldOwnerRedeemed,) = address(diamond).call(abi.encodeCall(RedeemFacet.redeem, (1, shares, 1)));
        require(!oldOwnerRedeemed, "former owner redeemed");
        vm.prank(USER_TWO);
        (bool accountExecuted,) = account.call(abi.encodeCall(BasketAccount.execute, (address(usdg), 0, "")));
        require(!accountExecuted, "new owner executed arbitrary account call");

        uint256 beforeBalance = usdg.balanceOf(USER_TWO);
        vm.prank(USER_TWO);
        RedeemFacet(address(diamond)).redeem(1, shares / 2, 1);
        require(usdg.balanceOf(USER_TWO) > beforeBalance, "new owner received no payout");
        require(BasketNFTFacet(address(diamond)).ownerOf(1) == USER_TWO, "partial redeem burned NFT");
        (, storedAccount, storedShares) = BasketViewFacet(address(diamond)).basket(1);
        require(storedAccount == account && storedShares == shares / 2, "remaining holding wrong");
    }

    function testRejectedTransfersKeepOwnerApprovalAndHolding() public {
        vm.prank(USER);
        (, address account, uint256 shares) = DepositFacet(address(diamond)).deposit(1, 25_000_000);
        vm.prank(USER);
        BasketNFTFacet(address(diamond)).approve(APPROVED_OPERATOR, 1);

        vm.prank(USER_TWO);
        (bool unauthorized,) = address(diamond).call(
            abi.encodeCall(BasketNFTFacet.transferFrom, (USER, USER_TWO, 1))
        );
        require(!unauthorized, "unauthorized transfer passed");
        vm.prank(APPROVED_OPERATOR);
        (bool wrongFrom,) = address(diamond).call(
            abi.encodeCall(BasketNFTFacet.transferFrom, (USER_TWO, USER_TWO, 1))
        );
        require(!wrongFrom, "wrong-from transfer passed");
        vm.prank(USER);
        (bool zeroRecipient,) = address(diamond).call(
            abi.encodeCall(BasketNFTFacet.transferFrom, (USER, address(0), 1))
        );
        require(!zeroRecipient, "zero-recipient transfer passed");

        require(BasketNFTFacet(address(diamond)).ownerOf(1) == USER, "failed transfer changed owner");
        require(BasketNFTFacet(address(diamond)).getApproved(1) == APPROVED_OPERATOR, "approval changed");
        (, address storedAccount, uint128 storedShares) = BasketViewFacet(address(diamond)).basket(1);
        require(storedAccount == account && storedShares == shares, "failed transfer changed holding");
    }

    function testSafeTransferChecksReceiverAndRollsBackRejectedReceiver() public {
        vm.prank(USER);
        (, address account, uint256 shares) = DepositFacet(address(diamond)).deposit(1, 25_000_000);
        bytes4[] memory selectors = new bytes4[](2);
        selectors[0] = bytes4(keccak256("safeTransferFrom(address,address,uint256)"));
        selectors[1] = bytes4(keccak256("safeTransferFrom(address,address,uint256,bytes)"));

        vm.prank(USER);
        (bool rejected,) = address(diamond).call(
            abi.encodeWithSelector(selectors[0], USER, address(strategy), 1)
        );
        require(!rejected, "non-receiver accepted");
        require(BasketNFTFacet(address(diamond)).ownerOf(1) == USER, "receiver failure changed owner");
        require(strategy.shareBalance(account) == shares, "receiver failure changed holding");

        BasketReceiver receiver = new BasketReceiver();
        vm.prank(USER);
        (bool accepted,) = address(diamond).call(
            abi.encodeWithSelector(selectors[1], USER, address(receiver), 1, bytes("basket"))
        );
        require(accepted, "safe transfer rejected receiver");
        require(BasketNFTFacet(address(diamond)).ownerOf(1) == address(receiver), "safe transfer owner wrong");
    }
}
