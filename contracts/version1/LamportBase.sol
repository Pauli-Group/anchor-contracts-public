// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;

abstract contract LamportBase {
    event UpdatedPKH(bytes32 oldPKH, bytes32 newPKH);

    bool initialized = false;
    bytes32 pkh; // public key hash
    mapping(bytes32 => bool) public usedPKHs;
    bytes32[10] recoveryPKHs;

    /*
        @name setTenRecoveryPKHs
        @date October 31st 2022
        @description set the ten recovery public key hashes
        @author William Doyle
        @note 10 was chosen because it isn't two big. There needs to be a limit to the number of recovery keys, so that checking them can be done efficiently (gas)
        @note these 10 keys can only be used to set a new public key hash. They cannot be used to execute general transactions
    */
    function setTenRecoveryPKHs(
        bytes32[10] calldata _recoveryPKHs,
        bytes32[2][256] calldata currentpub,
        bytes[256] calldata sig,
        bytes32 nextPKH
    )
        public
        onlyLamportOwner(currentpub, sig, nextPKH, abi.encode(_recoveryPKHs))
    {
        recoveryPKHs = _recoveryPKHs;
    }

    /*
        @name getRecoveryPKHs
        @date October 31st 2022
        @author William Doyle
    */
    function getRecoveryPKHs() public view returns (bytes32[10] memory) {
        return recoveryPKHs;
    }

    /*
        @name recover
        @date October 31st 2022
        @author William Doyle
        @description recover a wallet using 1 of the 10 recovery PKHs to set a new PKH
    */
    function recover(
        bytes32 newPKH,
        bytes32[2][256] calldata recoverypub,
        bytes[256] calldata sig
    ) public {
        bytes32 rpkh = keccak256(abi.encode(recoverypub));
        require(usedPKHs[rpkh] == false, "LamportBase: this recovery key has already been used");

        // recoverypub matches one of the recovery public keys
        bool found = false;
        for (uint256 i = 0; i < 10; i++) {
            if (rpkh == recoveryPKHs[i]) {
                found = true;
                break;
            }
        }
        require(found, "LamportBase: recovery public key not found");

        // sig is valid
        uint256 signedMessageHash = uint256(keccak256(abi.encode(newPKH)));
        require(
            verify_u256(signedMessageHash, sig, recoverypub),
            "LamportBase: recovery signature invalid"
        );

        usedPKHs[rpkh] = true; // mark the used recovery pkh as used
        setPKH(newPKH);
    }

    /*
        @name setPKH
        @description setter for the public key hash (pkh state variable), ensures the pkh has not been used before. All changes to that state variable need to pass through this function.
        @author William Doyle
    */
    function setPKH(bytes32 newPKH) internal {
        require(!usedPKHs[newPKH], "LamportBase: PKH already used");
        emit UpdatedPKH(pkh, newPKH);
        pkh = newPKH;
        usedPKHs[newPKH] = true;
    }

    // initial setup of the Lamport system
    function init(bytes32 firstPKH) public {
        require(!initialized, "LamportBase: Already initialized");
        setPKH(firstPKH);
        initialized = true;
    }

    // get the current public key hash
    function getPKH() public view returns (bytes32) {
        return pkh;
    }

    // lamport 'verify' logic
    function verify_u256(
        uint256 bits,
        bytes[256] calldata sig,
        bytes32[2][256] calldata pub
    ) public pure returns (bool) {
        unchecked {
            for (uint256 i; i < 256; i++) {
                if (
                    pub[i][((bits & (1 << (255 - i))) > 0) ? 1 : 0] !=
                    keccak256(sig[i])
                ) return false;
            }

            return true;
        }
    }

    /*
        @name onlyLamportOwner
        @description modifier that checks that the sender is the owner of the Lamport wallet --> verifies the signature --> sets the new PKH 
        @params currentpub - the current public key
        @params sig - the lamport signature 
        @params nextPKH - the new public key hash (hash of the public key that will be used to sign the next transaction)
        @params prepacked - all the transaction data that needs to be included in the signed hash (except the nextPKH, which is packed with prepacked by this modifier itself)
        @author William Doyle
    */
    modifier onlyLamportOwner(
        bytes32[2][256] calldata currentpub,
        bytes[256] calldata sig,
        bytes32 nextPKH,
        bytes memory prepacked
    ) {
        require(initialized, "LamportBase: not initialized"); // 1. contract must be ready
        require(
            keccak256(abi.encodePacked(currentpub)) == pkh,
            "LamportBase: currentpub does not match known PUBLIC KEY HASH"
        );

        require(
            verify_u256(
                uint256(keccak256(abi.encodePacked(prepacked, nextPKH))),
                sig,
                currentpub
            ),
            "LamportBase: Signature not valid"
        );

        setPKH(nextPKH);
        _;
    }
}
