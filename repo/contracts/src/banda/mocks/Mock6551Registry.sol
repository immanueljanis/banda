// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
import {BasketAccount} from "../accounts/BasketAccount.sol";

contract Mock6551Registry {
    mapping(bytes32 => address) public accountOf;

    function createAccount(address, uint256, address tokenContract, uint256 tokenId, uint256 salt, bytes calldata)
        external
        returns (address account)
    {
        bytes32 key = keccak256(abi.encode(tokenContract, tokenId, salt));
        account = accountOf[key];
        if (account == address(0)) {
            account = address(new BasketAccount(tokenContract, tokenId, tokenContract));
            accountOf[key] = account;
        }
    }
}
