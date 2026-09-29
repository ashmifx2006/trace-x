# TRACE-X: Follow the Money. Reveal the Network. 🔍

> **Coordinated transaction-network analysis for detecting suspicious financial patterns using transactional and temporal behavior.**

TRACE-X is a full-stack intelligence platform built for **Byteathon BYT01**. It reconstructs transaction networks from synthetic financial data, identifies suspicious behavioral patterns, generates explainable risk scores, and provides an interactive workspace for investigating detected networks.

⚠️ **All transaction data is synthetic and intended for demonstration/research purposes only. TRACE-X does not determine whether real-world financial activity constitutes money laundering or other criminal activity.**

---

## 🚀 What TRACE-X Does

TRACE-X analyzes transaction flows as interconnected networks rather than treating individual transactions in isolation.

It can:

- 🔗 Reconstruct connected transaction networks
- ⏱️ Analyze temporal transaction relationships
- 🔍 Detect suspicious behavioral patterns
- 🧠 Generate explainable risk scores
- 🧬 Create behavioral "Network DNA" fingerprints
- 📊 Explore transactions and accounts interactively
- 🔄 Replay money trails through a network
- 🚨 Manage suspicious-activity alerts
- 📁 Create investigation cases
- 📝 Add notes and evidence to cases
- 📄 Generate PDF investigation dossiers
- 📤 Upload CSV transaction data and rerun the analysis pipeline

---

## ✨ Key Detection Patterns

TRACE-X looks for multiple behavioral patterns, including:

| Pattern | Description |
|---|---|
| 🔄 Circular Flow | Transactions forming cycles within a network |
| ⚡ Rapid Pass-through | Funds moving quickly through multiple accounts |
| ⛓️ Mule Chain | Sequential movement through intermediary accounts |
| 💠 Smurfing | Aggregated fan-in/fan-out transaction behavior |
| 🚀 High Velocity | Unusually frequent transaction activity |
| 🔁 Repeated Behavior | Recurring transaction relationships |
| 📈 Amount Anomaly | Unusual transaction amounts |

Multiple patterns can contribute to a network's overall risk score.

---

## 🧠 How It Works

### 1. Temporal Flow Linking

Transactions are connected when a downstream transaction occurs within **30 minutes** and retains approximately **60–100% of the original amount**.

```text
Account A
    │
    │ $10,000
    ▼
Account B
    │
    │ $8,500
    ▼
Account C
