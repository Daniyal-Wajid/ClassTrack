import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { AlertTriangle, Video, CheckCircle, Rss, Clock, Home } from "lucide-react";
import { RFID_MAP } from "../../config/rfidMap";

const API = process.env.REACT_APP_API_URL;

export default function InstructorMonitoring() {
  const { token } = useAuth();
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const dummyInputRef = useRef(null);
  const logIntervalRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const timerRef = useRef(null);

  const [logs, setLogs] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [error, setError] = useState("");
  const [ending, setEnding] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [latestScan, setLatestScan] = useState("—");
  const [scanHistory, setScanHistory] = useState([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [attendanceCutoff, setAttendanceCutoff] = useState(null); // in minutes
  const [cutoffRemaining, setCutoffRemaining] = useState(null); // in seconds
 const [endedOnce, setEndedOnce] = useState(false);
  // 🕒 Stopwatch timer
  useEffect(() => {
    if (!sessionInfo?.startTime) return;
    const start = new Date(sessionInfo.startTime).getTime();
    timerRef.current = setInterval(() => {
      const diff = Math.floor((Date.now() - start) / 1000);
      setElapsed(diff);

      // Calculate remaining time for cutoff
      if (attendanceCutoff) {
        const remaining = attendanceCutoff * 60 - diff;
        setCutoffRemaining(remaining > 0 ? remaining : 0);
      } else {
        setCutoffRemaining(null);
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [sessionInfo, attendanceCutoff]);

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // 🎥 Camera setup
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setError("❌ Cannot access camera. Check permissions.");
      }
    };
    initCamera();
  }, []);

  // 📡 Load session details
  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      try {
        const { data } = await axios.get(`${API}/attendance/details/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSessionInfo(data.session);
      } catch {
        setError("Failed to load session details.");
      }
    };
    load();
  }, [sessionId, token]);

  // 📸 Capture and logs
  const captureAndSend = async () => {
    if (!videoRef.current || !videoRef.current.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL("image/jpeg");
    try {
      await axios.post(`${API}/attendance/camera/${sessionId}`, { image }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      console.warn("⚠️ Failed to send frame");
    }
  };

  const fetchLogs = async () => {
    try {
      const { data } = await axios.get(`${API}/attendance/camera/logs/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(data.logs || []);
    } catch {
      console.warn("⚠️ Failed to fetch logs");
    }
  };

  const startDetection = () => {
    fetchLogs();
    logIntervalRef.current = setInterval(fetchLogs, 5000);
    frameIntervalRef.current = setInterval(captureAndSend, 5000);
    setDetecting(true);
  };

  const stopDetection = () => {
    clearInterval(logIntervalRef.current);
    clearInterval(frameIntervalRef.current);
    setDetecting(false);
  };

  // ✅ Allow editing even after session end
const handleEndSession = async () => {
    if (endedOnce) {
      navigate("/instructor/dashboard");
      return;
    }

    if (!sessionId) return;
    setEnding(true);
    try {
      await axios.post(
        `${API}/attendance/end`,
        { sessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSessionInfo((prev) => ({ ...prev, ended: true }));
      setEndedOnce(true);
    } catch {
      setError("Failed to end session.");
    } finally {
      setEnding(false);
    }
  };

  // ✅ RFID scanning with cutoff enforcement
  useEffect(() => {
    const dummy = dummyInputRef.current;
    if (!dummy) return;
    let buffer = "";
    let debounceTimer = null;

    const focusInput = () => {
      dummy.focus({ preventScroll: true });
      dummy.value = "";
    };

    const flushScan = async (rawTag) => {
      const info = RFID_MAP[rawTag];
      const timestamp = new Date();
      const elapsedMinutes = Math.floor(elapsed / 60);

      const display = info ? `${info.name} (${info.studentId})` : "Unknown Card";
      setLatestScan(display);
      setScanHistory((prev) => [{ display, timestamp, elapsedMinutes }, ...prev.slice(0, 19)]);

if (attendanceCutoff && elapsedMinutes >= attendanceCutoff) {
  setError(
    `⚠️ Attendance window closed after ${attendanceCutoff} minutes. RFID scanning disabled.`
  );
  setTimeout(() => setError(""), 4000);
  return; 
}

      try {
        await axios.post(
          `${API}/attendance/rfid/${sessionId}`,
          { tag: rawTag, timestamp },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (info) {
          await axios.put(
            `${API}/attendance/attendance/session/${sessionId}/manual`,
            { studentId: info.student, status: "present" },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setStudents((prev) =>
            prev.map((s) =>
              s._id === info.student ? { ...s, status: "present" } : s
            )
          );
        } else {
          setError(`⚠️ Unknown RFID tag: ${rawTag}`);
          setTimeout(() => setError(""), 4000);
        }
      } catch {
        console.warn("⚠️ Failed to process RFID scan");
      }
    };

    const handleInput = (e) => {
      buffer += e.target.value || "";
      e.target.value = "";
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (buffer.trim()) flushScan(buffer.replace(/[\r\n]+/g, "").trim());
        buffer = "";
      }, 150);
    };

    dummy.addEventListener("input", handleInput);
    document.addEventListener("click", focusInput);
    focusInput();

    return () => {
      dummy.removeEventListener("input", handleInput);
      document.removeEventListener("click", focusInput);
      clearTimeout(debounceTimer);
    };
  }, [sessionId, token, elapsed, attendanceCutoff]);

  // ✅ Manual attendance setup
  useEffect(() => {
    const studentsList = Object.values(RFID_MAP).map((s) => ({
      _id: s.student,
      name: s.name,
      studentId: s.studentId,
      status: "absent",
    }));
    setStudents(studentsList);
  }, []);

  const toggleAttendance = async (studentId, currentStatus) => {
    try {
      setSaving(true);
      const newStatus = currentStatus === "present" ? "absent" : "present";
      await axios.put(
        `${API}/attendance/attendance/session/${sessionId}/manual`,
        { studentId, status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStudents((prev) =>
        prev.map((s) =>
          s._id === studentId ? { ...s, status: newStatus } : s
        )
      );
    } catch {
      setError("Could not update attendance.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6 sticky top-0 bg-white z-10 pb-2 border-b">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Video className="text-blue-600" /> Live Monitoring
          </h2>
          {sessionInfo && (
            <>
              <p className="text-gray-700 mt-1">
                {sessionInfo.course?.code} — <b>{sessionInfo.course?.name}</b>{" "}
                <span className="text-gray-500">
                  ({sessionInfo.section?.name})
                </span>
              </p>
              <p className="text-sm text-gray-500 mt-1 flex items-center">
                <Clock className="inline w-4 h-4 mr-1" />
                <b>{formatTime(elapsed)}</b> elapsed
              </p>

              {attendanceCutoff && (
                <p
                  className={`text-sm mt-1 font-medium ${
                    cutoffRemaining > 0
                      ? "text-green-700"
                      : "text-red-600"
                  }`}
                >
                  {cutoffRemaining > 0
                    ? `Attendance window closes in ${formatTime(cutoffRemaining)}`
                    : "Attendance window closed"}
                </p>
              )}

              {sessionInfo.ended && (
                <p className="text-red-600 text-sm mt-1 font-medium">
                  Session ended — manual editing still available
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          {/* Cutoff input */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Cutoff (mins):</label>
            <input
              type="number"
              value={attendanceCutoff ?? ""}
              onChange={(e) =>
                setAttendanceCutoff(
                  e.target.value === "" ? null : parseInt(e.target.value)
                )
              }
              min="0"
              className="border rounded px-2 py-1 w-20 text-sm"
              placeholder="None"
            />
          </div>

          {!detecting ? (
            <button
              onClick={startDetection}
              className="px-5 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700"
            >
              Start Detection
            </button>
          ) : (
            <button
              onClick={stopDetection}
              className="px-5 py-2 bg-yellow-500 text-white rounded shadow hover:bg-yellow-600"
            >
              Stop Detection
            </button>
          )}

          <button
            onClick={() => setManualOpen(true)}
            className="px-5 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
          >
            Manual Attendance
          </button>

          <button
  onClick={handleEndSession}
  disabled={ending}
  className={`px-5 py-2 rounded shadow text-white ${
    endedOnce
      ? "bg-blue-600 hover:bg-blue-700"
      : "bg-red-600 hover:bg-red-700"
  } disabled:opacity-50`}
>
  {ending
    ? "Ending…"
    : endedOnce
    ? "Go to Dashboard"
    : "End Session"}
</button>


        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded border border-red-200">
          <AlertTriangle className="inline mr-2" />
          {error}
        </div>
      )}

      {/* CAMERA + RFID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CAMERA */}
        <div className="bg-white rounded-lg shadow p-4 col-span-2">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Video className="text-blue-600" /> Camera Preview
          </h3>
          <div className="relative w-full h-[500px]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute top-0 left-0 w-full h-full object-cover rounded-lg shadow"
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Live camera feed used for monitoring and detection.
          </p>
        </div>

        {/* RFID */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Rss className="text-blue-600" /> RFID Scans
          </h3>
          <div className="bg-blue-50 p-3 rounded mb-4">
            <p className="text-sm text-gray-600">Latest scan:</p>
            <p className="text-lg font-semibold text-gray-900">{latestScan}</p>
          </div>
          <div className="h-[350px] overflow-y-auto border rounded p-2 bg-gray-50">
            {scanHistory.length === 0 ? (
              <p className="text-gray-500 text-sm">No scans yet…</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {scanHistory.map((scan, idx) => (
                  <li key={idx} className="border-b pb-1">
                    <span className="font-medium">{scan.display}</span>
                    <br />
                    <span className="text-gray-500 text-xs">
                      {new Date(scan.timestamp).toLocaleString()} —{" "}
                      {scan.elapsedMinutes} mins
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <input
            ref={dummyInputRef}
            className="absolute opacity-0 pointer-events-none"
            autoFocus
          />
        </div>
      </div>

      {/* DETECTION LOGS */}
      <div className="mt-6 bg-white rounded-lg shadow p-4 h-[550px] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <CheckCircle className="text-green-600" /> Detection Logs
        </h3>
        {logs.length === 0 ? (
          <p className="text-gray-500">No logs yet…</p>
        ) : (
          <ul className="space-y-5">
            {logs.map((log) => (
              <li
                key={log._id}
                className={`p-4 rounded-lg border text-sm ${
                  log.cheating
                    ? "bg-red-50 border-red-300"
                    : "bg-green-50 border-green-300"
                }`}
              >
                <p className="font-medium mb-1">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </p>
                {log.facesDetected !== undefined && (
                  <p className="text-gray-700">
                    Faces detected: {log.facesDetected}
                  </p>
                )}
                {log.image && (
                  <img
                    src={log.image}
                    alt="snapshot"
                    className="w-full max-w-md rounded border mt-3"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* MANUAL ATTENDANCE MODAL */}
      {manualOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative">
            <button
              onClick={() => setManualOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
            <h3 className="text-xl font-semibold mb-4">Manual Attendance</h3>

            {students.length === 0 ? (
              <p className="text-gray-500">No students found in this section.</p>
            ) : (
              <ul className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
                {students.map((stu) => (
                  <li
                    key={stu._id}
                    className="flex justify-between items-center py-3"
                  >
                    <div>
                      <p className="font-medium">{stu.name}</p>
                      <p className="text-sm text-gray-500">{stu.studentId}</p>
                    </div>
                    <button
                      disabled={saving}
                      onClick={() =>
                        toggleAttendance(stu._id, stu.status || "absent")
                      }
                      className={`px-3 py-1 rounded text-white text-sm ${
                        stu.status === "present"
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-gray-400 hover:bg-gray-500"
                      }`}
                    >
                      {stu.status === "present" ? "Present" : "Absent"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
