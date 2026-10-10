"""
Model Export Script for Sub-150ms High-Throughput Turnstile Inference
Exports fine-tuned PyTorch YOLO checkpoints (.pt) to ONNX and TensorRT.
"""

import os
import argparse
from ultralytics import YOLO

def export_ppe_model(weights_path: str, format_type: str = "onnx", imgsz: int = 640):
    if not os.path.exists(weights_path):
        print(f"[ERROR] Checkpoint not found at {weights_path}")
        return

    print(f"[ML-EXPORT] Loading model from {weights_path}...")
    model = YOLO(weights_path)
    
    print(f"[ML-EXPORT] Exporting to format [{format_type.upper()}] with input size {imgsz}x{imgsz}...")
    path = model.export(
        format=format_type,
        imgsz=imgsz,
        dynamic=True,
        simplify=True,
        half=True # FP16 quantization for low-latency GPU edge inference
    )
    print(f"[ML-EXPORT-SUCCESS] Optimized inference model saved at: {path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--weights", type=str, default="C:/Attendance System/models/yolov8n_ppe.pt")
    parser.add_argument("--format", type=str, default="onnx", choices=["onnx", "engine", "openvino"])
    args = parser.parse_args()

    export_ppe_model(args.weights, args.format)
