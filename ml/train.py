"""
Model Fine-Tuning Pipeline for Industrial Factory PPE Detection
Trains Ultralytics YOLO with explicit positive/negative classes and pose association.
"""

import os
import argparse
from pathlib import Path
from ultralytics import YOLO

def train_ppe_model(
    model_variant: str = "yolov8n.pt",
    data_yaml: str = "ml/dataset.yaml",
    epochs: int = 100,
    img_size: int = 640,
    batch_size: int = 16,
    device: str = "0"
):
    print(f"[ML-TRAIN] Starting PPE fine-tuning with base model: {model_variant}")
    print(f"[ML-TRAIN] Dataset: {data_yaml} | Epochs: {epochs} | ImgSz: {img_size}")

    model = YOLO(model_variant)

    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=img_size,
        batch=batch_size,
        device=device,
        patience=20,
        save=True,
        project="ml/runs",
        name="ppe_factory_detector",
        augment=True,
        mosaic=1.0,
        flipud=0.0,
        fliplr=0.5,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4
    )

    print("[ML-TRAIN] Training successfully completed!")
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train PPE YOLO model")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--device", type=str, default="cpu", help="Device (cpu or 0)")
    args = parser.parse_args()

    train_ppe_model(epochs=args.epochs, batch_size=args.batch, device=args.device)
