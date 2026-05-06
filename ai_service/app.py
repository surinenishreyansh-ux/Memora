from flask import Flask, request, jsonify
import numpy as np
import cv2
import os
import requests
import random
from collections import Counter
from pathlib import Path
import time
import face_recognition
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

def run_clustering(faces, threshold=0.55):
    """
    Chinese Whispers clustering implementation using Euclidean distance
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
            
            # Euclidean distance
            dist = np.linalg.norm(emb1 - emb2)
            similarities.append(dist)
            
            # For Chinese Whispers, we need a weight (higher is more similar)
            # Threshold 0.55 for distance means weight should be positive
            if dist < threshold:
                # Weight = inverse distance
                weight = 1.0 - dist 
                G.add_edge(i, j, weight=weight)
                
    if similarities:
        log(f"Distance Stats: Min={min(similarities):.4f}, Max={max(similarities):.4f}, Avg={np.mean(similarities):.4f}")
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
    return jsonify({
        "status": "ready", 
        "engine": "face_recognition (dlib)", 
        "model": "128-d encoding"
    })

@app.route('/process-photos', methods=['POST'])
def process_photos():
    data = request.json
    photos = data.get('photos', [])
    event_id = data.get('eventId')
    threshold = data.get('threshold', 0.55) # Tolerance in face_recognition
    
    event_debug_dir = DEBUG_DIR / str(event_id)
    event_debug_dir.mkdir(exist_ok=True, parents=True)
    
    all_faces = []
    log(f"\n--- PROCESSING EVENT {event_id} ({len(photos)} photos) USING FACE_RECOGNITION ---")

    for photo in photos:
        photo_url = photo.get('url')
        photo_id = photo.get('id')
        
        try:
            # Download image
            response = requests.get(photo_url, stream=True, timeout=15)
            # Use face_recognition to load image from raw bytes
            img = face_recognition.load_image_file(response.raw)
            
            # 1. Detect face locations
            # Using 'hog' for speed, 'cnn' is better but needs GPU
            face_locations = face_recognition.face_locations(img, model="hog")
            
            # 2. Extract encodings
            encodings = face_recognition.face_encodings(img, face_locations)
            
            log(f"  Photo {photo_id}: Found {len(encodings)} faces")

            for i, (location, encoding) in enumerate(zip(face_locations, encodings)):
                top, right, bottom, left = location
                w, h = right - left, bottom - top
                
                # Save crop for debug
                face_crop = img[top:bottom, left:right]
                if face_crop.size > 0:
                    crop_name = f"photo_{photo_id}_face_{i}.jpg"
                    # Convert to BGR for OpenCV
                    cv2.imwrite(str(event_debug_dir / crop_name), cv2.cvtColor(face_crop, cv2.COLOR_RGB2BGR))
                
                all_faces.append({
                    "id": len(all_faces),
                    "photoId": photo_id,
                    "faceIndex": i,
                    "embedding": encoding.tolist(),
                    "boundingBox": {"x": int(left), "y": int(top), "w": int(w), "h": int(h)},
                    "confidence": 1.0 # dlib doesn't give prob easily
                })
        except Exception as e:
            log(f"Error processing photo {photo_id}: {str(e)}")
            
    if not all_faces:
        log("No faces detected in this batch.")
        return jsonify({"faces": [], "clusters": []})
        
    # RUN REAL CLUSTERING
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
    threshold = data.get('threshold', 0.55)
    
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
        img = face_recognition.load_image_file(file)
        
        # Detect faces to check for multiple
        face_locations = face_recognition.face_locations(img)
        
        if not face_locations:
            return jsonify({
                "embedding": [],
                "faceDetected": False,
                "multipleFaces": False
            })
            
        is_multiple = len(face_locations) > 1
        
        # Extract encoding for the primary face
        encodings = face_recognition.face_encodings(img, face_locations)
        if not encodings:
            return jsonify({
                "embedding": [],
                "faceDetected": False,
                "multipleFaces": is_multiple
            })
            
        return jsonify({
            "embedding": encodings[0].tolist(),
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
