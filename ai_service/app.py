from flask import Flask, request, jsonify
import cv2
import numpy as np
import os
import requests
import random
from collections import Counter
from pathlib import Path
import time
from PIL import Image
import sys
import networkx as nx

app = Flask(__name__)

# LOGGING
LOG_FILE = Path(os.getcwd()) / 'ai_service.log'

def log(msg):
    with open(LOG_FILE, 'a') as f:
        f.write(f"[{time.ctime()}] {msg}\n")
    print(msg)
    sys.stdout.flush()

# CONFIGURATION
DEBUG_DIR = Path('debug_faces')
DEBUG_DIR.mkdir(exist_ok=True)

MODEL_DETECTION = "face_detection_yunet.onnx"
MODEL_RECOGNITION = "face_recognition_sface.onnx"

class FaceEngine:
    def __init__(self):
        log("Initializing FaceEngine (YuNet + SFace)...")
        
        # Safe model check
        if not os.path.exists(MODEL_DETECTION):
            raise FileNotFoundError(f"Detection model not found: {MODEL_DETECTION}")
        if not os.path.exists(MODEL_RECOGNITION):
            raise FileNotFoundError(f"Recognition model not found: {MODEL_RECOGNITION}")

        try:
            self.detector = cv2.FaceDetectorYN.create(
                model=MODEL_DETECTION,
                config="",
                input_size=(320, 320),
                score_threshold=0.8,
                nms_threshold=0.3,
                top_k=5000
            )
            self.recognizer = cv2.FaceRecognizerSF.create(
                model=MODEL_RECOGNITION,
                config=""
            )
            log("Models loaded successfully.")
        except Exception as e:
            log(f"Critical error loading models: {str(e)}")
            raise

    def process_image(self, img_bgr):
        h, w, _ = img_bgr.shape
        self.detector.setInputSize((w, h))
        _, faces = self.detector.detect(img_bgr)
        
        results = []
        if faces is not None:
            for face in faces:
                # Align and crop face for SFace
                aligned_face = self.recognizer.alignCrop(img_bgr, face)
                # Extract features (128-d vector)
                feature = self.recognizer.feature(aligned_face)
                
                # Normalize feature for Cosine Similarity (dot product)
                norm = np.linalg.norm(feature)
                if norm > 1e-6:
                    feature = feature / norm
                
                results.append({
                    "bbox": face[0:4].astype(int), # [x, y, w, h]
                    "encoding": feature[0].tolist(),
                    "confidence": float(face[-1]),
                    "raw_face": face
                })
        return results

# Lazy initialize engine
_engine = None
def get_engine():
    global _engine
    if _engine is None:
        _engine = FaceEngine()
    return _engine

def run_clustering(faces, threshold=0.4):
    """
    Chinese Whispers clustering implementation using Cosine Similarity
    Higher threshold = stricter matching
    """
    if not faces:
        return {}
        
    G = nx.Graph()
    for i in range(len(faces)):
        G.add_node(i)
        
    # Add edges between similar faces
    similarities = []
    for i in range(len(faces)):
        for j in range(i + 1, len(faces)):
            emb1 = np.array(faces[i]['embedding'])
            emb2 = np.array(faces[j]['embedding'])
            
            # Cosine Similarity (dot product of normalized vectors)
            sim = float(np.dot(emb1, emb2))
            similarities.append(sim)
            
            # For SFace, sim > 0.363 is usually considered same person
            if sim > threshold:
                G.add_edge(i, j, weight=sim)
                
    if similarities:
        log(f"Similarity Stats: Min={min(similarities):.4f}, Max={max(similarities):.4f}, Avg={np.mean(similarities):.4f}")
        log(f"Edges added: {G.number_of_edges()} / {len(faces)*(len(faces)-1)//2}")
                
    # Chinese Whispers Algorithm
    nodes = list(G.nodes())
    random.shuffle(nodes)
    labels = {n: n for n in nodes}
    
    for _ in range(20):
        changed = False
        random.shuffle(nodes)
        for u in nodes:
            neighbors = list(G.neighbors(u))
            if not neighbors:
                continue
                
            neighbor_labels = Counter()
            for v in neighbors:
                weight = G[u][v].get('weight', 1.0)
                neighbor_labels[labels[v]] += weight
                
            if neighbor_labels:
                max_label = neighbor_labels.most_common(1)[0][0]
                if labels[u] != max_label:
                    labels[u] = max_label
                    changed = True
        if not changed:
            break
            
    return labels

@app.route('/health', methods=['GET'])
def health():
    try:
        get_engine()
        return jsonify({
            "status": "healthy", 
            "engine": "OpenCV YuNet/SFace",
            "details": "128-d normalized embeddings with Cosine Similarity"
        })
    except Exception as e:
        log(f"Health check failed: {str(e)}")
        return jsonify({
            "status": "error", 
            "engine": "OpenCV YuNet/SFace",
            "message": str(e)
        }), 500

@app.route('/process-photos', methods=['POST'])
def process_photos():
    data = request.json
    photos = data.get('photos', [])
    event_id = data.get('eventId')
    threshold = data.get('threshold', 0.4) # Cosine similarity threshold
    
    event_debug_dir = DEBUG_DIR / str(event_id)
    event_debug_dir.mkdir(exist_ok=True, parents=True)
    
    try:
        engine = get_engine()
    except Exception as e:
        return jsonify({"error": f"Engine initialization failed: {str(e)}"}), 500

    all_faces = []
    log(f"\n--- PROCESSING EVENT {event_id} ({len(photos)} photos) ---")

    for photo in photos:
        photo_url = photo.get('url')
        photo_id = photo.get('id')
        
        try:
            # Download image
            response = requests.get(photo_url, stream=True, timeout=15)
            img_array = np.asarray(bytearray(response.content), dtype=np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
            
            if img is None:
                log(f"Failed to decode image from {photo_url}")
                continue

            # Detect and Encode
            detections = engine.process_image(img)
            log(f"  Photo {photo_id}: Found {len(detections)} faces")

            for i, det in enumerate(detections):
                x, y, w, h = det['bbox']
                
                # Save crop for debug
                x1, y1 = max(0, x), max(0, y)
                x2, y2 = min(img.shape[1], x+w), min(img.shape[0], y+h)
                face_crop = img[y1:y2, x1:x2]
                
                if face_crop.size > 0:
                    crop_name = f"photo_{photo_id}_face_{i}.jpg"
                    cv2.imwrite(str(event_debug_dir / crop_name), face_crop)
                
                all_faces.append({
                    "id": len(all_faces),
                    "photoId": photo_id,
                    "faceIndex": i,
                    "embedding": det['encoding'],
                    "boundingBox": {"x": int(x), "y": int(y), "w": int(w), "h": int(h)},
                    "confidence": det['confidence']
                })
        except Exception as e:
            log(f"Error processing photo {photo_id}: {str(e)}")
            
    if not all_faces:
        log("No faces detected in this batch.")
        return jsonify({"faces": [], "clusters": []})
        
    # RUN CLUSTERING
    log(f"Running Chinese Whispers on {len(all_faces)} faces...")
    labels = run_clustering(all_faces, threshold=threshold)
    
    clusters_output = {}
    for i, face in enumerate(all_faces):
        label = str(labels[i])
        face['clusterId'] = label
        
        if label not in clusters_output:
            clusters_output[label] = {"clusterId": label, "faceIds": [], "photoIds": []}
        
        clusters_output[label]["faceIds"].append(face['id'])
        if face['photoId'] not in clusters_output[label]["photoIds"]:
            clusters_output[label]["photoIds"].append(face['photoId'])

    log(f"Clustering complete. Found {len(clusters_output)} unique people.")
    return jsonify({"faces": all_faces, "clusters": list(clusters_output.values())})

@app.route('/cluster-only', methods=['POST'])
def cluster_only():
    data = request.json
    faces = data.get('faces', [])
    threshold = data.get('threshold', 0.4)
    
    if not faces:
        return jsonify({"clusters": []})
        
    log(f"Running cluster-only on {len(faces)} embeddings...")
    labels = run_clustering(faces, threshold=threshold)
    
    clusters_output = {}
    for i, face in enumerate(faces):
        label = str(labels[i])
        if label not in clusters_output:
            clusters_output[label] = {"clusterId": label, "faceIds": [], "photoIds": []}
        
        clusters_output[label]["faceIds"].append(face['id'])
        if face.get('photoId') and face['photoId'] not in clusters_output[label]["photoIds"]:
            clusters_output[label]["photoIds"].append(face['photoId'])
            
    return jsonify({"clusters": list(clusters_output.values())})

@app.route('/match-face', methods=['POST'])
def match_face():
    if 'faceCrop' not in request.files:
        return jsonify({
            "embedding": [],
            "faceDetected": False,
            "multipleFaces": False,
            "error": "No face crop provided"
        }), 400
        
    file = request.files['faceCrop']
    try:
        engine = get_engine()
        img_array = np.asarray(bytearray(file.read()), dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({"error": "Failed to decode image"}), 400
            
        detections = engine.process_image(img)
        
        if not detections:
            return jsonify({
                "embedding": [],
                "faceDetected": False,
                "multipleFaces": False
            })
            
        is_multiple = len(detections) > 1
        
        return jsonify({
            "embedding": detections[0]['encoding'],
            "faceDetected": True,
            "multipleFaces": is_multiple
        })
    except Exception as e:
        log(f"Match face error: {str(e)}")
        return jsonify({
            "embedding": [],
            "faceDetected": False,
            "multipleFaces": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8001))
    app.run(port=port, host='0.0.0.0')
