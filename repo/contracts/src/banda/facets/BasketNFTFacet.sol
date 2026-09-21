// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {LibBandaStorage} from "../libraries/LibBandaStorage.sol";

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data)
        external
        returns (bytes4);
}

/// @dev Minimal ERC-721 ownership surface. Mint/burn stay private to lifecycle facets.
contract BasketNFTFacet {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    function name() external pure returns (string memory) {
        return "Banda Basket";
    }

    function symbol() external pure returns (string memory) {
        return "BANDA";
    }

    function ownerOf(uint256 tokenId) public view returns (address owner_) {
        owner_ = LibBandaStorage.appStorage().ownerOf[tokenId];
        require(owner_ != address(0), "Banda: token missing");
    }

    function balanceOf(address owner_) external view returns (uint256) {
        require(owner_ != address(0), "Banda: owner zero");
        return LibBandaStorage.appStorage().balanceOf[owner_];
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        ownerOf(tokenId);
        return LibBandaStorage.appStorage().tokenApproval[tokenId];
    }

    function isApprovedForAll(address owner_, address operator) external view returns (bool) {
        return LibBandaStorage.appStorage().operatorApproval[owner_][operator];
    }

    function approve(address approved, uint256 tokenId) external {
        address owner_ = ownerOf(tokenId);
        require(
            msg.sender == owner_ || LibBandaStorage.appStorage().operatorApproval[owner_][msg.sender],
            "Banda: not approved"
        );
        LibBandaStorage.appStorage().tokenApproval[tokenId] = approved;
        emit Approval(owner_, approved, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        require(operator != msg.sender, "Banda: self approval");
        LibBandaStorage.appStorage().operatorApproval[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        require(to != address(0), "Banda: recipient zero");
        address owner_ = ownerOf(tokenId);
        require(owner_ == from, "Banda: wrong from");
        LibBandaStorage.AppStorage storage s = LibBandaStorage.appStorage();
        require(!s.depositEntered, "Banda: lifecycle busy");
        require(
            msg.sender == owner_ || msg.sender == s.tokenApproval[tokenId] || s.operatorApproval[owner_][msg.sender],
            "Banda: not approved"
        );
        delete s.tokenApproval[tokenId];
        --s.balanceOf[from];
        ++s.balanceOf[to];
        s.ownerOf[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public {
        transferFrom(from, to, tokenId);
        if (to.code.length != 0) {
            require(
                IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data)
                    == IERC721Receiver.onERC721Received.selector,
                "Banda: unsafe recipient"
            );
        }
    }

    function _mint(address to, uint256 tokenId) internal {
        require(to != address(0), "Banda: recipient zero");
        LibBandaStorage.AppStorage storage s = LibBandaStorage.appStorage();
        require(s.ownerOf[tokenId] == address(0), "Banda: token exists");
        s.ownerOf[tokenId] = to;
        ++s.balanceOf[to];
        emit Transfer(address(0), to, tokenId);
    }

    function _burn(uint256 tokenId) internal {
        LibBandaStorage.AppStorage storage s = LibBandaStorage.appStorage();
        address owner_ = ownerOf(tokenId);
        delete s.tokenApproval[tokenId];
        --s.balanceOf[owner_];
        delete s.ownerOf[tokenId];
        emit Transfer(owner_, address(0), tokenId);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        LibBandaStorage.AppStorage storage s = LibBandaStorage.appStorage();
        address owner_ = ownerOf(tokenId);
        return spender == owner_ || spender == s.tokenApproval[tokenId] || s.operatorApproval[owner_][spender];
    }
}
