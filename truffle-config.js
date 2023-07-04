require('dotenv').config()
const HDWalletProvider = require('@truffle/hdwallet-provider');

const ethers = require('ethers');

module.exports = {
  contracts_directory: './contracts',
  networks: {
    mumbai: {
      provider: () => new HDWalletProvider([process.env.PRIVATE_KEY_2], `https://polygon-mumbai.infura.io/v3/${process.env.INFURA_KEY}`),
      network_id: 80001,
      confirmations: 0,
    },
    development: {
      host: "localhost",
      port: 7545,
      network_id: "5777",
      gas: 6721975,
      gasPrice: 20000000000,
      gasLimit: 6721975,
    },
    sepolia: {
      network_id: 11155111,
      provider: () => new HDWalletProvider([process.env.PK_PAULI_GROUP_TEST], `https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`),
      gas: 30000000,
      confirmations: 0,
    },
    goerli: {
      network_id: 5,
      provider: () => new HDWalletProvider([process.env.PRIVATE_KEY_2], `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`),
      gas: 20000000,
      confirmations: 2,
    },
    moonbase: {
      network_id: 1287,
      provider: () => new HDWalletProvider([process.env.PK_PAULI_GROUP_TEST], `https://rpc.api.moonbase.moonbeam.network`),
      gas: 5000000,
      confirmations: 0,
    },
    rinkeby: {
      provider: () => new HDWalletProvider([privateKey], `https://rinkeby.infura.io/v3/${process.env.INFURA_KEY}`),
      network_id: 4,
      gas: 5500000,
      confirmations: 2,
    },
    polygon: {
      provider: () => new HDWalletProvider([process.env.PRIVATE_KEY_2], `https://polygon-rpc.com`),
      network_id: 137,
      gas: 20000000,
      gasPrice: ethers.utils.parseUnits('200', 'gwei'),
      confirmations: 1,
    },
    ethereum: {
      network_id: 1,
      provider: () => new HDWalletProvider([process.env.PRIVATE_KEY_2], `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`),
      gas: 10000000,
      confirmations: 2,
    },
  },

  mocha: {
  },

  compilers: {
    solc: {
      version: "0.8.19",      // Fetch exact version from solc-bin (default: truffle's version)
      settings: {          // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 200
        },
      }
    }
  },

  plugins: ['truffle-plugin-verify'],
  api_keys: {
    polygonscan: process.env.POLYGONSCAN_API_KEY,
  }
};
