// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract UniqueAsset is ERC721 {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor() ERC721("UniqueAsset", "UNA") {
        for (uint256 i = 0; i < 100; i++) {
            awardItem(msg.sender);
        }
    }

    function awardItem(address recipient) public returns (uint256) {
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _mint(recipient, newItemId);
        return newItemId;
    }
}
