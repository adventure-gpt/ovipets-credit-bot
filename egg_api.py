import signal
import sys
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import torch
from torchvision import transforms
import timm
import uvicorn
import time
import requests
import re
import json
from concurrent.futures import ThreadPoolExecutor
import concurrent
import threading
from typing import Dict, List

# --- Config ---
MODEL_PATH = "models/v2_best_advanced.pth"
ARCH = "efficientnetv2_s"
CLASS_NAMES = [
    "Canis", "Draconis", "Equus", "Feline",
    "Gekko", "Lupus", "Mantis", "Raptor",
    "Slime", "Vulpes"
]

# --- App & CORS ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# --- Device ---
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# --- Model Loading ---
model = timm.create_model(ARCH, pretrained=False, num_classes=len(CLASS_NAMES))
checkpoint = torch.load(MODEL_PATH, map_location=device)
state_dict = checkpoint.get("model_state", checkpoint)
model.load_state_dict(state_dict, strict=False)
model.to(device).eval()

# --- Preprocessing ---
preprocess = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

# --- Global egg collection state ---
class EggCollector:
    def __init__(self):
        self.is_running = False
        self.collected_eggs = []
        self.worker_thread = None
        self.usr_id = None
        self.shutdown_requested = False
        self.eggs_lock = threading.Lock()  # Thread-safe access to eggs list
        self.progress_lock = threading.Lock()  # Thread-safe access to progress
        self.friends_completed = 0
        self.friends_total = 0
        
    def start_collection(self, usr_id: int, peaceful_mode: bool = False) -> Dict[str, str]:
        if self.is_running:
            return {"status": "already_running"}
            
        self.usr_id = usr_id
        self.is_running = True
        
        # Clear previous eggs and reset progress in thread-safe way
        with self.eggs_lock:
            self.collected_eggs = []
        
        with self.progress_lock:
            self.friends_completed = 0
            self.friends_total = 0
        
        self.shutdown_requested = False
        
        def collect_worker():
            try:
                print(f"[Collector] Starting collection for user {usr_id}")
                worker = Worker(usr_id)
                friend_ids = worker.get_friend_ids() if not peaceful_mode else [usr_id]

                # Set total friends count
                with self.progress_lock:
                    self.friends_total = len(friend_ids)
                
                print(f"[Collector] Processing {len(friend_ids)} friends")
                
                with ThreadPoolExecutor(max_workers=10) as executor:
                    futures = [executor.submit(self.process_friend, friend_id) for friend_id in friend_ids]
                    
                    for i, future in enumerate(futures):
                        if not self.is_running or self.shutdown_requested:
                            print("[Collector] Stop requested, cancelling remaining tasks")
                            executor.shutdown(wait=False)
                            break
                        try:
                            # 5 minute timeout per friend
                            future.result(timeout=300)  # 300 seconds = 5 minutes
                            # DON'T increment progress here - it's done in process_friend
                            print(f"[Collector] Future completed for friend {i+1}/{len(friend_ids)}")
                        except concurrent.futures.TimeoutError:
                            print(f"[Collector] Timeout (5 min) processing friend {i+1}/{len(friend_ids)} - skipping")
                            # DON'T increment progress here - it's done in process_friend
                            continue
                        except Exception as e:
                            print(f"[Collector] Error in friend processing {i+1}/{len(friend_ids)}: {e}")
                            # DON'T increment progress here - it's done in process_friend
                            continue
        
                with self.eggs_lock:
                    total_eggs = len(self.collected_eggs)
                print(f"[Collector] Collection complete! Found {total_eggs} turnable eggs")
                
            except Exception as e:
                print(f"[Collector] Collection error: {e}")
                import traceback
                traceback.print_exc()
            finally:
                self.is_running = False
                print("[Collector] Worker thread finished")
                
        self.worker_thread = threading.Thread(target=collect_worker, daemon=True)
        self.worker_thread.start()
        
        return {"status": "started", "usr_id": usr_id}
    
    def add_egg(self, egg_data):
        """Thread-safe method to add eggs as they're found"""
        with self.eggs_lock:
            self.collected_eggs.append(egg_data)
            print(f"[Collector] Added turnable egg {egg_data['egg_id']} from friend {egg_data['usr_id']} (Total: {len(self.collected_eggs)})")
    
    def process_friend(self, friend_id):
        try:
            if not self.is_running or self.shutdown_requested:
                return
                
            print(f"[Collector] Processing friend {friend_id}")
            
            # Get friend's eggs
            hatchery_url = f"https://ovipets.com/?src=pets&sub=hatchery&usr={friend_id}&?&!=jQuery360008353732626982191_{int(time.time())}&_={int(time.time())}"
            req = requests.get(hatchery_url, timeout=30)
            
            if req.status_code == 200:
                raw_text = req.text
                raw_text = raw_text[raw_text.index('(') + 1: -1]
                raw_text = json.loads(raw_text)
                raw_text = raw_text['output']
                
                # Extract egg IDs
                matches = re.findall(r"<input type = 'checkbox' name = 'PetID\[\]' value = '(\d+)' style = 'display: none;' />", raw_text)
                # check for the CLASS_NAMES in the raw_text, if theres a single instance of all of them in the raw_text, print to console this amazing news
                do_all_match = True
                for class_name in CLASS_NAMES:
                    if class_name not in raw_text:
                        do_all_match = False
                        break
                if do_all_match:
                    print(f"\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n[Collector] Friend {friend_id} has all class names present!")
                print(f"[Collector] Friend {friend_id} has {len(matches)} eggs")
                
                # Check each egg for turnability
                turnable_count = 0
                for i, egg_id in enumerate(matches):
                    if not self.is_running or self.shutdown_requested:
                        break
                    
                    # Progress update every 25 eggs
                    if i > 0 and i % 25 == 0:
                        print(f"[Collector] Friend {friend_id}: Checked {i}/{len(matches)} eggs, found {turnable_count} turnable")
                        
                    if self.check_egg_turnable(egg_id, friend_id):
                        egg_data = {
                            "egg_id": int(egg_id),
                            "usr_id": friend_id,
                            "page_url": f"https://ovipets.com/#!/?src=pets&sub=profile&usr={friend_id}&pet={egg_id}",
                            "collected": False
                        }
                        # Add egg immediately when found (thread-safe)
                        self.add_egg(egg_data)
                        turnable_count += 1
            
                print(f"[Collector] Friend {friend_id} complete: {turnable_count} turnable eggs found")
            else:
                print(f"[Collector] Failed to fetch hatchery for friend {friend_id}: HTTP {req.status_code}")
                    
        except requests.exceptions.Timeout:
            print(f"[Collector] Timeout fetching hatchery for friend {friend_id}")
        except Exception as e:
            print(f"[Collector] Error processing friend {friend_id}: {e}")
        finally:
            # Always increment progress when friend processing is done (success, error, or timeout)
            with self.progress_lock:
                self.friends_completed += 1
            print(f"[Collector] Friend {friend_id} finished - Progress: {self.friends_completed}/{self.friends_total}")

    def check_egg_turnable(self, egg_id, usr_id):
        try:
            if not self.is_running or self.shutdown_requested:
                return False
                
            egg_url = f"https://ovipets.com/?src=pets&sub=profile&usr={usr_id}&pet={egg_id}&?&!=jQuery3600780651591859677_{int(time.time())}&_={int(time.time()) + 1}"
            req = requests.get(egg_url, timeout=10)  # Slightly longer timeout for individual eggs
            
            if req.status_code == 200:
                raw_text = req.text
                raw_text = raw_text[raw_text.index('(') + 1: -1]
                raw_text = json.loads(raw_text)
                raw_text = raw_text['output']
                
                match = re.search(r'<ui:progressbar value = "(\d+)" title = "Hatching: \d+%" class = "hatching" />', raw_text)
                if match:
                    return ((int(match.group(1)) % 25 == 0) and (int(match.group(1)) != 100))
                    
        except requests.exceptions.Timeout:
            # Silently ignore timeouts for individual eggs
            pass
        except Exception as e:
            print(f"[Collector] Error checking egg {egg_id}: {e}")
            
        return False
    
    def stop_collection(self):
        print("[Collector] Stop collection requested")
        self.is_running = False
        self.shutdown_requested = True
        return {"status": "stopped"}
    
    def shutdown(self):
        """Graceful shutdown for Ctrl+C"""
        print("[Collector] Shutdown requested")
        self.is_running = False
        self.shutdown_requested = True
        
        if self.worker_thread and self.worker_thread.is_alive():
            print("[Collector] Waiting for worker thread to finish...")
            self.worker_thread.join(timeout=5)
            if self.worker_thread.is_alive():
                print("[Collector] Worker thread did not finish in time")
    
    def get_eggs(self):
        # Thread-safe access to eggs
        with self.eggs_lock:
            # Return uncollected eggs and mark them as collected
            uncollected = [egg for egg in self.collected_eggs if not egg["collected"]]
            
            # Mark them as collected
            for egg in uncollected:
                egg["collected"] = True
                
            return {
                "status": "running" if self.is_running else "idle",
                "total_found": len(self.collected_eggs),
                "eggs": uncollected
            }
    
    def get_progress(self):
        """Get current friend processing progress"""
        with self.progress_lock:
            result = {
                "friends_completed": self.friends_completed,
                "friends_total": self.friends_total,
                "is_running": self.is_running
            }
            print(f"[Collector] Progress: {result}")
            return result

# Global collector instance
collector = EggCollector()

# Signal handler for graceful shutdown
def signal_handler(sig, frame):
    print('\n[Server] Received interrupt signal, shutting down gracefully...')
    collector.shutdown()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# --- Worker class for friend fetching ---
class Worker:
    def __init__(self, usr_id):
        self.usr_id = usr_id
        self.friends_url = f"https://ovipets.com/?src=events&sub=feed&sec=friends&!=jQuery36008973229264915061_{int(time.time())}&usr={usr_id}&=&_={int(time.time())}"

    def get_friend_ids(self):
        try:
            print(f"Fetching friends from: {self.friends_url}")
            req = requests.get(self.friends_url, timeout=30)
            
            if req.status_code == 200:
                raw_text = req.text
                raw_text = raw_text[raw_text.index('(') + 1: -1]
                raw_text = json.loads(raw_text)
                raw_text = raw_text['output']
                
                matches = re.findall(r'ovipets.com/\?img=user&amp;usr=(\d+)', raw_text)
                matches_secondary = re.findall(r'<a href = "#!/\?usr=(\d+)" class = "user avatar (trial|paid)">', raw_text)
                matches.extend([match[0] for match in matches_secondary])
                
                friend_ids = list(set([int(match) for match in matches]))
                print(f"Found {len(friend_ids)} unique friends")
                # randomize the order of friends
                import random
                random.shuffle(friend_ids)
                return friend_ids
                
        except Exception as e:
            print(f"Error fetching friends: {e}")
            return []

# --- API Endpoints ---
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    contents = await file.read()
    img = Image.open(io.BytesIO(contents)).convert("RGB")
    inp = preprocess(img).unsqueeze(0).to(device)

    with torch.no_grad():
        logits = model(inp)
        pred = logits.argmax(dim=1).item()
        label = CLASS_NAMES[pred]

    return {"predicted_class": label}

@app.post("/start_collection/{usr_id}")
async def start_collection(usr_id: int, peaceful: bool = False):
    """Start collecting eggs for the given user"""
    if peaceful:
        print(f"[API] Starting peaceful collection for user {usr_id}")
        return collector.start_collection(usr_id, peaceful_mode=True)
    return collector.start_collection(usr_id)

@app.post("/stop_collection")
async def stop_collection():
    """Stop the current collection"""
    return collector.stop_collection()

@app.get("/get_eggs")
async def get_eggs():
    """Get uncollected eggs and mark them as collected"""
    return collector.get_eggs()

@app.get("/progress")
async def get_progress():
    """Get current friend processing progress"""
    result = collector.get_progress()
    print(f"[API] Progress requested - returning: {result}")
    return result

@app.get("/status")
async def get_status():
    """Get current collection status"""
    with collector.eggs_lock:
        total_eggs = len(collector.collected_eggs)
        uncollected = len([e for e in collector.collected_eggs if not e["collected"]])
    
    progress = collector.get_progress()
    
    return {
        "is_running": collector.is_running,
        "usr_id": collector.usr_id,
        "total_eggs_found": total_eggs,
        "uncollected_count": uncollected,
        "friends_completed": progress["friends_completed"],
        "friends_total": progress["friends_total"]
    }

if __name__ == "__main__":
    try:
        print("[Server] Starting server...")
        uvicorn.run(app, host="0.0.0.0", port=8000)
    except KeyboardInterrupt:
        print("[Server] Keyboard interrupt received")
        collector.shutdown()