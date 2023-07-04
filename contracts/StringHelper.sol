// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

library StringHelper {
    function appendString(
        string memory _a,
        string memory _b,
        string memory _c
    ) public pure returns (string memory) {
        return string(abi.encodePacked(_a, _b, _c));
    }

    // append 6 strings together
    function appendString(
        string memory _a,
        string memory _b,
        string memory _c,
        string memory _d,
        string memory _e,
        string memory _f
    ) public pure returns (string memory) {
        return
            appendString(
                appendString(_a, _b, _c),
                appendString(_d, _e, _f),
                ""
            );
    }

     function appendString(
        string memory _a,
        string memory _b,
        string memory _c,
        string memory _d,
        string memory _e,
        string memory _f,
        string memory _g,
        string memory _h,
        string memory _i
    ) public pure returns (string memory) {
        return appendString(
                appendString(_a, _b, _c),
                appendString(_d, _e, _f),
                appendString(_g, _h, _i)
            );
    }

    function repeat(string memory s, uint256 number)
        public
        pure
        returns (string memory)
    {
        string memory rval = "";
        for (uint256 i = 0; i < number; i++) {
            rval = appendString(rval, s, "");
        }
        return rval;
    }

    function substring(
        string memory str,
        uint256 startIndex,
        uint256 endIndex
    ) public pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        bytes memory result = new bytes(endIndex - startIndex);
        for (uint256 i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = strBytes[i];
        }
        return string(result);
    }

    function bytes32ToString(bytes32 _bytes32)
        public
        pure
        returns (string memory)
    {
        uint8 i = 0;
        bytes memory bytesArray = new bytes(64);
        for (i = 0; i < bytesArray.length; i++) {
            uint8 _f = uint8(_bytes32[i / 2] & 0x0f);
            uint8 _l = uint8(_bytes32[i / 2] >> 4);

            bytesArray[i] = toByte(_f);
            i = i + 1;
            bytesArray[i] = toByte(_l);
        }
        return string(bytesArray);
    }

    function toByte(uint8 _uint8) public pure returns (bytes1) {
        if (_uint8 < 10) {
            return bytes1(_uint8 + 48);
        } else {
            return bytes1(_uint8 + 87);
        }
    }

    function STR_EQ(string memory s1, string memory s2)
        public
        pure
        returns (bool)
    {
        if (keccak256(abi.encode(s1)) == keccak256(abi.encode(s2))) return true;
        return false;
    }

    function toAsciiString(address x) public pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint256 i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint256(uint160(x)) / (2**(8 * (19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2 * i] = char(hi);
            s[2 * i + 1] = char(lo);
        }
        return string(s);
    }

    function char(bytes1 b) public pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }
}
