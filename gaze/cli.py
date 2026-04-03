"""Click CLI entry point for gaze."""

import os
import shutil
import socket
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path

import click
import uvicorn

from .config import get_gaze_dir, is_initialized, write_port
from .server import create_app


PACKAGE_DIR = Path(__file__).parent
FRONTEND_DIR = PACKAGE_DIR.parent / "frontend"


def _find_free_port(preferred: int = 7777) -> int:
    """Try preferred port, fall back to OS-assigned random port."""
    for port in [preferred]:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("", port))
                return port
            except OSError:
                pass
    # Fall back to random available port
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        return s.getsockname()[1]


def _build_frontend(frontend_dir: Path, backend_port: int) -> bool:
    """Run npm install + npm run build. Returns True on success."""
    npm = shutil.which("npm")
    if not npm:
        click.echo("  npm not found — skipping frontend build.", err=True)
        return False

    click.echo("Building frontend (first run)...")
    env = {**os.environ, "VITE_BACKEND_PORT": str(backend_port)}
    try:
        subprocess.run([npm, "install"], cwd=str(frontend_dir), check=True,
                       capture_output=True, env=env)
        subprocess.run([npm, "run", "build"], cwd=str(frontend_dir), check=True,
                       capture_output=True, env=env)
        click.echo("Frontend built successfully.")
        return True
    except subprocess.CalledProcessError as e:
        click.echo(f"  Frontend build failed: {e}", err=True)
        return False


def _open_browser_delayed(url: str, delay: float = 1.5):
    def _open():
        time.sleep(delay)
        webbrowser.open(url)
    threading.Thread(target=_open, daemon=True).start()


@click.group(invoke_without_command=True)
@click.option("--port", default=None, type=int, help="Backend port (default: 7777)")
@click.option("--reset", is_flag=True, help="Wipe .gaze/ and start fresh")
@click.pass_context
def main(ctx, port: int, reset: bool):
    """Gaze — AI agent workspace for your repo.

    Run inside any project directory. On first launch a config panel
    opens in your browser so you can define your agents.
    """
    if ctx.invoked_subcommand is not None:
        return

    cwd = os.getcwd()
    gaze_dir = get_gaze_dir(cwd)

    if reset:
        if gaze_dir.exists():
            shutil.rmtree(gaze_dir)
            click.echo(f"Wiped {gaze_dir}")
        else:
            click.echo("No .gaze/ directory found — nothing to reset.")

    actual_port = _find_free_port(port or 7777)

    # Write port file if .gaze/ exists
    write_port(actual_port, cwd)

    # Build frontend if dist not present
    frontend_dist = FRONTEND_DIR / "dist"
    if FRONTEND_DIR.exists() and not frontend_dist.exists():
        _build_frontend(FRONTEND_DIR, actual_port)

    app = create_app(cwd)

    url = f"http://localhost:{actual_port}"
    click.echo(f"Gaze running at {url}")
    click.echo("Press Ctrl+C to stop.")

    _open_browser_delayed(url)

    try:
        uvicorn.run(app, host="0.0.0.0", port=actual_port, log_level="warning")
    except KeyboardInterrupt:
        pass


@main.command()
def init():
    """Create .gaze/ in the current directory without launching."""
    cwd = os.getcwd()
    gaze_dir = get_gaze_dir(cwd)
    if gaze_dir.exists():
        click.echo(f".gaze/ already exists at {gaze_dir}")
    else:
        gaze_dir.mkdir(parents=True)
        click.echo(f"Created {gaze_dir}")
        click.echo("Run 'gaze' to launch the workspace.")
