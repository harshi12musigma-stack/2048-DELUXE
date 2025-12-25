# 🎮 2048 DELUXE - The Ultimate Edition

A feature-rich, single-player 2048 game built with vanilla JavaScript. No dependencies, no backend, just pure browser-based fun! Clone, play, and customize.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Status](https://img.shields.io/badge/status-complete-success)
![License](https://img.shields.io/badge/license-MIT-green)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-yellow)

---

## 🌟 Features Overview

### ✨ Core Gameplay
- **Multiple Grid Sizes**: 4×4 Classic and 5×5 Extended modes
- **Intuitive Controls**: Arrow keys for desktop, swipe for mobile
- **Smooth Animations**: Professional-grade tile transitions
- **Smart Saving**: Auto-save with LocalStorage

### ⚡ 6 Powerful Powerups
🔄 **Swap** • 🔒 **Lock** • ↶ **Undo** • 🔀 **Shuffle** • 🗑️ **Remove** • ✨ **Double**

### 🎨 4 Beautiful Themes
🌟 **Default** • 🌆 **Cyberpunk** • 🌊 **Vaporwave** • 💚 **Matrix**

### 🏆 Achievement System
8 unique achievements with **real-time progress tracking**

### 🎵 Audio & Effects
- Procedural Web Audio API sounds
- Dynamic particle system
- Confetti celebrations
- Screen shake on big merges

---

## 📂 Project Structure

```
2048-DELUXE/
├── index.html              # Main game file
├── game.js                 # Game logic (3,275 lines)
├── style.css               # Styling & animations (1,800+ lines)
├── easter-eggs.css         # Special effects
├── README.md               # This file
├── GAMEBOOK.md             # Complete gameplay guide
├── PROJECT_STATUS.md       # Development status
└── FUTURE_ENHANCEMENTS.md  # Planned features
```

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/2048-DELUXE.git
cd 2048-DELUXE

# Option 1: Open directly in browser
# Just double-click index.html

# Option 2: Use local server (recommended)
python3 -m http.server 8000
# Then open http://localhost:8000
```

### Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- **No dependencies!** Pure vanilla JS

---

## 🎮 How to Play

### Controls
- **Arrow Keys** (↑ ↓ ← →) - Desktop
- **Swipe Gestures** - Mobile/tablet  
- **Mouse Clicks** - Powerup activation

### Rules
1. Slide tiles - all move together
2. Matching numbers merge
3. Each merge adds to score
4. Reach 2048 to win (but keep going!)
5. Game ends when no moves possible

**📖 For detailed gameplay guide, see [GAMEBOOK.md](GAMEBOOK.md)**

---

## 🔮 Hidden Secrets

### 🎮 Konami Code
Press `↑↑↓↓←→←→BA` for 30 free powerups!

### 🌈 Rainbow Mode
Type "rainbow" during gameplay for disco tiles!

### 💫 Mega Tiles
Reach 16384+ to see abbreviated numbers (16k, 32k, 1M, etc.)

**Find all 3 secrets to unlock the Secret Hunter achievement!**

---

## 🏆 All 8 Achievements

- ⚡ **Speed Demon** - Reach 2048 in <150 moves
- 🎯 **Minimalist** - Reach 2048 using ≤5 powerups
- 🚫 **No Undo** - Reach 2048 without undo
- 🔒 **Lock Master** - Use lock 10 times (lifetime)
- 🔄 **Swap Expert** - Use swap 25 times (lifetime)
- 💰 **Hoarder** - Have 5+ of every powerup simultaneously
- 💎 **Perfect Game** - Reach 4096 without using remove
- 🔍 **Secret Hunter** - Discover all 3 easter eggs

*Track progress in real-time with the achievement modal!*

---

## 💻 Technical Details

### Tech Stack
- **HTML5** - Semantic structure
- **CSS3** - Grid, Flexbox, Animations
- **Vanilla JavaScript** - ES6+ features
- **Canvas API** - Particle effects
- **Web Audio API** - Dynamic sounds
- **LocalStorage** - Data persistence

### Browser Support
✅ Chrome 90+ • Firefox 88+ • Safari 14+ • Edge 90+ • Mobile browsers

### Performance
- 60 FPS smooth animations
- Minimal memory footprint
- Works offline (no network requests)
- Responsive on low-end devices

---

## 🤝 Contributing

Want to add features or fix bugs?

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

**💡 See [FUTURE_ENHANCEMENTS.md](FUTURE_ENHANCEMENTS.md) for ideas!**

### Guidelines
- Keep it vanilla JS (no frameworks/libraries)
- Maintain mobile responsiveness
- Test on multiple browsers
- Update GAMEBOOK.md for new features

---

## 🐛 Found a Bug?

Open an issue with:
- Browser & OS version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

---

## 📜 License

MIT License - Feel free to use, modify, and distribute!

Original 2048 by Gabriele Cirulli (2014)

---

## 🎯 Quick Links

- **[GAMEBOOK.md](GAMEBOOK.md)** - Complete guide with all secrets
- **[PROJECT_STATUS.md](PROJECT_STATUS.md)** - Development progress
- **[FUTURE_ENHANCEMENTS.md](FUTURE_ENHANCEMENTS.md)** - Upcoming features

---

**Ready to play? Open `index.html` and start merging!** 🎮✨

---

*Made with ❤️ and vanilla JavaScript*
