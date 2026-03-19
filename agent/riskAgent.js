/**
 * @title AI Risk Agent
 * @notice Monitors member payment history and calculates default probability
 * @dev Uses JavaScript-based risk scoring model without external dependencies
 */

class AIRiskAgent {
    constructor() {
        // Initialize risk models and data structures
        this.paymentHistory = new Map(); // Stores payment history per member
        this.riskScores = new Map(); // Stores calculated risk scores per member
        this.collateralRequirements = new Map(); // Dynamic collateral requirements
    }

    /**
     * Adds a payment event to a member's history
     * @param {string} memberAddress - Address of the member
     * @param {number} groupId - ID of the chit group
     * @param {number} amount - Payment amount
     * @param {boolean} onTime - Whether the payment was made on time
     * @param {number} timestamp - Timestamp of the payment
     */
    addPaymentEvent(memberAddress, groupId, amount, onTime, timestamp) {
        if (!this.paymentHistory.has(memberAddress)) {
            this.paymentHistory.set(memberAddress, []);
        }

        const paymentRecord = {
            groupId: groupId,
            amount: amount,
            onTime: onTime,
            timestamp: timestamp
        };

        const history = this.paymentHistory.get(memberAddress);
        history.push(paymentRecord);
        
        // Update risk score based on new payment
        this.calculateRiskScore(memberAddress);
        
        console.log(`✅ Payment event added for ${memberAddress}. History now has ${history.length} records.`);
    }

    /**
     * Calculates the risk score for a member based on their payment history
     * @param {string} memberAddress - Address of the member
     * @returns {number} Risk score (0-100, where 100 is highest risk)
     */
    calculateRiskScore(memberAddress) {
        const history = this.paymentHistory.get(memberAddress);
        
        if (!history || history.length === 0) {
            // New member with no history - assign neutral risk
            this.riskScores.set(memberAddress, 50);
            this.updateCollateralRequirement(memberAddress, 50);
            return 50;
        }

        // Calculate various risk factors
        let latePaymentRatio = 0;
        let averagePaymentAmount = 0;
        let paymentConsistency = 0;
        let recencyFactor = 0;
        
        // Count late payments
        const latePayments = history.filter(record => !record.onTime).length;
        latePaymentRatio = latePayments / history.length;
        
        // Calculate average payment amount
        const totalAmount = history.reduce((sum, record) => sum + record.amount, 0);
        averagePaymentAmount = totalAmount / history.length;
        
        // Calculate payment consistency (how regularly they pay)
        // This is a simplified metric - in a real system, we'd have more sophisticated calculations
        paymentConsistency = 1 - (latePaymentRatio * 0.7); // Late payments heavily penalize consistency
        
        // Calculate recency factor (recent behavior matters more)
        const recentRecords = history.slice(-5); // Last 5 records
        const recentLatePayments = recentRecords.filter(record => !record.onTime).length;
        const recentLateRatio = recentLatePayments / recentRecords.length;
        recencyFactor = recentLateRatio;
        
        // Combine factors into overall risk score
        // Weighted formula: 40% late payment ratio, 20% consistency, 25% recency, 15% other factors
        let rawRiskScore = (
            latePaymentRatio * 40 +
            (1 - paymentConsistency) * 20 +
            recencyFactor * 25
        );
        
        // Normalize to 0-100 scale
        rawRiskScore = Math.min(100, Math.max(0, rawRiskScore));
        
        // Apply additional modifiers based on total payment volume
        if (averagePaymentAmount > 1000000000000000000) { // More than 1 HBAR on average
            rawRiskScore *= 0.9; // Lower risk for high-value consistent payers
        }
        
        // Ensure score is within bounds
        const riskScore = Math.round(Math.min(100, Math.max(0, rawRiskScore)));
        
        this.riskScores.set(memberAddress, riskScore);
        this.updateCollateralRequirement(memberAddress, riskScore);
        
        console.log(`📊 Risk score calculated for ${memberAddress}: ${riskScore}/100`);
        return riskScore;
    }

    /**
     * Updates the required collateral based on risk score
     * @param {string} memberAddress - Address of the member
     * @param {number} riskScore - Current risk score (0-100)
     */
    updateCollateralRequirement(memberAddress, riskScore) {
        // Higher risk = higher collateral requirement
        // Risk score of 0 = 10% collateral, Risk score of 100 = 100% collateral
        const collateralPercentage = 10 + (riskScore * 0.9); // 10% to 100%
        this.collateralRequirements.set(memberAddress, collateralPercentage);
        
        console.log(`🔒 Collateral requirement for ${memberAddress}: ${collateralPercentage}%`);
    }

    /**
     * Gets the risk score for a member
     * @param {string} memberAddress - Address of the member
     * @returns {number} Risk score (0-100)
     */
    getRiskScore(memberAddress) {
        return this.riskScores.get(memberAddress) || 50; // Default to 50 for unknown members
    }

    /**
     * Gets the collateral requirement for a member
     * @param {string} memberAddress - Address of the member
     * @returns {number} Collateral percentage (0-100)
     */
    getCollateralRequirement(memberAddress) {
        return this.collateralRequirements.get(memberAddress) || 10; // Default to 10%
    }

    /**
     * Checks if a member is flagged as high risk
     * @param {string} memberAddress - Address of the member
     * @param {number} threshold - Risk threshold (default 75)
     * @returns {boolean} Whether the member is high risk
     */
    isHighRisk(memberAddress, threshold = 75) {
        const riskScore = this.getRiskScore(memberAddress);
        return riskScore >= threshold;
    }

    /**
     * Gets payment history for a member
     * @param {string} memberAddress - Address of the member
     * @returns {Array} Array of payment records
     */
    getPaymentHistory(memberAddress) {
        return this.paymentHistory.get(memberAddress) || [];
    }

    /**
     * Generates a risk assessment report for a member
     * @param {string} memberAddress - Address of the member
     * @returns {Object} Risk assessment report
     */
    generateRiskReport(memberAddress) {
        const history = this.getPaymentHistory(memberAddress);
        const riskScore = this.getRiskScore(memberAddress);
        const collateralReq = this.getCollateralRequirement(memberAddress);
        
        if (history.length === 0) {
            return {
                memberAddress: memberAddress,
                riskScore: riskScore,
                collateralRequirement: collateralReq,
                status: "New Member",
                summary: "No payment history available for risk assessment.",
                recommendations: ["Monitor initial payments closely"]
            };
        }
        
        const totalPayments = history.length;
        const onTimePayments = history.filter(record => record.onTime).length;
        const latePayments = totalPayments - onTimePayments;
        const onTimeRate = (onTimePayments / totalPayments) * 100;
        
        const totalAmount = history.reduce((sum, record) => sum + record.amount, 0);
        const avgPayment = totalAmount / totalPayments;
        
        let status = "Low Risk";
        if (riskScore >= 75) status = "High Risk";
        else if (riskScore >= 50) status = "Medium Risk";
        
        let recommendations = [];
        if (latePayments > 0) {
            recommendations.push(`Address ${latePayments} late payment${latePayments !== 1 ? 's' : ''}`);
        }
        if (onTimeRate < 80) {
            recommendations.push(`Improve on-time payment rate (currently ${Math.round(onTimeRate)}%)`);
        }
        if (riskScore >= 75) {
            recommendations.push(`Require additional collateral (${collateralReq}%)`);
        }
        
        return {
            memberAddress: memberAddress,
            riskScore: riskScore,
            collateralRequirement: collateralReq,
            status: status,
            totalPayments: totalPayments,
            onTimePayments: onTimePayments,
            latePayments: latePayments,
            onTimeRate: Math.round(onTimeRate),
            totalAmount: totalAmount,
            avgPayment: avgPayment,
            summary: `Member has ${totalPayments} payment${totalPayments !== 1 ? 's' : ''} with ${Math.round(onTimeRate)}% on-time rate.`,
            recommendations: recommendations
        };
    }
}

module.exports = AIRiskAgent;

// Example usage:
/*
async function main() {
    const riskAgent = new AIRiskAgent();
    
    // Simulate adding payment events for a member
    riskAgent.addPaymentEvent("0.0.12345", 1, 1000000000000000000, true, Date.now() - 86400000); // 1 day ago
    riskAgent.addPaymentEvent("0.0.12345", 1, 1000000000000000000, true, Date.now() - 172800000); // 2 days ago
    riskAgent.addPaymentEvent("0.0.12345", 1, 1000000000000000000, false, Date.now() - 259200000); // 3 days ago (late)
    
    // Get risk assessment
    const report = riskAgent.generateRiskReport("0.0.12345");
    console.log("Risk Report:", JSON.stringify(report, null, 2));
}

if (require.main === module) {
    main();
}
*/