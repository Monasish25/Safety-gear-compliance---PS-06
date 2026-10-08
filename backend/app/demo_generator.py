import os
import cv2
import numpy as np
import math
from pathlib import Path
from app.core.config import settings

def generate_demo_video(output_path: str, duration_sec: int = 18, fps: int = 25):
    """
    Synthesizes a realistic factory simulation video for hackathon demo testing:
    - Left half: Assembly Zone (Worker 1 compliant with yellow hardhat + hi-vis vest)
    - Right half: Welding Zone (Worker 2 without hardhat)
    - Chemical Storage: Hazard zone where smoke and flame emerge at second 10-15
    """
    width = 1280
    height = 720
    total_frames = duration_sec * fps

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    if not writer.isOpened():
        fourcc = cv2.VideoWriter_fourcc(*"avc1")
        writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    # Base background (Dark industrial warehouse floor)
    bg = np.zeros((height, width, 3), dtype=np.uint8)
    bg[:] = (35, 38, 42)  # Dark slate concrete floor

    # Floor grid / warning stripe lines
    for x in range(0, width, 120):
        cv2.line(bg, (x, 0), (x, height), (48, 52, 58), 1)
    for y in range(0, height, 100):
        cv2.line(bg, (0, y), (width, y), (48, 52, 58), 1)

    # Floor zones delineation
    cv2.rectangle(bg, (40, 60), (600, 680), (30, 70, 30), 2)  # Assembly
    cv2.putText(bg, "ASSEMBLY ZONE [MEDIUM RISK]", (60, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (50, 180, 50), 2)

    cv2.rectangle(bg, (620, 60), (1240, 680), (30, 50, 80), 2)  # Welding
    cv2.putText(bg, "WELDING ZONE [HIGH RISK]", (640, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (50, 140, 240), 2)

    # Workstation / machinery props
    cv2.rectangle(bg, (100, 480), (300, 620), (55, 60, 70), -1)
    cv2.putText(bg, "Conveyor A-1", (120, 540), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1)

    cv2.rectangle(bg, (800, 460), (1050, 620), (55, 60, 70), -1)
    cv2.putText(bg, "Welding Bench W-4", (820, 540), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1)

    for f in range(total_frames):
        current_time = f / fps
        frame = bg.copy()

        # Worker 1: In Assembly Zone (compliant)
        # Position oscillates gently as they work
        w1_x = int(240 + 40 * math.sin(current_time * 0.8))
        w1_y = 280
        w1_w = 80
        w1_h = 220

        # Draw Person 1 Body
        # Torso (Wearing bright neon vest: HSV yellow/green)
        cv2.rectangle(frame, (w1_x - 30, w1_y + 40), (w1_x + 30, w1_y + 140), (0, 230, 230), -1)  # Hi-vis vest
        cv2.line(frame, (w1_x - 10, w1_y + 40), (w1_x - 10, w1_y + 140), (220, 220, 220), 4)      # Reflective stripe
        cv2.line(frame, (w1_x + 10, w1_y + 40), (w1_x + 10, w1_y + 140), (220, 220, 220), 4)

        # Head with bright yellow hardhat
        cv2.circle(frame, (w1_x, w1_y + 20), 22, (200, 180, 160), -1)   # Face
        cv2.ellipse(frame, (w1_x, w1_y + 10), (24, 18), 0, 180, 360, (0, 215, 255), -1)  # Yellow helmet
        cv2.rectangle(frame, (w1_x - 26, w1_y + 8), (w1_x + 26, w1_y + 15), (0, 215, 255), -1)  # Helmet brim

        # Legs
        cv2.rectangle(frame, (w1_x - 25, w1_y + 140), (w1_x - 8, w1_y + 220), (90, 70, 50), -1)
        cv2.rectangle(frame, (w1_x + 8, w1_y + 140), (w1_x + 25, w1_y + 220), (90, 70, 50), -1)

        # Worker 2: In Welding Zone (MISSING HELMET violation)
        # Walks in from right edge and stops at welding bench
        w2_x = int(max(920, 1180 - (current_time * 50)))
        w2_y = 260

        # Torso (wearing dark navy work shirt, no hi-vis vest after sec 5 or just regular blue)
        cv2.rectangle(frame, (w2_x - 30, w2_y + 40), (w2_x + 30, w2_y + 140), (100, 60, 40), -1)

        # Head: Bare head with brown hair (NO HELMET)
        cv2.circle(frame, (w2_x, w2_y + 20), 22, (180, 160, 150), -1)
        # Hair (Dark brown)
        cv2.ellipse(frame, (w2_x, w2_y + 12), (22, 14), 0, 180, 360, (30, 40, 50), -1)

        # Legs
        cv2.rectangle(frame, (w2_x - 25, w2_y + 140), (w2_x - 8, w2_y + 220), (50, 50, 60), -1)
        cv2.rectangle(frame, (w2_x + 8, w2_y + 140), (w2_x + 25, w2_y + 220), (50, 50, 60), -1)

        # Smoke simulation starting at 8 seconds near workstation
        if current_time >= 8.0:
            smoke_growth = min(1.0, (current_time - 8.0) / 4.0)
            smoke_rad = int(30 + 80 * smoke_growth)
            sx = int(820 + 10 * math.sin(current_time * 3))
            sy = int(460 - (current_time - 8.0) * 8)
            overlay = frame.copy()
            cv2.circle(overlay, (sx, sy), smoke_rad, (150, 150, 150), -1)
            cv2.circle(overlay, (sx + 25, sy - 20), int(smoke_rad * 0.7), (160, 160, 160), -1)
            cv2.circle(overlay, (sx - 20, sy - 30), int(smoke_rad * 0.8), (140, 140, 140), -1)
            alpha = min(0.65, smoke_growth * 0.7)
            cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)

        # Fire simulation starting at 12 seconds
        if current_time >= 12.0:
            fx = 830
            fy = 480
            flame_h = int(40 + 20 * math.sin(current_time * 12))
            pts_flame = np.array([
                [fx - 25, fy],
                [fx + 25, fy],
                [fx + 10, fy - flame_h + 10],
                [fx, fy - flame_h],
                [fx - 15, fy - flame_h + 15]
            ], np.int32)
            cv2.fillPoly(frame, [pts_flame], (0, 140, 255))  # Orange flame
            cv2.circle(frame, (fx, fy - 15), 18, (0, 220, 255), -1)  # Yellow hot core

        # Timestamp overlay
        cv2.putText(frame, f"CAM_01 LIVE | T+{current_time:.1f}s | FPS: {fps}", (40, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 200), 2)

        writer.write(frame)

    writer.release()
    print(f"Demo video successfully generated at {output_path}")
    return output_path

if __name__ == "__main__":
    out = str(settings.LOCAL_STORAGE_DIR / "videos" / "factory_demo.mp4")
    generate_demo_video(out)
