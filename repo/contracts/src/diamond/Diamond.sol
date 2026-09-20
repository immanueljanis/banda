// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IDiamondCut} from "./interfaces/IDiamondCut.sol";
import {LibDiamond} from "./libraries/LibDiamond.sol";

contract Diamond {
    constructor(address owner_, IDiamondCut.FacetCut[] memory cut, address init, bytes memory initCalldata) payable {
        LibDiamond.setContractOwner(owner_);
        LibDiamond.diamondCut(cut, init, initCalldata);
    }

    fallback() external payable {
        address facet = LibDiamond.diamondStorage().selectorToFacetAndPosition[msg.sig].facetAddress;
        require(facet != address(0), "Diamond: function missing");
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
    receive() external payable {}
}
