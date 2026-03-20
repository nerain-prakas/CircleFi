require('dotenv').config();
const {ethers} = require('ethers');
const key = process.env.HEDERA_PRIVATE_KEY;
const keyWithPrefix = key.startsWith('0x') ? key : '0x' + key;
const wallet = new ethers.Wallet(keyWithPrefix);
console.log('Deployer EVM address:', wallet.address);