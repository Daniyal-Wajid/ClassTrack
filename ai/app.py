# app_retinaface_r50.py
import os
import time
import cv2
import numpy as np
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from io import BytesIO
from PIL import Image
import mediapipe as mp
from ultralytics import YOLO
from sklearn.cluster import DBSCAN
from collections import deque
import logging
import uuid

# InsightFace (RetinaFace R50)
from insightface.app import FaceAnalysis

# ------------------------ Config ------------------------
CONF_THRESH = 0.25       # YOLO conf (fallback)
SUSPICION_THRESH = 60.0 # track-level suspicion threshold (tune)
SUSPICION_DECAY = 0.95
HEAD_YAW_DEG = 30.0
EMA_ALPHA = 0.35
MAX_DISAPPEARED = 40
MAX_DISTANCE = 140
CLUSTER_EPS = 100

# ------------------------ Utilities ------------------------
def decode_image(image_data):
    header, encoded = image_data.split(",", 1)
    img = base64.b64decode(encoded)
    img = Image.open(BytesIO(img)).convert("RGB")
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

def encode_image(img):
    _, buffer = cv2.imencode(".jpg", img)
    return "data:image/jpeg;base64," + base64.b64encode(buffer).decode("utf-8")

def bbox_center(b):
    x1, y1, x2, y2 = b
    return (int((x1 + x2) / 2), int((y1 + y2) / 2))

# ------------------------ Clustering & merge ------------------------
def cluster_faces(detections, threshold=75):
    if len(detections) == 0:
        return {}
    centroids = np.array([[(x1 + x2) / 2, (y1 + y2) / 2] for (x1, y1, x2, y2) in detections])
    db = DBSCAN(eps=threshold, min_samples=1).fit(centroids)
    labels = db.labels_
    clustered = {}
    for i, label in enumerate(labels):
        clustered.setdefault(label, []).append(detections[i])
    return clustered

def merge_detections(retina, yolo, iou_thresh=0.35):
    all_boxes = retina + yolo
    merged = []
    for box in all_boxes:
        x1, y1, x2, y2 = box
        area = max(0, x2 - x1) * max(0, y2 - y1)
        overlap = False
        for m in merged:
            mx1, my1, mx2, my2 = m
            inter_x1, inter_y1 = max(x1, mx1), max(y1, my1)
            inter_x2, inter_y2 = min(x2, mx2), min(y2, my2)
            iw = max(0, inter_x2 - inter_x1)
            ih = max(0, inter_y2 - inter_y1)
            inter_area = iw * ih
            marea = max(0, mx2 - mx1) * max(0, my2 - my1)
            union = area + marea - inter_area if (area + marea - inter_area) > 0 else 1
            iou = inter_area / union
            if iou > iou_thresh:
                overlap = True
                break
        if not overlap:
            merged.append(box)
    return merged

# ------------------------ Head pose helpers (same approach) ------------------------
def is_face_forward(landmarks, img_width, img_height, head_yaw_threshold=HEAD_YAW_DEG):
    model_points = np.array([
        (0.0, 0.0, 0.0),
        (0.0, -330.0, -65.0),
        (-225.0, 170.0, -135.0),
        (225.0, 170.0, -135.0),
        (-150.0, -150.0, -125.0),
        (150.0, -150.0, -125.0)
    ], dtype="double")

    image_points = np.array([
        (landmarks[1].x * img_width, landmarks[1].y * img_height),
        (landmarks[152].x * img_width, landmarks[152].y * img_height),
        (landmarks[33].x * img_width, landmarks[33].y * img_height),
        (landmarks[263].x * img_width, landmarks[263].y * img_height),
        (landmarks[61].x * img_width, landmarks[61].y * img_height),
        (landmarks[291].x * img_width, landmarks[291].y * img_height)
    ], dtype="double")

    focal_length = img_width
    center = (img_width / 2, img_height / 2)
    camera_matrix = np.array([[focal_length, 0, center[0]],
                              [0, focal_length, center[1]],
                              [0, 0, 1]], dtype="double")
    dist_coeffs = np.zeros((4, 1))

    try:
        _, rvec, tvec = cv2.solvePnP(model_points, image_points, camera_matrix, dist_coeffs)
        rotation_matrix, _ = cv2.Rodrigues(rvec)
        euler_angles = cv2.decomposeProjectionMatrix(np.hstack((rotation_matrix, tvec)))[6]
        yaw = euler_angles[1]
        return abs(yaw) <= head_yaw_threshold
    except Exception:
        return False

def estimate_head_yaw(landmarks, img_shape):
    ih, iw = img_shape
    model_points = np.array([
        (0.0, 0.0, 0.0),
        (0.0, -330.0, -65.0),
        (-225.0, 170.0, -135.0),
        (225.0, 170.0, -135.0),
        (-150.0, -150.0, -125.0),
        (150.0, -150.0, -125.0)
    ], dtype="double")

    image_points = np.array([
        (landmarks[1].x * iw, landmarks[1].y * ih),
        (landmarks[152].x * iw, landmarks[152].y * ih),
        (landmarks[33].x * iw, landmarks[33].y * ih),
        (landmarks[263].x * iw, landmarks[263].y * ih),
        (landmarks[61].x * iw, landmarks[61].y * ih),
        (landmarks[291].x * iw, landmarks[291].y * ih)
    ], dtype="double")

    focal_length = iw
    center = (iw / 2, ih / 2)
    camera_matrix = np.array([[focal_length, 0, center[0]],
                              [0, focal_length, center[1]],
                              [0, 0, 1]], dtype="double")
    dist_coeffs = np.zeros((4, 1))

    try:
        _, rvec, tvec = cv2.solvePnP(model_points, image_points, camera_matrix, dist_coeffs)
        rotation_matrix, _ = cv2.Rodrigues(rvec)
        euler_angles = cv2.decomposeProjectionMatrix(np.hstack((rotation_matrix, tvec)))[6]
        yaw = euler_angles[1]
        max_yaw = 45.0
        normalized = min(max(abs(yaw) / max_yaw, 0), 1) * 100.0
        return float(normalized)
    except Exception:
        return 100.0

# ------------------------ Appearance features & tracker ------------------------
def extract_hist_feature(img_roi, bins=(16, 16, 16)):
    if img_roi is None or img_roi.size == 0:
        return None
    hsv = cv2.cvtColor(img_roi, cv2.COLOR_BGR2HSV)
    hist = cv2.calcHist([hsv], [0,1,2], None, bins, [0,180,0,256,0,256])
    cv2.normalize(hist, hist)
    return hist.flatten()

def hist_similarity(h1, h2):
    if h1 is None or h2 is None:
        return 0.0
    try:
        score = cv2.compareHist(h1.astype('float32'), h2.astype('float32'), cv2.HISTCMP_CORREL)
        return float(max(0.0, (score + 1.0) / 2.0))
    except Exception:
        return 0.0

class Track:
    def __init__(self, tid, bbox, feature, frame_idx):
        self.id = tid
        self.bbox = bbox
        self.centroid = np.array(bbox_center(bbox), dtype=float)
        self.centroid_ema = self.centroid.copy()
        self.feature = feature
        self.last_seen = frame_idx
        self.disappeared = 0
        self.suspicion = 0.0
        self.ema_yaw = 0.0
        self.consec_suspicious = 0
        self.reach_count = 0

    def update(self, bbox, feature, frame_idx):
        self.bbox = bbox
        c = np.array(bbox_center(bbox), dtype=float)
        self.centroid = c
        self.centroid_ema = EMA_ALPHA * c + (1.0 - EMA_ALPHA) * self.centroid_ema
        if feature is not None and self.feature is not None:
            self.feature = 0.6 * self.feature + 0.4 * feature
        elif feature is not None:
            self.feature = feature
        self.last_seen = frame_idx
        self.disappeared = 0

class AppearanceTracker:
    def __init__(self):
        self.next_id = 1
        self.tracks = dict()

    def register(self, bbox, feature, frame_idx):
        t = Track(self.next_id, bbox, feature, frame_idx)
        self.tracks[self.next_id] = t
        self.next_id += 1
        return t

    def deregister(self, tid):
        if tid in self.tracks:
            del self.tracks[tid]

    def match_and_update(self, detections, features, frame_idx):
        det_count = len(detections)
        if det_count == 0:
            for tid in list(self.tracks.keys()):
                t = self.tracks[tid]
                t.disappeared += 1
                if t.disappeared > MAX_DISAPPEARED:
                    self.deregister(tid)
            return self.tracks, {}

        det_centroids = np.array([bbox_center(b) for b in detections], dtype=float)

        if not self.tracks:
            for bbox, feat in zip(detections, features):
                self.register(bbox, feat, frame_idx)
            mapping = {i: list(self.tracks.keys())[i] for i in range(len(detections))}
            return self.tracks, mapping

        track_ids = list(self.tracks.keys())
        track_centroids = np.array([self.tracks[tid].centroid_ema for tid in track_ids], dtype=float)
        D = np.linalg.norm(track_centroids[:, None, :] - det_centroids[None, :, :], axis=2)
        A = np.zeros_like(D)
        for i, tid in enumerate(track_ids):
            tfeat = self.tracks[tid].feature
            for j, feat in enumerate(features):
                if tfeat is None or feat is None:
                    A[i, j] = 0.0
                else:
                    A[i, j] = hist_similarity(tfeat, feat)

        maxd = max(D.max(), 1.0)
        sim_dist = 1.0 - (D / maxd)
        score = 0.55 * A + 0.45 * sim_dist

        assigned_tracks = set()
        assigned_dets = set()
        matches = []
        for _ in range(min(score.shape[0], score.shape[1])):
            i, j = divmod(score.argmax(), score.shape[1])
            if score[i, j] <= 0.2:
                break
            if i in assigned_tracks or j in assigned_dets:
                score[i, j] = -1
                continue
            if D[i, j] > MAX_DISTANCE:
                score[i, j] = -1
                continue
            assigned_tracks.add(i)
            assigned_dets.add(j)
            matches.append((track_ids[i], j))
            score[i, :] = -1
            score[:, j] = -1

        for tid, j in matches:
            self.tracks[tid].update(detections[j], features[j], frame_idx)

        matched_track_ids = {m[0] for m in matches}
        for tid in track_ids:
            if tid not in matched_track_ids:
                t = self.tracks.get(tid)
                if t:
                    t.disappeared += 1
                    if t.disappeared > MAX_DISAPPEARED:
                        self.deregister(tid)

        matched_dets = {m[1] for m in matches}
        for j, bbox in enumerate(detections):
            if j not in matched_dets:
                self.register(bbox, features[j], frame_idx)

        mapping = {}
        for tid in self.tracks:
            try:
                distances = [np.linalg.norm(np.array(bbox_center(self.tracks[tid].bbox)) - np.array(bbox_center(d))) for d in detections]
                if len(distances) > 0:
                    j = int(np.argmin(distances))
                    mapping[j] = tid
            except Exception:
                pass

        return self.tracks, mapping

# ------------------------ Load detection models ------------------------
print("Loading models... (RetinaFace R50 via insightface)")
# FaceAnalysis with detection module (will download weights if needed)
# ctx_id=0 -> GPU, ctx_id=-1 -> CPU fallback
INSIGHT_CTX_ID = 0  # change to -1 for CPU only
fa = FaceAnalysis(allowed_modules=['detection'])
try:
    fa.prepare(ctx_id=INSIGHT_CTX_ID, det_size=(1280, 1280))
    print("InsightFace prepared on ctx_id =", INSIGHT_CTX_ID)
except Exception as e:
    logging.warning(f"InsightFace GPU prepare failed ({e}), falling back to CPU.")
    fa.prepare(ctx_id=-1, det_size=(1280, 1280))
    print("InsightFace prepared on CPU")

print("Loading YOLO fallback model (optional)")
yolo_model = YOLO('yolov8m-face-lindevs.pt')  # keep your original fallback
print("YOLO loaded")

# ------------------------ Global tracker ------------------------
tracker = AppearanceTracker()
frame_index = 0
mp_face_mesh = mp.solutions.face_mesh

# ------------------------ Detection wrappers ------------------------
def detect_faces_insight(img):
    boxes = []
    try:
        faces = fa.get(img)  # returns list of Face objects
        for f in faces:
            x1, y1, x2, y2 = f.bbox.astype(int)
            boxes.append((int(x1), int(y1), int(x2), int(y2)))
    except Exception as e:
        logging.warning(f"InsightFace detection error: {e}")
    return boxes

def detect_faces_yolo(img):
    boxes = []
    try:
        results = yolo_model.predict(img, imgsz=1280, conf=CONF_THRESH, verbose=False)
        for box in results[0].boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            boxes.append((x1, y1, x2, y2))
    except Exception as e:
        logging.warning(f"YOLO detection error: {e}")
    return boxes

# ------------------------ Main pipeline ------------------------
def detect_faces_and_gaze(img):
    global frame_index, tracker
    frame_index += 1

    students = []
    suspicious = False
    red_box_drawn = False

    ih, iw, _ = img.shape
    if iw < 1280:
        img = cv2.resize(img, (iw*2, ih*2))
        ih, iw, _ = img.shape

    retina_boxes = detect_faces_insight(img)
    yolo_boxes = detect_faces_yolo(img)
    merged_boxes = merge_detections(retina_boxes, yolo_boxes, iou_thresh=0.35)

    # compute features for tracking
    features = []
    for (x1, y1, x2, y2) in merged_boxes:
        x1c, y1c = max(0, x1), max(0, y1)
        x2c, y2c = min(img.shape[1]-1, x2), min(img.shape[0]-1, y2)
        if x2c <= x1c or y2c <= y1c:
            features.append(None)
            continue
        roi = img[y1c:y2c, x1c:x2c]
        features.append(extract_hist_feature(roi))

    tracks, det_to_track = tracker.match_and_update(merged_boxes, features, frame_index)

    with mp_face_mesh.FaceMesh(min_detection_confidence=0.3, min_tracking_confidence=0.3) as face_mesh:
        for det_idx, bbox in enumerate(merged_boxes):
            x1, y1, x2, y2 = map(int, bbox)
            if (x2 - x1) < 20 or (y2 - y1) < 20:
                continue
            face_roi = img[y1:y2, x1:x2]
            face_rgb = cv2.cvtColor(face_roi, cv2.COLOR_BGR2RGB)
            mesh_results = face_mesh.process(face_rgb)

            flags = []
            color = (0, 255, 0)
            yaw_pct_local = 0.0

            if mesh_results.multi_face_landmarks:
                for landmarks in mesh_results.multi_face_landmarks:
                    yaw_pct_local = estimate_head_yaw(landmarks.landmark, (img.shape[0], img.shape[1]))
                    if yaw_pct_local > 30:
                        flags.append(f"Yaw {yaw_pct_local:.1f}% (Suspicious)")
                        color = (0, 0, 255)
                    if not is_face_forward(landmarks.landmark, img.shape[1], img.shape[0]):
                        flags.append("Face turned sideways")
                        color = (0, 0, 255)

            track_id = det_to_track.get(det_idx, None)
            if track_id is not None and track_id in tracks:
                t = tracks[track_id]
                if len(flags) > 0:
                    inc = yaw_pct_local if yaw_pct_local > 0 else 10.0
                    t.suspicion = t.suspicion * SUSPICION_DECAY + inc
                    t.consec_suspicious += 1
                else:
                    t.suspicion = t.suspicion * SUSPICION_DECAY
                    t.consec_suspicious = 0

                if t.suspicion >= SUSPICION_THRESH and t.consec_suspicious >= 1:
                    t.reach_count += 1

                is_cheating = (t.suspicion >= SUSPICION_THRESH) or (t.reach_count >= 1)
                if is_cheating:
                    suspicious = True
                    red_box_drawn = True

                students.append({
                    "id": int(t.id),
                    "cheating": bool(is_cheating),
                    "suspicionScore": float(t.suspicion),
                    "flags": flags
                })
            else:
                is_cheating = len(flags) > 0
                if is_cheating:
                    suspicious = True
                    red_box_drawn = True
                students.append({
                    "id": None,
                    "cheating": is_cheating,
                    "suspicionScore": 0.0,
                    "flags": flags
                })

            cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
            for i, f in enumerate(flags):
                cv2.putText(img, f, (x1, y1 - 10 - (12 * i)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)

        if len(merged_boxes) > 1:
            suspicious = True
            for s in students:
                s.setdefault("flags", []).append("Multiple faces detected")
                s["cheating"] = True

    if red_box_drawn:
        os.makedirs('./cheating_images/', exist_ok=True)
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        cv2.imwrite(f'./cheating_images/cheating_{timestamp}.jpg', img)

    return students, suspicious, img

# ------------------------ Flask App ------------------------
app = Flask(__name__)
CORS(app)

@app.route("/camera/upload", methods=["POST"])
def upload():
    try:
        data = request.get_json()
        image_data = data.get("image")
        img = decode_image(image_data)
        session_id = str(uuid.uuid4())

        students, suspicious, annotated_img = detect_faces_and_gaze(img)
        annotated_img_base64 = encode_image(annotated_img)

        response = {
            "sessionId": session_id,
            "facesDetected": len(students),
            "students": students,
            "image": annotated_img_base64,
            "message": "🚨 Cheating detected" if suspicious else "✅ Normal"
        }
        if suspicious:
            response["savedImagePath"] = f"./cheating_images/cheating_{time.strftime('%Y%m%d_%H%M%S')}.jpg"

        return jsonify(response)
    except Exception as e:
        logging.exception("Error in upload")
        return jsonify({"error": "Internal Server Error"}), 500

if __name__ == "__main__":
    os.makedirs('./cheating_images/', exist_ok=True)
    print("Starting server on port 5001...")
    app.run(host="0.0.0.0", port=5001)
