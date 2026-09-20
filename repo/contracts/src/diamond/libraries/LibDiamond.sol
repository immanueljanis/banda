// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IDiamondCut} from "../interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../interfaces/IDiamondLoupe.sol";

library LibDiamond {
    bytes32 internal constant DIAMOND_STORAGE_POSITION = keccak256("banda.diamond.standard.storage.v1");

    struct FacetAddressAndSelectorPosition {
        address facetAddress;
        uint96 selectorPosition;
    }

    struct FacetFunctionSelectors {
        bytes4[] functionSelectors;
        uint256 facetAddressPosition;
    }

    struct DiamondStorage {
        mapping(bytes4 => FacetAddressAndSelectorPosition) selectorToFacetAndPosition;
        mapping(address => FacetFunctionSelectors) facetFunctionSelectors;
        address[] facetAddresses;
        mapping(bytes4 => bool) supportedInterfaces;
        address contractOwner;
    }
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    function diamondStorage() internal pure returns (DiamondStorage storage ds) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly { ds.slot := position }
    }

    function setContractOwner(address newOwner) internal {
        DiamondStorage storage ds = diamondStorage();
        address previousOwner = ds.contractOwner;
        ds.contractOwner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function enforceIsContractOwner() internal view {
        require(msg.sender == diamondStorage().contractOwner, "Diamond: not owner");
    }

    function contractOwner() internal view returns (address) {
        return diamondStorage().contractOwner;
    }

    function diamondCut(IDiamondCut.FacetCut[] memory cut, address init, bytes memory initCalldata) internal {
        for (uint256 i; i < cut.length; ++i) {
            IDiamondCut.FacetCutAction action = cut[i].action;
            if (action == IDiamondCut.FacetCutAction.Add) {
                addFunctions(cut[i].facetAddress, cut[i].functionSelectors);
            } else if (action == IDiamondCut.FacetCutAction.Replace) {
                replaceFunctions(cut[i].facetAddress, cut[i].functionSelectors);
            } else if (action == IDiamondCut.FacetCutAction.Remove) {
                removeFunctions(cut[i].facetAddress, cut[i].functionSelectors);
            } else {
                revert("Diamond: invalid action");
            }
        }
        emit IDiamondCut.DiamondCut(cut, init, initCalldata);
        initializeDiamondCut(init, initCalldata);
    }

    function addFunctions(address facet, bytes4[] memory selectors) private {
        require(facet != address(0) && facet.code.length != 0, "Diamond: invalid facet");
        DiamondStorage storage ds = diamondStorage();
        uint96 selectorPosition = uint96(ds.facetFunctionSelectors[facet].functionSelectors.length);
        if (selectorPosition == 0) addFacet(ds, facet);
        for (uint256 i; i < selectors.length; ++i) {
            bytes4 selector = selectors[i];
            require(ds.selectorToFacetAndPosition[selector].facetAddress == address(0), "Diamond: selector exists");
            addFunction(ds, selector, selectorPosition++, facet);
        }
    }

    function replaceFunctions(address facet, bytes4[] memory selectors) private {
        require(facet != address(0) && facet.code.length != 0, "Diamond: invalid facet");
        DiamondStorage storage ds = diamondStorage();
        uint96 selectorPosition = uint96(ds.facetFunctionSelectors[facet].functionSelectors.length);
        if (selectorPosition == 0) addFacet(ds, facet);
        for (uint256 i; i < selectors.length; ++i) {
            address oldFacet = ds.selectorToFacetAndPosition[selectors[i]].facetAddress;
            require(oldFacet != facet, "Diamond: same facet");
            removeFunction(ds, oldFacet, selectors[i]);
            addFunction(ds, selectors[i], selectorPosition++, facet);
        }
    }

    function removeFunctions(address facet, bytes4[] memory selectors) private {
        require(facet == address(0), "Diamond: remove facet must be zero");
        DiamondStorage storage ds = diamondStorage();
        for (uint256 i; i < selectors.length; ++i) {
            removeFunction(ds, ds.selectorToFacetAndPosition[selectors[i]].facetAddress, selectors[i]);
        }
    }

    function addFacet(DiamondStorage storage ds, address facet) private {
        enforceHasContractCode(facet, "Diamond: facet has no code");
        ds.facetFunctionSelectors[facet].facetAddressPosition = ds.facetAddresses.length;
        ds.facetAddresses.push(facet);
    }

    function addFunction(DiamondStorage storage ds, bytes4 selector, uint96 position, address facet) private {
        ds.selectorToFacetAndPosition[selector] = FacetAddressAndSelectorPosition(facet, position);
        ds.facetFunctionSelectors[facet].functionSelectors.push(selector);
    }

    function removeFunction(DiamondStorage storage ds, address facet, bytes4 selector) private {
        require(facet != address(0), "Diamond: selector missing");
        require(facet != address(this), "Diamond: immutable selector");
        uint256 selectorPosition = ds.selectorToFacetAndPosition[selector].selectorPosition;
        uint256 lastPosition = ds.facetFunctionSelectors[facet].functionSelectors.length - 1;
        if (selectorPosition != lastPosition) {
            bytes4 lastSelector = ds.facetFunctionSelectors[facet].functionSelectors[lastPosition];
            ds.facetFunctionSelectors[facet].functionSelectors[selectorPosition] = lastSelector;
            ds.selectorToFacetAndPosition[lastSelector].selectorPosition = uint96(selectorPosition);
        }
        ds.facetFunctionSelectors[facet].functionSelectors.pop();
        delete ds.selectorToFacetAndPosition[selector];
        if (lastPosition == 0) {
            uint256 facetPosition = ds.facetFunctionSelectors[facet].facetAddressPosition;
            uint256 lastFacetPosition = ds.facetAddresses.length - 1;
            if (facetPosition != lastFacetPosition) {
                address lastFacet = ds.facetAddresses[lastFacetPosition];
                ds.facetAddresses[facetPosition] = lastFacet;
                ds.facetFunctionSelectors[lastFacet].facetAddressPosition = facetPosition;
            }
            ds.facetAddresses.pop();
            delete ds.facetFunctionSelectors[facet].facetAddressPosition;
        }
    }

    function initializeDiamondCut(address init, bytes memory initCalldata) private {
        if (init == address(0)) {
            require(initCalldata.length == 0, "Diamond: init calldata");
            return;
        }
        enforceHasContractCode(init, "Diamond: init has no code");
        (bool success, bytes memory error) = init.delegatecall(initCalldata);
        if (!success) {
            if (error.length == 0) revert("Diamond: init failed");
            assembly { revert(add(error, 32), mload(error)) }
        }
    }

    function enforceHasContractCode(address contract_, string memory message) private view {
        require(contract_.code.length > 0, message);
    }
}
