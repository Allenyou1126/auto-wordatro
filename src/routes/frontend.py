from flask import Blueprint, send_from_directory

from utils.path import FRONTEND_DIR


frontend_bp = Blueprint("frontend", __name__)


@frontend_bp.route("/")
def frontend():
    return send_from_directory(FRONTEND_DIR, "index.html")


@frontend_bp.get("/favicon.ico")
def favicon():
    return send_from_directory(FRONTEND_DIR, "favicon.ico")
