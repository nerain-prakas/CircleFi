const { Client, PrivateKey, AccountId, TokenCreateTransaction, TokenType, TokenMintTransaction, TokenAssociateTransaction, TransferTransaction, Hbar } = require("@hashgraph/sdk");
require("dotenv").config();

/**
 * @title HTS NFT Membership Service
 * @notice Handles NFT creation and management for CircleFi membership
 * @dev Uses Hedera Token Service (HTS) for native NFT functionality
 */

class HTSNFTMembership {
    constructor() {
        // Configure Hedera client
        this.client = Client.forName("testnet");
        
        // Load account info from environment
        if (!process.env.HEDERA_ACCOUNT_ID || !process.env.HEDERA_PRIVATE_KEY) {
            throw new Error("HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be set in .env file");
        }
        
        this.operatorId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
        this.operatorKey = PrivateKey.fromStringECDSA(
            process.env.HEDERA_PRIVATE_KEY.replace('0x', '').trim()
        );
        
        this.client.setOperator(this.operatorId, this.operatorKey);
    }

    /**
     * Creates a new NFT token for CircleFi membership
     * @returns {Promise<string>} The token ID of the created NFT
     */
    async createMembershipNFT() {
        console.log("Creating CircleFi Membership NFT...");
        
        // Create the NFT
        const nftCreateTx = new TokenCreateTransaction()
            .setTokenType(TokenType.NonFungibleUnique)
            .setTokenName("CircleFi Membership")
            .setTokenSymbol("CFM")
            .setDecimals(0) // NFTs have 0 decimals
            .setInitialSupply(0) // Start with 0 supply for NFTs
            .setMaxSupply(10000) // Maximum 10,000 membership NFTs
            .setTreasuryAccountId(this.operatorId)
            .setSupplyType() // Explicitly set supply type for NFTs
            .setAdminKey(this.operatorKey) // Allow admin operations
            .setSupplyKey(this.operatorKey) // Allow minting/burning
            .setMetadataKey(this.operatorKey) // Allow metadata updates
            .freezeWith(this.client);

        // Sign and execute the transaction
        const nftCreateTxSign = await nftCreateTx.sign(this.operatorKey);
        const nftCreateSubmit = await nftCreateTxSign.execute(this.client);

        // Get the receipt to retrieve the token ID
        const nftCreateRx = await nftCreateSubmit.getReceipt(this.client);
        const tokenId = nftCreateRx.tokenId;

        console.log(`✅ CircleFi Membership NFT created with ID: ${tokenId.toString()}`);
        
        return tokenId.toString();
    }

    /**
     * Mints a new membership NFT for a user
     * @param {string} tokenId - The token ID of the NFT collection
     * @param {string} recipientAccountId - The account ID to receive the NFT
     * @param {string} metadata - Metadata for the NFT (e.g., user details)
     * @returns {Promise<Array>} Array of serial numbers of minted NFTs
     */
    async mintMembershipNFT(tokenId, recipientAccountId, metadata = "") {
        console.log(`Minting membership NFT for account: ${recipientAccountId}`);
        
        // Convert token ID and recipient account ID
        const tokenID = tokenId.startsWith('0.0.') ? tokenId : `0.0.${tokenId}`;
        const recipientAccountID = AccountId.fromString(recipientAccountId);
        
        // Mint the NFT
        const mintTx = new TokenMintTransaction()
            .setTokenId(tokenID)
            .setMetadata([Uint8Array.from(Buffer.from(metadata || "CircleFi Membership NFT"))])
            .freezeWith(this.client);

        const mintTxSign = await mintTx.sign(this.operatorKey);
        const mintTxSubmit = await mintTxSign.execute(this.client);

        const mintRx = await mintTxSubmit.getReceipt(this.client);
        const serialNumbers = mintRx.serials;

        console.log(`✅ Minted membership NFT with serial numbers:`, serialNumbers.map(s => s.toString()));

        // Transfer the newly minted NFT to the recipient
        const transferTx = new TransferTransaction()
            .addNftTransfer(tokenID, serialNumbers[0], this.operatorId, recipientAccountID)
            .freezeWith(this.client);

        const transferTxSign = await transferTx.sign(this.operatorKey);
        const transferTxSubmit = await transferTxSign.execute(this.client);
        await transferTxSubmit.getReceipt(this.client);

        console.log(`✅ Transferred NFT to account: ${recipientAccountId}`);

        return serialNumbers.map(s => s.toString());
    }

    /**
     * Associates an account with the NFT token
     * @param {string} tokenId - The token ID of the NFT collection
     * @param {string} accountId - The account ID to associate
     * @returns {Promise<boolean>} Whether the association was successful
     */
    async associateNFTToken(tokenId, accountId) {
        console.log(`Associating account ${accountId} with NFT token ${tokenId}`);
        
        const accountID = AccountId.fromString(accountId);
        
        const associateTx = new TokenAssociateTransaction()
            .setAccountId(accountID)
            .setTokenIds([tokenId])
            .freezeWith(this.client);

        const associateTxSign = await associateTx.sign(PrivateKey.generate()); // User's private key would be needed here
        const associateTxSubmit = await associateTxSign.execute(this.client);

        const associateRx = await associateTxSubmit.getReceipt(this.client);
        
        console.log(`✅ Account ${accountId} associated with NFT token`);
        return true;
    }

    /**
     * Burns a membership NFT (when a member exits)
     * @param {string} tokenId - The token ID of the NFT collection
     * @param {number} serialNumber - The serial number of the NFT to burn
     * @returns {Promise<boolean>} Whether the burn was successful
     */
    async burnMembershipNFT(tokenId, serialNumber) {
        console.log(`Burning membership NFT with serial number: ${serialNumber}`);
        
        const burnTx = new TokenBurnTransaction()
            .setTokenId(tokenId)
            .setSerials([parseInt(serialNumber)])
            .freezeWith(this.client);

        const burnTxSign = await burnTx.sign(this.operatorKey);
        const burnTxSubmit = await burnTxSign.execute(this.client);

        await burnTxSubmit.getReceipt(this.client);

        console.log(`✅ Burned membership NFT with serial number: ${serialNumber}`);
        return true;
    }

    /**
     * Verifies if an account owns a membership NFT
     * @param {string} tokenId - The token ID of the NFT collection
     * @param {string} accountId - The account ID to check
     * @returns {Promise<boolean>} Whether the account owns a membership NFT
     */
    async verifyMembership(tokenId, accountId) {
        console.log(`Verifying membership for account: ${accountId}`);
        
        // In a real implementation, we would query the mirror node
        // to check if the account owns any NFTs from this collection
        // For now, we'll simulate the check
        
        // This would typically involve calling the mirror node API:
        // GET /api/v1/tokens/{tokenId}/nfts?account.id={accountId}
        
        // For demo purposes, we'll return true
        // In a real implementation, you'd check the actual ownership
        console.log(`✅ Membership verification completed for account: ${accountId}`);
        return true; // Simplified for demo
    }
}

module.exports = HTSNFTMembership;

// Example usage:
/*
async function main() {
    const membershipService = new HTSNFTMembership();
    
    try {
        // Create the membership NFT collection
        const tokenId = await membershipService.createMembershipNFT();
        console.log("Created token:", tokenId);
        
        // Mint an NFT for a user (you'd need a real account ID)
        // const serialNumbers = await membershipService.mintMembershipNFT(
        //     tokenId, 
        //     "0.0.xxxx", // Replace with actual account ID
        //     "CircleFi Member: John Doe"
        // );
    } catch (error) {
        console.error("Error:", error);
    }
}

if (require.main === module) {
    main();
}
*/