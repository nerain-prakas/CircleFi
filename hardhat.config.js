require('@hashgraph/sdk');
require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20", // Latest stable version compatible with Hedera
  
  networks: {
    hederaTestnet: {
      url: "https://testnet.hashio.io/api",
      accounts: [
        process.env.HEDERA_PRIVATE_KEY !== undefined ? process.env.HEDERA_PRIVATE_KEY : ""
      ],
      chainId: 296, // Hedera Testnet chain ID
      gas: 300000,
      gasPrice: 960000000000, // Hedera testnet minimum gas price in wei
    },
  },
  
  etherscan: {
    apiKey: {
      // Hedera doesn't use Etherscan, but we can configure explorer
      hederaTestnet: "N/A", // Placeholder
    },
    customChains: [
      {
        network: "hederaTestnet",
        chainId: 296,
        urls: {
          apiURL: "https://testnet.mirrornode.hedera.com/api/v1", // Hedera Mirror Node API
          browserURL: "https://hashscan.io/testnet", // HashScan explorer
        }
      }
    ]
  },
  
  mocha: {
    timeout: 200000 // 200 seconds
  }
};