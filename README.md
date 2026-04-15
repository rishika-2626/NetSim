# 🌐 NetSim — Interactive Network Router Simulator

An advanced Computer Networks simulation tool that visualizes how routing algorithms work in real time.
Built with a modern UI and smooth animations, NetSim allows users to design network topologies, simulate routing protocols, and observe packet transmission interactively.

[Click here for preview](https://netsim-gbm7.onrender.com)
---

## 🚀 Features

### 🧩 Network Design
- ➕ Dynamically add routers (nodes)
- 🔗 Create custom links between routers
- ⚖️ Assign user-defined weights (costs) to edges
- ❌ Delete routers and connections easily
- 🔄 Reset topology anytime

### 📡 Routing Algorithms
- 📍 Distance Vector Routing (Bellman-Ford)
- 📍 Link State Routing (Dijkstra)
- 🔁 Step-by-step execution (conceptual simulation)
- ⚡ Full convergence simulation
- 🔄 Real-time updates on topology changes

### 📊 Routing Tables
- 📋 Automatic routing table generation for each router
- 🔍 Displays:
  - Destination
  - Cost
  - Next Hop
- 🔄 Updates instantly when network changes
- 🎯 Highlight routes involved in current path

### 🧭 Path Simulation
- 🎯 Select source and destination routers
- 🚀 Compute shortest path
- 📦 Simulate packet transmission
- 📈 Display:
  - Total cost
  - Number of hops
  - Route taken
- ✨ Animated packet traversal

### 🎨 UI & Visualization
- 🎯 Interactive graph-based topology
- 🔵 Circular layout for clarity
- 🎨 Color-coded routers
- 🏷️ Edge weight labels
- 💡 Clean, modern UI design
- ⚡ Smooth animations and transitions

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React |
| Styling | CSS Modules |
| Visualization | Custom Canvas Rendering |
| Algorithms | Dijkstra (Link State), Bellman-Ford (Distance Vector) |

---

## 📂 Project Structure

```
/components
  ├── TopBar.js          # Control panel for modes and resets
  ├── NetworkCanvas.js   # Main interactive graph area
  ├── BottomBar.js       # Routing table and simulation info
  ├── WeightPopup.js     # Modal for assigning link costs
  ├── Toast.js           # Notifications and alerts

/lib
  ├── routing.js         # Dijkstra and Bellman-Ford implementations
  ├── defaultTopology.js # Pre-configured network state

/pages
  ├── index.js           # Main application entry point

/styles
  ├── Home.module.css    # Global and component-specific styles

```
---

## ⚙️ How It Works

### 🔹 Routing Logic

**Dijkstra Algorithm**
- Computes shortest paths from a source node
- Used in Link State Routing

**Bellman-Ford Algorithm**
- Iteratively relaxes edges
- Used in Distance Vector Routing

### 🔹 Simulation Flow
1. User creates network topology
2. Selects source & destination
3. Algorithm computes shortest path
4. Path is highlighted visually
5. Packet animation runs along path
6. Routing tables update in real-time

---

## 🧪 How to Run Locally

```bash
# Clone repository
git clone https://github.com/your-username/netsim.git

# Navigate to project
cd netsim

# Install dependencies
npm install

# Run development server
npm run dev
```

Then open: [http://localhost:3000](http://localhost:3000)

---

## 🎮 Usage Guide

| Action | How To |
|---|---|
| ➕ Add Router | Click anywhere on canvas |
| 🔗 Add Connection | Switch to "Add Edge" mode → Click source → destination |
| ⚖️ Change Weight | Click on edge label |
| ❌ Delete | Switch to delete mode → Click node or edge |
| 🚀 Simulate Path | Select source & destination → Click Simulate |
| 📋 View Routing Table | Select router from bottom panel |

---

## ✨ Highlights

- Real-time algorithm visualization
- Fully interactive topology editing
- Smooth packet animation
- Clean and intuitive UI
- Educational + practical learning tool

---

## 🎯 Future Enhancements

- 📡 Support for additional protocols (OSPF, RIP)
- 💾 Save/load network topologies
- 🌍 Large-scale network simulation
- 📊 Performance metrics visualization

---

## 👩‍💻 Authors

- Rishika Thatipamula
- Sisira Asapu
- Sri Vaishnavi
- Vennapureddy Mahathi


