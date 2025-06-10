# Ovipets Bot - Complete Setup Guide
# USE THE RELEASES TAB JUST DOWNLOAD FROM RELEASES THE REPO IS MISSING THE AI MODEL BUT RELEASES HAS IT AS WELL AS THE TRAINING DATA.
This is a comprehensive automation bot for the Ovipets virtual pet game. It can automatically turn eggs, send friend requests, breed pets, and much more using AI-powered puzzle solving.


## Special thanks to the members of the bryguy4 credit giveaways group for making this possible:
- vulpine
- moonkit
- ink
- nightshade

you guys were chill
## 🎯 What This Bot Does

- **Main Bot**: Automatically turns eggs using AI to solve species identification puzzles
- **Befriender**: Sends friend requests to other players
- **Adopter**: Adopts available pets automatically
- **Breeder**: Breeds your pets automatically
- **Feeder**: Feeds your pets
- **Namer**: Names your pets automatically
- **Genetic Profiler**: Analyzes pet genetics and saves data
- **Hatcher**: Hatches eggs automatically
- **Bidder**: Places bids on auctions

## 🔧 Complete Setup Instructions

### Step 1: Install Required Software

#### A. Install Google Chrome Browser
1. Go to [https://www.google.com/chrome/](https://www.google.com/chrome/)
2. Click "Download Chrome"
3. Run the installer and follow the prompts
4. Open Chrome when installation is complete

#### B. Install Tampermonkey Extension
1. In Chrome, go to [https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
2. Click "Add to Chrome"
3. Click "Add extension" when prompted
4. You should see a Tampermonkey icon appear in your browser toolbar

#### C. Install Anaconda (Python Environment)
1. Go to [https://www.anaconda.com/products/distribution](https://www.anaconda.com/products/distribution)
2. Click "Download" for your operating system (Windows/Mac/Linux)
3. Run the installer and follow all prompts
4. **Important**: When asked about adding to PATH, choose "Yes" or "Add to PATH"
5. Restart your computer after installation

### Step 2: Download and Setup the Bot Files

#### A. Download the Project
1. Go to the project folder location
2. Download all files to a folder on your computer (e.g., `C:\ovipets-bot\`)
3. Make sure you have these files:
   - `new_tampermonkey_script.js`
   - `egg_api.py`
   - `inference_api.py`
   - `environment.yml`
   - `run.bat`
   - `models` folder (with AI model files)

#### B. Setup Python Environment
1. Open Command Prompt (Windows) or Terminal (Mac/Linux):
   - **Windows**: Press `Windows key + R`, type `cmd`, press Enter
   - **Mac**: Press `Cmd + Space`, type `Terminal`, press Enter
   - **Linux**: Press `Ctrl + Alt + T`

2. Navigate to your project folder:
   ```bash
   cd C:\ovipets-bot
   ```
   (Replace with your actual folder path)

3. Create the Python environment:
   ```bash
   conda env create -f environment.yml
   ```
   This will take several minutes to download and install everything.

4. Activate the environment:
   ```bash
   conda activate ovipetsbot
   ```

### Step 3: Install the Tampermonkey Script

#### A. Add the Script to Tampermonkey
1. Click the Tampermonkey icon in your Chrome toolbar
2. Click "Dashboard"
3. Click the "+" tab to create a new script
4. Delete all the existing code in the editor
5. Open the `new_tampermonkey_script.js` file with Notepad
6. Copy ALL the code (Ctrl+A, then Ctrl+C)
7. Paste it into the Tampermonkey editor (Ctrl+V)
8. Press `Ctrl+S` to save
9. The script should now be active

#### B. Verify Installation
1. Go to [https://ovipets.com](https://ovipets.com)
2. Log into your account
3. You should see a bot control panel in the bottom-left corner
4. If you don't see it, refresh the page

### Step 4: Start the AI Server

#### A. Start the Python Server
1. Open Command Prompt/Terminal again
2. Navigate to your project folder:
   ```bash
   cd C:\ovipets-bot
   ```
3. Activate the environment:
   ```bash
   conda activate ovipetsbot
   ```
4. Start the server:
   ```bash
   python egg_api.py
   ```
5. You should see messages like:
   ```
   Loading model...
   Model loaded successfully
   Starting server on http://127.0.0.1:8000
   ```
6. **Keep this window open** - the bot needs this server running!

#### B. Alternative: Use the Batch File (Windows Only)
1. Double-click `run.bat` in your project folder
2. This will automatically start the server
3. Keep the window open

### Step 5: Using the Bot

#### A. Basic Setup
1. Go to [https://ovipets.com](https://ovipets.com) and log in
2. You should see the bot control panel in the bottom-left
3. The panel shows:
   - **Status indicator**: Red dot = stopped, Green dot = running
   - **Queue visualizer**: Shows how many eggs are queued
   - **Evil Mode toggle**: Changes which pet types to turn
   - **Peaceful Mode**: Gentler operation mode

#### B. Using the Main Bot (Automatic Egg Turning)
1. **Normal Mode**: Click "▶️ START" 
   - Only turns "Turn Egg" class pets (safe mode)
   
2. **Evil Mode**: 
   - Toggle "Evil Mode" switch to red
   - Click "▶️ START" 
   - Turns ALL pet types (Canis, Draconis, Equus, etc.)

3. **The bot will automatically**:
   - Find eggs from your friends
   - Navigate to each egg
   - Solve species identification puzzles using AI
   - Turn the eggs
   - Handle rate limiting by refreshing when needed

#### C. Using Other Bot Modules

**Befriender** (Send Friend Requests):
1. Go to any page with user avatars
2. Click "Befriender" → "▶️ Start"
3. Hover over different lists of users
4. Click the list you want to befriend
5. Bot will send friend requests to all users in that list

**Adopter** (Adopt Pets):
1. Go to a page with adoptable pets
2. Click "Adopter" → "▶️ Start"
3. Select the list of pets to adopt
4. Bot will adopt each pet automatically

**Breeder** (Breed Pets):
1. Go to your pets page
2. Click "Breeder" → "▶️ Start"
3. Select the list of pets to breed
4. Bot will breed each pet with available partners

**Feeder** (Feed Pets):
1. Go to your pets page
2. Click "Feeder" → "▶️ Start"
3. Select the list of pets to feed
4. Bot will feed each pet

**Namer** (Name Pets):
1. Go to your pets page
2. Click "Namer" → "▶️ Start"
3. Select the list of pets to name
4. Bot will give each pet a random name

### Step 6: Monitoring and Control

#### A. Bot Status
- **Red dot**: Bot is stopped
- **Green dot**: Bot is running
- **Queue counter**: Shows how many eggs are queued for turning
- **Progress bar**: Shows collection progress

#### B. Safety Features
- **Peaceful Mode**: Only processes your own pets (safer)
- **Evil Mode**: Processes all species types (faster but riskier)
- **Auto-refresh**: Handles rate limiting automatically
- **Error recovery**: Restarts collection if errors occur

#### C. Stopping the Bot
1. Click "⏹️ STOP" to stop any running bot
2. The status dot will turn red
3. All processing will halt

### Step 7: Troubleshooting

#### Common Issues:

**Bot panel doesn't appear**:
- Refresh the page
- Check that Tampermonkey script is enabled
- Make sure you're logged into Ovipets

**"Connection failed" errors**:
- Make sure the Python server is running
- Check that you see "Starting server on http://127.0.0.1:8000" in the terminal
- Try restarting the server

**AI predictions are wrong**:
- The AI has ~95% accuracy but isn't perfect
- Wrong predictions will be handled by the retry system
- If problems persist, check model files are in the `models` folder

**Bot gets stuck**:
- Click "⏹️ STOP" and then "▶️ START" to restart
- Check browser console (F12) for error messages
- Restart the Python server if needed

**Python environment issues**:
- Make sure Anaconda is installed correctly
- Try recreating the environment:
  ```bash
  conda env remove -n ovipetsbot
  conda env create -f environment.yml
  ```

#### Getting Help:
1. Check the browser console (press F12, click Console tab)
2. Look for error messages in red
3. Check the Python server window for error messages
4. Make sure all files are in the correct locations

### Step 8: Advanced Usage

#### A. Customizing Bot Behavior
- **Evil Mode**: Turn on for faster processing of all species
- **Peaceful Mode**: Turn on for safer operation (own pets only)
- **Batch Processing**: Bot can handle hundreds of eggs automatically

#### B. Multiple Modules
- You can run different modules simultaneously
- Each module has its own start/stop controls
- Use tabs to organize different bot functions

#### C. Performance Tips
- Keep the Python server running for best performance
- Use Evil Mode for maximum speed (but higher risk)
- Monitor the queue to see processing progress
- Close unnecessary browser tabs for better performance

## 🔒 Safety and Ethics

- **Use responsibly**: Don't overload the Ovipets servers
- **Respect rate limits**: The bot includes built-in delays
- **Monitor usage**: Keep an eye on the bot's activities
- **Follow game rules**: Make sure automation is allowed in your game's terms of service

## 📋 File Structure

```
ovipets-bot/
├── new_tampermonkey_script.js  # Main browser script
├── egg_api.py                  # Python AI server
├── inference_api.py            # Alternative AI server
├── environment.yml             # Python dependencies
├── run.bat                     # Windows startup script
├── models/                     # AI model files
│   └── v2_best_advanced.pth   # Trained model
├── train.py                    # Model training script
├── test.py                     # Model testing script
└── README.md                   # This file
```

## 🚀 Quick Start Summary

1. **Install Chrome + Tampermonkey**
2. **Install Anaconda Python**
3. **Download all project files**
4. **Create Python environment**: `conda env create -f environment.yml`
5. **Install Tampermonkey script**
6. **Start Python server**: `python egg_api.py`
7. **Go to Ovipets and start the bot**

That's it! The bot should now be working automatically. Keep the Python server running and monitor the bot panel for status updates.
