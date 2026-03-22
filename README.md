# SangamFi 🔄

> **Rotating Credit, Reimagined**
>
> A decentralized rotating credit protocol on Hedera Hashgraph, transforming the 3000-year-old Indian chit fund system into a trustless, transparent, and composable DeFi primitive.

**No foreman. No fraud. No middlemen.**

SangamFi enables communities to form rotating credit circles where members pool funds monthly, bid blindly for the pot via Hedera Consensus Service, and govern the protocol through on-chain voting. An AI risk agent monitors payment behavior and predicts defaults before they happen — keeping circles safe and sustainable.

🏆 **Built for the Hedera Hello Future Apex Hackathon 2026**

---

## ✨ Features

✅ **Sealed-Bid Auctions**
- Blind bidding via HCS (Hedera Consensus Service)
- Client-side encryption for bid privacy
- Automated fair winner selection (lowest valid bid wins)

✅ **Reputation System**
- On-chain reputation scoring based on payment history
- Cross-circle composability for better credit assessment
- AI risk agent predictions for default prevention

✅ **Community Governance**
- Token-based voting on protocol proposals
- Democratic circle parameter adjustments
- Transparent on-chain decision-making

✅ **Trustless Infrastructure**
- Smart contracts on Hedera testnet/mainnet
- HCS for consensus and message ordering
- No centralized intermediaries

✅ **User-Friendly Interface**
- React + Vite frontend with 3D animations
- Real-time auction countdowns
- Mobile-responsive design

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)              │
│  Landing · Dashboard · Auction · Governance · Profile  │
│         (3D Background, Real-time Updates)              │
└────────────────┬────────────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌─────────┐ ┌──────────┐ ┌──────────────┐
│ ethers  │ │ HashPack │ │ HCS Mirror   │
│  (v6)   │ │  Wallet  │ │     Node     │
└────┬────┘ └──────────┘ └──────┬───────┘
     │                          │
     └──────────────┬───────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
    ┌─────────────────────────────────┐
    │  Hedera Network (Testnet)       │
    │  ├─ Smart Contracts             │
    │  ├─ HCS Topics                  │
    │  └─ Token (HBAR)                │
    └─────────────────────────────────┘
        │
        ▼
    ┌──────────────────┐
    │  Risk Agent (AI) │
    │  (Node.js)       │
    └──────────────────┘
```

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: React 18 + Vite 5
- **Styling**: TailwindCSS 3.4
- **3D Graphics**: Three.js 0.160
- **Routing**: react-router-dom 6.30
- **Wallet**: @hashgraph/hedera-wallet-connect

### **Backend & Smart Contracts**
- **Smart Contracts**: Solidity (Hedera EVM)
- **Hedera**: @hashgraph/sdk 2.81
- **Contract Interaction**: ethers.js 6.16
- **Encryption**: crypto-js 4.2, tweetnacl 1.0

### **Infrastructure**
- **Network**: Hedera Hashgraph (Testnet)
- **Consensus Service**: HCS for sealed bids
- **Mirror Node**: REST API for data queries

---

## 📦 Project Structure

```
CircleFi/
├── contracts/
│   └── CircleFi.sol              # Main smart contract
├── scripts/
│   ├── membership.js             # Circle membership logic
│   ├── auction.js                # Sealed bid auction logic
│   └── reputation.js             # Reputation scoring system
├── agent/
│   └── riskAgent.js              # AI risk prediction agent
├── frontend/
│   ├── src/
│   │   ├── pages/                # 5 page components
│   │   ├── components/           # 6 reusable components
│   │   ├── hooks/                # 3 custom hooks
│   │   ├── utils/                # Utilities & configurations
│   │   ├── App.jsx               # Router setup
│   │   └── index.css             # Tailwind + globals
│   ├── dist/                     # Production build
│   └── package.json
├── .env                          # Configuration
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js 16+ & npm
- HashPack wallet extension
- Hedera testnet account (get one [here](https://portal.hedera.com))

### **1. Clone & Install**
```bash
git clone https://github.com/yourusername/CircleFi.git
cd CircleFi
npm install

# Install frontend dependencies
cd frontend
npm install
```

### **2. Configure Environment**
```bash
# Root directory
cp .env.example .env
# Fill in your Hedera account ID and private key

# Frontend
cd frontend
cp .env.example .env
# Fill in contract address and HCS topic ID
```

### **3. Deploy Smart Contract**
```bash
# From root directory
npm run deploy
# Get your contract address and HCS topic ID
```

### **4. Run Frontend**
```bash
cd frontend
npm run dev
# Opens on http://localhost:5173
```

### **5. Run Risk Agent**
```bash
npm run agent
# Monitors circles and predicts defaults
```

---

## 📖 Usage

### **Create a Circle**
```javascript
// Via smart contract
const tx = await circleContract.createCircle(
  name: "Tech Innovators Circle",
  monthlyContribution: ethers.parseEther("1.5"),
  duration: 12
);
```

### **Submit Encrypted Bid**
```javascript
// Via frontend (client-side encryption)
import { encryptBid } from './utils/encryption';

const encryptedBid = encryptBid(bidAmount, encryptionKey);
await hcs.submitMessage(HCS_TOPIC_ID, encryptedBid);
```

### **Vote on Proposal**
```javascript
// Via frontend
await governanceContract.vote(proposalId, voteYes);
```

---

## 🔐 Security

✅ **No private keys in browser** - HashPack wallet delegation
✅ **Client-side encryption** - Sealed bids encrypted before HCS submission
✅ **Session-only storage** - Sensitive data in sessionStorage only
✅ **Input validation** - All user inputs sanitized before contract calls
✅ **VITE_* env vars** - Frontend environment variables secure by default

---

## 📊 Smart Contract Features

| Function | Purpose |
|----------|---------|
| `createCircle()` | Initialize a new rotating credit circle |
| `contributeToCircle()` | Members deposit monthly contributions |
| `submitBid()` | Sealed bid auction submission (via HCS) |
| `revealBids()` | Execute reveal phase and determine winner |
| `updateReputation()` | AI agent updates member reputation scores |
| `vote()` | Members vote on governance proposals |
| `executeProposal()` | Execute passed proposals |

---

## 🤖 Risk Agent

The AI risk agent monitors:
- Payment history (on-time vs. late)
- Reputation score trends
- Default probability prediction
- Circle health metrics

**Status**: Implemented in `agent/riskAgent.js`

---

## 🧪 Testing

```bash
# Run contract tests
npx hardhat test

# Run frontend tests
cd frontend
npm run test

# Manual testing checklist
- [ ] Connect wallet via HashPack
- [ ] Create a test circle
- [ ] Submit encrypted bid
- [ ] Reveal bid (verify encryption)
- [ ] Vote on proposals
- [ ] Check reputation updates
```

---

## 📈 Roadmap

- [ ] Mainnet deployment
- [ ] Cross-chain composability (via IBC)
- [ ] Advanced credit products
- [ ] DAO governance token
- [ ] Mobile app (React Native)
- [ ] Staking & yield farming

---

## 🔗 Key Endpoints

| Service | URL |
|---------|-----|
| **Hedera Testnet** | https://testnet.hashio.io/api |
| **Mirror Node** | https://testnet.mirrornode.hedera.com/api/v1 |
| **HashPack Wallet** | https://www.hashpack.app |

---

## 📚 Documentation

- **[Frontend Setup](./frontend/FRONTEND_SETUP.md)** - Complete frontend guide
- **[Contract Deployment](./scripts/DEPLOYMENT.md)** - Smart contract deployment
- **[API Reference](./API.md)** - Detailed API documentation

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Code Style**
- Use ESLint for JavaScript/JSX
- Follow Solidity style guide for contracts
- Write tests for new features

---

## ⚖️ License

This project is licensed under the **MIT License** - see [LICENSE](./LICENSE) file for details.

---

## 📞 Contact & Support

- **GitHub Issues**: [Report bugs](https://github.com/yourusername/CircleFi/issues)
- **Email**: support@circlefi.io
- **Discord**: [Join our community](https://discord.gg/circlefi)
- **Twitter**: [@CircleFinance](https://twitter.com/CircleFinance)

---

## 🙏 Acknowledgments

- [Hedera Hashgraph](https://hedera.com) - Infrastructure
- [The Apex Hackathon 2026](https://hedera.com/apex) - Event
- [All contributors](#contributors) - Made this possible

---

## 📝 Citation

If you use SangamFi in your research or project, please cite:

```bibtex
@misc{SangamFi2026,
  title={SangamFi: Decentralized Rotating Credit on Hedera},
  author={SangamFi Team},
  year={2026},
  url={https://github.com/yourusername/CircleFi}
}
```

---

<div align="center">

**Built with ❤️ for community. Powered by Hedera.**

[⭐ Star us on GitHub](https://github.com/yourusername/CircleFi) · [🐛 Report Issues](https://github.com/yourusername/CircleFi/issues) · [💬 Join Discord](https://discord.gg/circlefi)

</div>
