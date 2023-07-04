// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

/*
    @name Base
    @description Base contract with siple functionality most regarding ERC165 
    @author William Doyle
*/

abstract contract Base is ERC165 {
    struct State {
        mapping(bytes4 => bool) _supportedInterfaces;
    }

    State state;

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override
        returns (bool)
    {
        return state._supportedInterfaces[interfaceId];
    }
}
