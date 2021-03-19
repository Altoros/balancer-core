require('dotenv').config();
const HDWalletProvider = require("@truffle/hdwallet-provider");

let INFURA_PROJECT_ID;
let DEPLOYMENT_ACCOUNT_PK;
let GAS_PRICE;

if (process.env.NODE_ENV !== 'test') {
  [INFURA_PROJECT_ID, DEPLOYMENT_ACCOUNT_PK, GAS_PRICE] = getConfigs();
}

module.exports = {
    networks: {
        // development: {
        //     host: 'localhost', // Localhost (default: none)
        //     port: 8545, // Standard Ethereum port (default: none)
        //     network_id: '*', // Any network (default: none)
        //     gas: 10000000,
        // },
        coverage: {
            host: 'localhost',
            network_id: '*',
            port: 8555,
            gas: 0xfffffffffff,
            gasPrice: 0x01,
        },
        rinkeby: {
            provider: () => new HDWalletProvider({
                privateKeys: [DEPLOYMENT_ACCOUNT_PK],
                providerOrUrl: `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID}`
            }),
            network_id: 4,
            gas: 10000000,
            gasPrice: GAS_PRICE,
            skipDryRun: true,
        },
        kovan: {
            provider: () => new HDWalletProvider({
                privateKeys: [DEPLOYMENT_ACCOUNT_PK],
                providerOrUrl: `https://kovan.infura.io/v3/${INFURA_PROJECT_ID}`
            }),
            network_id: 42,
            gas: 10000000,
            gasPrice: GAS_PRICE,
            skipDryRun: true,
        },
        mainnet: {
            provider: () => new HDWalletProvider({
                privateKeys: [DEPLOYMENT_ACCOUNT_PK],
                providerOrUrl: `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`
            }),
            network_id: 1,
            gas: 10000000,
            gasPrice: GAS_PRICE,
            timeoutBlocks: 200,
        },
    },
    // Configure your compilers
    compilers: {
        solc: {
            version: '0.7.4',
            settings: { // See the solidity docs for advice about optimization and evmVersion
                optimizer: {
                    enabled: true,
                    runs: 100,
                },
                // evmVersion: 'byzantium',
            },
        },
    },
    plugins: [
        'truffle-contract-size',
        'truffle-plugin-verify'
    ],
    api_keys: {
        etherscan: process.env.ETHERSCAN_API_ID
    }
};

function getConfigs() {

    const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
    const DEPLOYMENT_ACCOUNT_PK = (process.env.DEPLOYMENT_ACCOUNT_PK || '').replace(
      /^0x/,
      ''
    );
    const GAS_PRICE = process.env.GAS_PRICE || 150000000000; // 150GWei

    if (
      !INFURA_PROJECT_ID ||
      !DEPLOYMENT_ACCOUNT_PK
    ) {
      throw 'Wrong configs';
    }

    return [INFURA_PROJECT_ID, DEPLOYMENT_ACCOUNT_PK, GAS_PRICE];
  }
