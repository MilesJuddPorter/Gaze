"""Read/write helpers for .gaze/config.json."""

import json
from pathlib import Path
from typing import Optional


GAZE_DIR = ".gaze"
CONFIG_FILE = "config.json"
DB_FILE = "gaze.db"


def get_gaze_dir(cwd: Optional[str] = None) -> Path:
    base = Path(cwd) if cwd else Path.cwd()
    return base / GAZE_DIR


def get_config_path(cwd: Optional[str] = None) -> Path:
    return get_gaze_dir(cwd) / CONFIG_FILE


def get_db_path(cwd: Optional[str] = None) -> Path:
    return get_gaze_dir(cwd) / DB_FILE


def get_port_path(cwd: Optional[str] = None) -> Path:
    return get_gaze_dir(cwd) / "port"


def is_initialized(cwd: Optional[str] = None) -> bool:
    return get_config_path(cwd).exists()


def read_config(cwd: Optional[str] = None) -> dict:
    path = get_config_path(cwd)
    with open(path) as f:
        return json.load(f)


def write_config(config: dict, cwd: Optional[str] = None) -> None:
    gaze_dir = get_gaze_dir(cwd)
    gaze_dir.mkdir(parents=True, exist_ok=True)
    path = get_config_path(cwd)
    with open(path, "w") as f:
        json.dump(config, f, indent=2)


def write_port(port: int, cwd: Optional[str] = None) -> None:
    gaze_dir = get_gaze_dir(cwd)
    if gaze_dir.exists():
        with open(get_port_path(cwd), "w") as f:
            f.write(str(port))
