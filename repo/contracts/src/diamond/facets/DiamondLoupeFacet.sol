// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
import {IDiamondLoupe} from "../interfaces/IDiamondLoupe.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";

contract DiamondLoupeFacet is IDiamondLoupe {
    function facets() external view returns (Facet[] memory result) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        result = new Facet[](ds.facetAddresses.length);
        for (uint256 i; i < result.length; ++i) {
            address facet = ds.facetAddresses[i];
            result[i] = Facet(facet, ds.facetFunctionSelectors[facet].functionSelectors);
        }
    }

    function facetFunctionSelectors(address facet) external view returns (bytes4[] memory) {
        return LibDiamond.diamondStorage().facetFunctionSelectors[facet].functionSelectors;
    }

    function facetAddresses() external view returns (address[] memory) {
        return LibDiamond.diamondStorage().facetAddresses;
    }

    function facetAddress(bytes4 selector) external view returns (address) {
        return LibDiamond.diamondStorage().selectorToFacetAndPosition[selector].facetAddress;
    }
}
