const ethers = require('ethers')
const fs = require('fs')
const path = require('path');

const { mk_key_pair } = require('lamportwalletmanager/src/index.js')
const LamportWalletFactory = artifacts.require("LamportWalletFactory")
const StringHelper = artifacts.require('StringHelper')

const __chain_name__ = 'MUMBAI'

const keys = mk_key_pair()
const lamportPKH = ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32[2][256]'], [keys.pub]))

function saveKeys(_keys) {
    // Define the directory path
    const dirPath = path.join(__dirname, '../keys');

    // Check if the directory exists, if not, create it
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    const _lamportPKH = ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32[2][256]'], [_keys.pub]))
    const fpath = `${dirPath}/${__chain_name__}_${_lamportPKH}_${new Date().getTime().toString()}.json`
    const fbody = JSON.stringify(_keys, null, 2)
    fs.writeFileSync(fpath, fbody)
    console.log(`keys saved`)
}
saveKeys(keys)

// prepare the next key pair
const nextKeys = mk_key_pair()
const nextpkh = ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32[2][256]'], [nextKeys.pub]))
saveKeys(nextKeys)

module.exports = async function (deployer) {
    await deployer.deploy(StringHelper)
    await deployer.link(StringHelper, [ LamportWalletFactory])

    await deployer.deploy(LamportWalletFactory, ethers.utils.parseEther('0.1'), lamportPKH)
    const lamportWalletFactory = await LamportWalletFactory.deployed()
    console.log(`STUB 2_wallets.js finished`)
}
