// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;
import "@openzeppelin/contracts/interfaces/IERC1271.sol";

/*
    @date October 24th 2022
    @author William Doyle
    @description implementation of EIP 1271 for signature validation, These signatures are NOT QUANTUM SAFE. This EIP is still implemented because it doesn't comprimise funds, but will provide utility for the next ~10 years. 
    @notes Based on reference implementation from: https://eips.ethereum.org/EIPS/eip-1271, With modifications for this version of solidity from: https://github.com/delegatable/delegatable-sol/blob/d12016f532887fb3d7df1f51ff50977d5cb652f7/contracts/test/EIP1271.sol
*/

abstract contract EIP1271SignatureValidation is IERC1271 {
    address signer;

    constructor(address _signer) {
        signer = _signer;
    }

    function getSigner() public view returns (address) {
        return signer;
    }

    /**
     * @notice Verifies that the signer is the owner of the signing contract.
     */
    function isValidSignature(bytes32 _hash, bytes calldata _signature)
        external
        view
        override
        returns (bytes4)
    {
        if (recoverSigner(_hash, _signature) == signer) {
            return 0x1626ba7e; // indicate valid signature
        } else {
            return 0xffffffff; // indicate invalid signature
        }
    }

    /**
     * @notice Recover the signer of hash, assuming it's an EOA account
     * @dev Only for EthSign signatures
     * @param _hash       Hash of message that was signed
     * @param _signature  Signature encoded as (bytes32 r, bytes32 s, uint8 v)
     */
    function recoverSigner(bytes32 _hash, bytes memory _signature)
        internal
        pure
        returns (address _signer)
    {
        require(
            _signature.length == 65,
            "SignatureValidator#recoverSigner: invalid signature length"
        );

        // Variables are not scoped in Solidity.
        // uint8 v = uint8(_signature[64]);
        // bytes32 r = _signature.readBytes32(0);
        // bytes32 s = _signature.readBytes32(32);
        (uint8 v, bytes32 r, bytes32 s) = _splitSignature(_signature); // https://github.com/delegatable/delegatable-sol/blob/d12016f532887fb3d7df1f51ff50977d5cb652f7/contracts/test/EIP1271.sol

        // EIP-2 still allows signature malleability for ecrecover(). Remove this possibility and make the signature
        // unique. Appendix F in the Ethereum Yellow paper (https://ethereum.github.io/yellowpaper/paper.pdf), defines
        // the valid range for s in (281): 0 < s < secp256k1n ÷ 2 + 1, and for v in (282): v ∈ {27, 28}. Most
        // signatures from current libraries generate a unique signature with an s-value in the lower half order.
        //
        // If your library generates malleable signatures, such as s-values in the upper range, calculate a new s-value
        // with 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141 - s1 and flip v from 27 to 28 or
        // vice versa. If your library also generates signatures with 0/1 for v instead 27/28, add 27 to v to accept
        // these malleable signatures as well.
        //
        // Source OpenZeppelin
        // https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/cryptography/ECDSA.sol

        if (
            uint256(s) >
            0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0
        ) {
            revert(
                "SignatureValidator#recoverSigner: invalid signature 's' value"
            );
        }

        if (v != 27 && v != 28) {
            revert(
                "SignatureValidator#recoverSigner: invalid signature 'v' value"
            );
        }

        // Recover ECDSA signer
        _signer = ecrecover(
            keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", _hash)
            ),
            v,
            r,
            s
        );

        // Prevent signer from being 0x0
        require(
            _signer != address(0x0),
            "SignatureValidator#recoverSigner: INVALID_SIGNER"
        );

        return _signer;
    }

    //https://github.com/delegatable/delegatable-sol/blob/d12016f532887fb3d7df1f51ff50977d5cb652f7/contracts/test/EIP1271.sol
    function _splitSignature(bytes memory sig)
        internal
        pure
        returns (
            uint8 v,
            bytes32 r,
            bytes32 s
        )
    {
        require(sig.length == 65);

        assembly {
            // first 32 bytes, after the length prefix.
            r := mload(add(sig, 32))
            // second 32 bytes.
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes).
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
    }
}
