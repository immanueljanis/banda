// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {MockStrategy} from "../src/banda/mocks/MockStrategy.sol";
import {MockUSDG} from "../src/banda/mocks/MockUSDG.sol";
import {SecureMockNavAdapter} from "../src/banda/mocks/SecureMockNavAdapter.sol";

interface NavVm {
    function prank(address) external;
    function warp(uint256) external;
    function roll(uint256) external;
}

contract SecureMockNavAdapterTest {
    NavVm private constant vm = NavVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant OPERATOR = address(0x0A7);
    address private constant ATTACKER = address(0xBAD);
    MockStrategy private strategy;
    MockStrategy private otherStrategy;
    SecureMockNavAdapter private adapter;

    function setUp() public {
        MockUSDG asset = new MockUSDG();
        strategy = new MockStrategy(address(asset));
        otherStrategy = new MockStrategy(address(asset));
        adapter = new SecureMockNavAdapter(address(this), OPERATOR, 1_000);
    }

    function testOnlyAuthorizedRoleCanUpdate() public {
        vm.prank(ATTACKER);
        (bool ok,) = address(adapter)
            .call(abi.encodeCall(adapter.setQuote, (address(strategy), 1e18, block.timestamp, block.number, true)));
        require(!ok, "attacker updated quote");
    }

    function testQuotesAreBoundToStrategy() public {
        vm.prank(OPERATOR);
        adapter.setQuote(address(strategy), 1e18, block.timestamp, block.number, true);
        (uint256 first,,,) = adapter.quote(address(strategy), 10_000_000);
        (uint256 second,,,) = adapter.quote(address(otherStrategy), 10_000_000);
        require(first == 10_000_000 && second == 0, "quote crossed strategy boundary");
    }

    function testOperatorCannotExceedDeviationButOwnerCanForce() public {
        vm.prank(OPERATOR);
        adapter.setQuote(address(strategy), 1e18, block.timestamp, block.number, true);
        vm.warp(block.timestamp + 1);
        vm.roll(block.number + 1);
        vm.prank(OPERATOR);
        (bool ok,) = address(adapter)
            .call(abi.encodeCall(adapter.setQuote, (address(strategy), 12e17, block.timestamp, block.number, true)));
        require(!ok, "operator exceeded deviation");
        adapter.forceSetQuote(address(strategy), 12e17, block.timestamp, block.number, true);
        (uint256 quoted,,,) = adapter.quote(address(strategy), 10_000_000);
        require(quoted == 12_000_000, "owner force update failed");
    }

    function testQuoteMetadataCannotRollBackOrPointToFuture() public {
        vm.prank(OPERATOR);
        adapter.setQuote(address(strategy), 1e18, block.timestamp, block.number, true);
        vm.warp(block.timestamp + 2);
        vm.roll(block.number + 2);
        vm.prank(OPERATOR);
        (bool rollbackOk,) = address(adapter)
            .call(abi.encodeCall(adapter.setQuote, (address(strategy), 1e18, block.timestamp - 3, block.number, true)));
        vm.prank(OPERATOR);
        (bool futureOk,) = address(adapter)
            .call(abi.encodeCall(adapter.setQuote, (address(strategy), 1e18, block.timestamp + 1, block.number, true)));
        require(!rollbackOk && !futureOk, "invalid metadata accepted");
    }
}
