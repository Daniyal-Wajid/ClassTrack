import { useRef } from "react";
import Webcam from "react-webcam";

export default function CameraCapture({ onCapture }) {
  const webcamRef = useRef(null);

  const capture = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (onCapture) onCapture(imageSrc);
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-2">📷 Live Camera</h2>
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={400}
        videoConstraints={{ facingMode: "user" }}
      />
      <div className="mt-3">
        <button
          onClick={capture}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Capture Image
        </button>
      </div>
    </div>
  );
}
