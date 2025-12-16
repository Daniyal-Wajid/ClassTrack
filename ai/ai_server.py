# classroom_auto_detector_improved.py
"""
Improved classroom cheat detector:
- YOLO person detection (ultralytics)
- MediaPipe FaceMesh & Hands
- Simple appearance-aware tracker (centroid + torso color histogram)
- EMA smoothing for centroid & yaw
- Persistence counters to avoid flapping
- Save screenshot + short video clip on alert
- CLI args for tuning
"""

import os
import time
import argparse
import cv2
import json
import numpy as np
import pandas as pd
from collections import deque, defaultdict
from ultralytics import YOLO
import mediapipe as mp
from sklearn.cluster import DBSCAN

# ------------------------
# Helpers & defaults
# ------------------------
DEFAULTS = {
    "conf_thresh": 0.35,
    "suspicion_thresh": 20.0,       # lower for testing; raise for production
    "suspicion_decay": 0.99,
    "head_yaw_deg": 12.0,
    "reach_frames": 4,
    "persistence_frames": 5,        # must exceed for final flag
    "clip_pre_seconds": 3.0,
    "clip_post_seconds": 3.0,
    "max_track_disappeared": 40,
    "max_distance": 140,
    "ema_alpha": 0.35,
    "cluster_interval": 300,
    "cluster_eps": 100,
    "cluster_min_samples": 3
}

# ------------------------
# Parse args
# ------------------------
parser = argparse.ArgumentParser()
parser.add_argument("--source", default=0, help="Camera index or video file/RTSP URL")
parser.add_argument("--model", default="yolov8m.pt", help="YOLO model")
parser.add_argument("--out_dir", default="results", help="Output folder for logs/screens/clips")
parser.add_argument("--conf", type=float, default=DEFAULTS["conf_thresh"])
parser.add_argument("--susp_thresh", type=float, default=DEFAULTS["suspicion_thresh"])
parser.add_argument("--head_yaw_deg", type=float, default=DEFAULTS["head_yaw_deg"])
parser.add_argument("--debug", action="store_true")
args = parser.parse_args()

OUT_DIR = args.out_dir
LOG_DIR = os.path.join(OUT_DIR, "logs"); os.makedirs(LOG_DIR, exist_ok=True)
SCREEN_DIR = os.path.join(OUT_DIR, "screens"); os.makedirs(SCREEN_DIR, exist_ok=True)
CLIP_DIR = os.path.join(OUT_DIR, "clips"); os.makedirs(CLIP_DIR, exist_ok=True)

# Configurable parameters (exposed via CLI or constants)
CONF_THRESH = args.conf
SUSPICION_THRESH = args.susp_thresh
SUSPICION_DECAY = DEFAULTS["suspicion_decay"]
HEAD_YAW_DEG = args.head_yaw_deg
REACH_FRAMES = DEFAULTS["reach_frames"]
PERSISTENCE_FRAMES = DEFAULTS["persistence_frames"]
MAX_DISAPPEARED = DEFAULTS["max_track_disappeared"]
MAX_DISTANCE = DEFAULTS["max_distance"]
EMA_ALPHA = DEFAULTS["ema_alpha"]
CLUSTER_INTERVAL = DEFAULTS["cluster_interval"]
CLUSTER_EPS = DEFAULTS["cluster_eps"]
CLUSTER_MIN_SAMPLES = DEFAULTS["cluster_min_samples"]
CLIP_PRE_SEC = DEFAULTS["clip_pre_seconds"]
CLIP_POST_SEC = DEFAULTS["clip_post_seconds"]

# MediaPipe indices used for head pose estimation (approx)
mp_face = mp.solutions.face_mesh
mp_hands = mp.solutions.hands
MP_IDX = {"nose":1,"chin":152,"le":33,"re":263,"ml":61,"mr":291}
MODEL_3D = np.array([
    (0.0, 0.0, 0.0),
    (0.0, -330.0, -65.0),
    (-225.0, 170.0, -135.0),
    (225.0, 170.0, -135.0),
    (-150.0, -150.0, -125.0),
    (150.0, -150.0, -125.0)
], dtype=np.float64)

# ------------------------
# Utility functions
# ------------------------
def bbox_center(b):
    x1,y1,x2,y2 = b
    return (int((x1+x2)/2), int((y1+y2)/2))

def crop_upper_torso(frame, bbox, fraction=0.5):
    x1,y1,x2,y2 = bbox
    h = y2 - y1
    # upper torso roughly top half of bbox
    y_top = y1
    y_bot = y1 + int(h * fraction)
    x_left = max(0, x1); x_right = max(0, x2)
    return frame[y_top:y_bot, x_left:x_right]

def color_hist_feature(img, bins=(8,8,8)):
    # img in BGR
    if img is None or img.size == 0:
        return None
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    hist = cv2.calcHist([hsv], [0,1,2], None, bins, [0,180,0,256,0,256])
    cv2.normalize(hist, hist)
    return hist.flatten()

def hist_similarity(h1, h2):
    if h1 is None or h2 is None:
        return 0.0
    return float(cv2.compareHist(h1.astype(np.float32), h2.astype(np.float32), cv2.HISTCMP_CORREL))

def estimate_head_yaw(landmarks, image_size):
    h,w = image_size
    try:
        pts2d = np.array([
            (landmarks[MP_IDX["nose"]].x * w, landmarks[MP_IDX["nose"]].y * h),
            (landmarks[MP_IDX["chin"]].x * w, landmarks[MP_IDX["chin"]].y * h),
            (landmarks[MP_IDX["le"]].x * w, landmarks[MP_IDX["le"]].y * h),
            (landmarks[MP_IDX["re"]].x * w, landmarks[MP_IDX["re"]].y * h),
            (landmarks[MP_IDX["ml"]].x * w, landmarks[MP_IDX["ml"]].y * h),
            (landmarks[MP_IDX["mr"]].x * w, landmarks[MP_IDX["mr"]].y * h)
        ], dtype=np.float64)
    except Exception:
        return None
    focal = w
    center = (w/2, h/2)
    cam = np.array([[focal,0,center[0]],[0,focal,center[1]],[0,0,1]], dtype=np.float64)
    ok, rvec, tvec = cv2.solvePnP(MODEL_3D, pts2d, cam, np.zeros((4,1)), flags=cv2.SOLVEPNP_ITERATIVE)
    if not ok:
        return None
    rmat, _ = cv2.Rodrigues(rvec)
    proj = np.hstack((rmat, tvec))
    _, _, _, _, _, _, euler = cv2.decomposeProjectionMatrix(proj)
    # euler[1] is yaw (degrees)
    yaw_val = float(euler[1].item()) if hasattr(euler[1],'item') else float(euler[1])
    return yaw_val

# ------------------------
# Tracker class (appearance + centroid + EMA smoothing)
# ------------------------
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
        # buffer for saving short per-track history if needed (not per-track video but global buffer used)
    def update(self, bbox, feature, frame_idx):
        self.bbox = bbox
        c = np.array(bbox_center(bbox), dtype=float)
        self.centroid = c
        # EMA for centroid
        self.centroid_ema = EMA_ALPHA * c + (1.0 - EMA_ALPHA) * self.centroid_ema
        # update appearance feature with simple average to be tolerant
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
        """
        detections: list of bbox tuples
        features: list of hist features (or None)
        returns dict of tracks
        """
        if len(detections) == 0:
            # increment disappeared
            for tid in list(self.tracks.keys()):
                t = self.tracks[tid]
                t.disappeared += 1
                if t.disappeared > MAX_DISAPPEARED:
                    self.deregister(tid)
            return self.tracks

        # prepare arrays
        det_centroids = np.array([bbox_center(b) for b in detections], dtype=float)
        if not self.tracks:
            for bbox, feat in zip(detections, features):
                self.register(bbox, feat, frame_idx)
            return self.tracks

        track_ids = list(self.tracks.keys())
        track_centroids = np.array([self.tracks[tid].centroid_ema for tid in track_ids], dtype=float)

        # distance matrix
        D = np.linalg.norm(track_centroids[:,None,:] - det_centroids[None,:,:], axis=2)

        # appearance similarity matrix (higher better)
        A = np.zeros_like(D)
        for i, tid in enumerate(track_ids):
            tfeat = self.tracks[tid].feature
            for j, feat in enumerate(features):
                if tfeat is None or feat is None:
                    A[i,j] = 0.0
                else:
                    A[i,j] = hist_similarity(tfeat, feat)

        # combine normalized distance and appearance to a matching score
        # convert distances into similarity [0,1] via max distance
        maxd = max(D.max(), 1.0)
        sim_dist = 1.0 - (D / maxd)
        # weight appearance more if available
        score = 0.55 * A + 0.45 * sim_dist

        # greedy match highest score
        assigned_tracks = set()
        assigned_dets = set()
        matches = []
        for _ in range(min(score.shape[0], score.shape[1])):
            i,j = divmod(score.argmax(), score.shape[1])
            if score[i,j] <= 0.2:
                break
            if i in assigned_tracks or j in assigned_dets:
                score[i,j] = -1
                continue
            # enforce distance threshold for safety
            if D[i,j] > MAX_DISTANCE:
                score[i,j] = -1
                continue
            assigned_tracks.add(i); assigned_dets.add(j)
            matches.append((track_ids[i], j))
            score[i,:] = -1
            score[:,j] = -1

        # update matched
        for tid, j in matches:
            self.tracks[tid].update(detections[j], features[j], frame_idx)

        # unmatched tracks -> increment disappeared
        for idx, tid in enumerate(track_ids):
            if idx not in [m[0] for m in [(track_ids.index(x),y) for x,y in matches] if _ is not None] and idx not in [track_ids.index(tid) for tid,_ in matches]:
                # simpler: check if this index maps in matches
                if all(tid != m[0] for m in matches):
                    t = self.tracks.get(tid)
                    if t:
                        t.disappeared += 1
                        if t.disappeared > MAX_DISAPPEARED:
                            self.deregister(tid)

        # unmatched detections -> register
        for j, bbox in enumerate(detections):
            if j not in set(j for _, j in matches):
                self.register(bbox, features[j], frame_idx)

        return self.tracks

# ------------------------
# Clip buffer (global frame circular buffer)
# ------------------------
class FrameBuffer:
    def __init__(self, maxlen_frames=300):
        self.buf = deque(maxlen=maxlen_frames)
    def push(self, frame):
        self.buf.append((time.time(), frame.copy()))
    def get_last_n(self, seconds):
        now = time.time()
        out = []
        for ts, f in reversed(self.buf):
            if now - ts <= seconds:
                out.append((ts, f))
            else:
                break
        return list(reversed(out))
    def get_all(self):
        return list(self.buf)

# ------------------------
# Main detection loop
# ------------------------
def main_loop(source):
    print("Loading model:", args.model)
    model = YOLO(args.model)
    cap = cv2.VideoCapture(int(source) if str(source).isdigit() else source)
    if not cap.isOpened():
        raise RuntimeError("Cannot open video source: " + str(source))

    face_mesh = mp_face.FaceMesh(static_image_mode=False, max_num_faces=6, refine_landmarks=True,
                                 min_detection_confidence=0.5, min_tracking_confidence=0.5)
    hands = mp_hands.Hands(static_image_mode=False, max_num_hands=4,
                           model_complexity=1, min_detection_confidence=0.5, min_tracking_confidence=0.5)

    tracker = AppearanceTracker()
    fb = FrameBuffer(maxlen_frames=int((CLIP_PRE_SEC + CLIP_POST_SEC + 5) * 30))  # keep a safe buffer (~fps 30)
    frame_idx = 0
    csv_rows = []
    all_centroids = []
    clusters = []
    last_cluster_time = 0
    fps_est = None

    print("Starting main loop. Press 'q' to quit.")
    while True:
        start = time.time()
        ret, frame = cap.read()
        if not ret:
            print("Stream ended.")
            break
        frame_idx += 1
        fb.push(frame)
        h, w = frame.shape[:2]
        disp = frame.copy()

        # YOLO detect people
        results = model.predict(frame, imgsz=640, conf=CONF_THRESH, classes=[0], verbose=False)
        dets = []
        det_features = []
        if results and hasattr(results[0], "boxes"):
            for box in results[0].boxes:
                conf = float(box.conf[0].cpu().numpy())
                if conf < CONF_THRESH:
                    continue
                xyxy = box.xyxy[0].cpu().numpy()
                x1,y1,x2,y2 = map(int, xyxy)
                # clamp
                x1,y1 = max(0,x1), max(0,y1)
                x2,y2 = min(w-1,x2), min(h-1,y2)
                dets.append((x1,y1,x2,y2))
                # appearance feature: upper torso histogram
                crop = crop_upper_torso(frame, (x1,y1,x2,y2), fraction=0.5)
                feat = color_hist_feature(crop)
                det_features.append(feat)
                # draw light rectangle
                cv2.rectangle(disp, (x1,y1), (x2,y2), (120,200,120), 1)

        # Update tracker (appearance + centroid)
        tracks = tracker.match_and_update(dets, det_features, frame_idx)

        # Periodically learn clusters (approx seat positions) from long-term centroids for "leaving seat" logic
        if frame_idx - last_cluster_time > CLUSTER_INTERVAL:
            # collect centroids across tracks
            all_centroids.extend([t.centroid.tolist() for t in tracks.values()])
            if len(all_centroids) >= CLUSTER_MIN_SAMPLES:
                try:
                    X = np.array(all_centroids)
                    db = DBSCAN(eps=CLUSTER_EPS, min_samples=CLUSTER_MIN_SAMPLES).fit(X)
                    clusters = [X[db.labels_==i].mean(axis=0) for i in set(db.labels_) if i!=-1]
                except Exception as e:
                    if args.debug: print("Cluster error:", e)
            last_cluster_time = frame_idx

        # Process face/hand landmarks
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_res = face_mesh.process(rgb)
        hand_res = hands.process(rgb)

        # Precompute face centroid list and landmarks
        faces = []
        if face_res and face_res.multi_face_landmarks:
            for lms in face_res.multi_face_landmarks:
                xs = [p.x for p in lms.landmark]; ys = [p.y for p in lms.landmark]
                cx = int((min(xs)+max(xs)) * 0.5 * w)
                cy = int((min(ys)+max(ys)) * 0.5 * h)
                faces.append((lms.landmark, (cx, cy)))

        hands_pts = []
        if hand_res and hand_res.multi_hand_landmarks:
            for hms in hand_res.multi_hand_landmarks:
                pts = [(int(p.x * w), int(p.y * h)) for p in hms.landmark]
                hands_pts.append(pts)

        # Evaluate each track for suspicious behavior
        for tid, t in list(tracker.tracks.items()):
            # find nearest face (if any)
            yaw = 0.0
            if faces:
                # choose nearest face centroid
                face_lms, face_c = min(faces, key=lambda f: np.hypot(f[1][0] - t.centroid[0], f[1][1] - t.centroid[1]))
                hyaw = estimate_head_yaw(face_lms, (h, w))
                if hyaw is not None:
                    # EMA for yaw
                    t.ema_yaw = EMA_ALPHA * hyaw + (1 - EMA_ALPHA) * t.ema_yaw
                    yaw = t.ema_yaw

            # reaching detection: if any hand point is near the track centroid (and not near their own upper-torso box center),
            # increment reach_count. We use a radius threshold.
            reach_detected = False
            for hp in hands_pts:
                for px, py in hp:
                    if np.hypot(px - t.centroid[0], py - t.centroid[1]) < 200:
                        reach_detected = True
                        break
                if reach_detected:
                    break
            if reach_detected:
                t.reach_count += 1
            else:
                t.reach_count = max(0, t.reach_count - 1)

            # compute distance to nearest learned cluster (if available)
            left_cluster = False
            if clusters:
                dmin = min(np.linalg.norm(t.centroid - np.array(c)) for c in clusters)
                if dmin > 160:
                    left_cluster = True

            # Build score delta (heuristic)
            delta = 0.0
            # Mark if student is looking away (outside acceptable forward zone)
            # Example: ±HEAD_YAW_DEG counts as "forward", anything beyond is "away"
            if yaw < -HEAD_YAW_DEG or yaw > HEAD_YAW_DEG:
                delta += 2.0

            if t.reach_count > REACH_FRAMES:
                delta += 8.0
            if left_cluster:
                delta += 4.0

            # update suspicion
            t.suspicion = t.suspicion * SUSPICION_DECAY + delta

            # Persistence logic: require consecutive frames above a smaller per-frame threshold to mark final
            if t.suspicion > (SUSPICION_THRESH * 0.6):
                t.consec_suspicious += 1
            else:
                t.consec_suspicious = 0

            # Visualize
            x1,y1,x2,y2 = t.bbox
            color = (0,0,255) if (t.suspicion > SUSPICION_THRESH and t.consec_suspicious >= PERSISTENCE_FRAMES) else (0,200,0)
            cv2.rectangle(disp, (x1,y1), (x2,y2), color, 2)
            cv2.putText(disp, f"ID:{tid} S:{int(t.suspicion)}", (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)

            # If fully flagged (suspicion + persistence), log and save evidence
            if t.suspicion > SUSPICION_THRESH and t.consec_suspicious >= PERSISTENCE_FRAMES:
                now_ts = time.strftime("%Y%m%d_%H%M%S")
                print(f"[ALERT] track {tid} suspicion={t.suspicion:.1f} frame={frame_idx} time={now_ts}")
                # CSV row
                csv_rows.append({
                    "time": time.strftime('%Y-%m-%d %H:%M:%S'),
                    "frame": frame_idx,
                    "track_id": tid,
                    "suspicion": round(t.suspicion, 2)
                })
                # Save screenshot (annotated)
                shot_name = f"alert_{now_ts}_f{frame_idx}_id{tid}.jpg"
                shot_path = os.path.join(SCREEN_DIR, shot_name)
                cv2.imwrite(shot_path, disp)

                # Save short clip: collect pre-buffer frames from fb, then write next clip_post frames
                try:
                    prebuf = fb.get_last_n(CLIP_PRE_SEC)
                    # determine fps (estimate)
                    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
                    post_frames = int(CLIP_POST_SEC * fps)
                    clip_name = f"alert_{now_ts}_f{frame_idx}_id{tid}.mp4"
                    clip_path = os.path.join(CLIP_DIR, clip_name)
                    # Get frame size
                    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                    out = cv2.VideoWriter(clip_path, fourcc, fps, (w, h))
                    # write pre buffer
                    for ts, pf in prebuf:
                        out.write(pf)
                    # write current frame
                    out.write(frame)
                    # write next post frames synchronously
                    written = 0
                    while written < post_frames:
                        ret2, f2 = cap.read()
                        if not ret2:
                            break
                        fb.push(f2)
                        out.write(f2)
                        written += 1
                    out.release()
                    print(f"Saved clip {clip_path} (pre {len(prebuf)} frames, post {written})")
                except Exception as e:
                    print("Clip saving error:", e)

                # Damp suspicion to avoid repeated saves
                t.suspicion *= 0.25
                t.consec_suspicious = 0

        # show approximate fps
        end = time.time()
        if fps_est is None:
            fps_est = 1.0 / max(1e-6, end - start)
        else:
            fps_est = 0.9 * fps_est + 0.1 * (1.0 / max(1e-6, end - start))
        cv2.putText(disp, f"FPS:{fps_est:.1f}", (10,20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200,200,0), 2)

        cv2.imshow("auto-cheat-improved", disp)
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            print("Stopping by user.")
            break

    # Save CSV log
    if csv_rows:
        csv_path = os.path.join(LOG_DIR, f"alerts_{time.strftime('%Y%m%d_%H%M%S')}.csv")
        pd.DataFrame(csv_rows).to_csv(csv_path, index=False)
        print("Saved CSV:", csv_path)

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main_loop(args.source)
