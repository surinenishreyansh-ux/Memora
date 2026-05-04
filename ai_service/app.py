from flask import Flask, request, jsonify
import numpy as np
import cv2
import os
import requests
from sklearn.cluster import DBSCAN
from scipy.spatial.distance import cosine
import time
from pathlib import Path

app = Flask(__name__)

# CONFIGURATION
DEBUG_DIR = Path('debug_faces')
DEBUG_DIR.mkdir(exist_ok=True)

# MODEL PATHS (Will download if missing)
YUNET_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
SFACE_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"

YUNET_PATH = "face_detection_yunet.onnx"
SFACE_PATH = "face_recognition_sface.onnx"

def download_model(url, path):
    if not os.path.exists(path):
        print(f"Downloading model from {url}...")
        with requests.get(url, stream=True) as r:
            r.raise_for_status()
            with open(path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
        print(f"Successfully downloaded {path}")

# Initialize models
download_model(YUNET_URL, YUNET_PATH)
download_model(SFACE_URL, SFACE_PATH)

# Load YuNet
detector = cv2.FaceDetectorYN.create(
    model=YUNET_PATH,
    config="",
    input_size=(320, 320),
    score_threshold=0.6,
    nms_threshold=0.3,
    top_k=5000
)

# Load SFace
recognizer = cv2.FaceRecognizerSF.create(
    model=SFACE_PATH,
    config=""
)

def normalize_embedding(emb):
    emb = np.array(emb)
    norm = np.linalg.norm(emb)
    if norm == 0:
        return emb.tolist()
    return (emb / norm).tolist()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ready", "model": "SFace", "detector": "YuNet"})

@app.route('/process-photos', methods=['POST'])
def process_photos():
    data = request.json
    photos = data.get('photos', [])
    event_id = data.get('eventId')
    
    event_debug_dir = DEBUG_DIR / str(event_id)
    event_debug_dir.mkdir(exist_ok=True, parents=True)
    
    all_faces = []
    print(f"\n--- PROCESSING EVENT {event_id} ---")

    for photo_idx, photo in enumerate(photos):
        photo_url = photo.get('url')
        photo_id = photo.get('id')
        
        try:
            response = requests.get(photo_url)
            img_array = np.frombuffer(response.content, np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
            h, w, _ = img.shape
            
            detector.setInputSize((w, h))
            _, faces = detector.detect(img)
            
            if faces is not None:
                print(f"Photo {photo_idx}: Detected {len(faces)} faces")
                for i, face in enumerate(faces):
                    # face: [x1, y1, w, h, x_re, y_re, x_le, y_le, x_nt, y_nt, x_rm, y_rm, x_lm, y_lm, score]
                    aligned_face = recognizer.alignCrop(img, face)
                    embedding = recognizer.feature(aligned_face)
                    
                    x, y, fw, fh = map(int, face[:4])
                    face_crop = img[max(0,y):min(h,y+fh), max(0,x):min(w,x+fw)]
                    
                    crop_name = f"photo_{photo_idx}_face_{i}.jpg"
                    if face_crop.size > 0:
                        cv2.imwrite(str(event_debug_dir / crop_name), face_crop)
                    
                    all_faces.append({
                        "photoId": photo_id,
                        "embedding": normalize_embedding(embedding[0]),
                        "boundingBox": {"x": x, "y": y, "w": fw, "h": fh},
                        "confidence": float(face[-1]),
                        "clusterId": None
                    })
        except Exception as e:
            print(f"Error photo {photo_id}: {str(e)}")
            
    if not all_faces:
        return jsonify({"faces": [], "clusters": {}})
        
    embeddings = np.array([f['embedding'] for f in all_faces])
    # SFace cosine distance threshold is usually 0.3-0.4
    clustering = DBSCAN(eps=0.35, min_samples=1, metric='cosine').fit(embeddings)
    
    clusters = {}
    for idx, label in enumerate(clustering.labels_):
        label_str = str(label)
        if label_str not in clusters: clusters[label_str] = []
        clusters[label_str].append(all_faces[idx]['photoId'])
        all_faces[idx]['clusterId'] = label_str

    return jsonify({"faces": all_faces, "clusters": clusters})

@app.route('/match-face', methods=['POST'])
def match_face():
    file = request.files['faceCrop']
    img_array = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    h, w, _ = img.shape
    
    detector.setInputSize((w, h))
    _, faces = detector.detect(img)
    
    if faces is not None:
        aligned_face = recognizer.alignCrop(img, faces[0])
        embedding = recognizer.feature(aligned_face)
        return jsonify({"embedding": normalize_embedding(embedding[0])})
    
    return jsonify({"error": "No face detected"}), 404

if __name__ == '__main__':
    app.run(port=8000)
