// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Restricted ERC-6551-compatible account implementation for test fixtures.
/// Only the Banda diamond may execute calls; the NFT holder has no arbitrary-call capability.
contract BasketAccount {
    address public immutable tokenContract;
    uint256 public immutable tokenId;
    address public immutable controller;

    constructor(address tokenContract_, uint256 tokenId_, address controller_) {
        tokenContract = tokenContract_;
        tokenId = tokenId_;
        controller = controller_;
    }
    receive() external payable {}

    function execute(address target, uint256 value, bytes calldata data) external returns (bytes memory result) {
        require(msg.sender == controller, "BasketAccount: not controller");
        (bool success, bytes memory returnData) = target.call{value: value}(data);
        if (!success) {
            assembly { revert(add(returnData, 32), mload(returnData)) }
        }
        return returnData;
    }
}
