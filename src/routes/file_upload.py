import os
from flask import Blueprint, request, send_from_directory
from werkzeug.utils import secure_filename
from utils import response
from utils.logger import get_logger
from utils.mime import ALLOWED_FILE_EXT
from utils.path import UPLOAD_DIR


api_bp = Blueprint('file_upload_api', __name__, url_prefix="/upload")
root_bp = Blueprint("file_upload", __name__, url_prefix="/upload")

logger = get_logger(__name__)


@root_bp.get("/<filename>")
def get_file(filename: str):
    if not filename.endswith(ALLOWED_FILE_EXT):
        return response.build_error_response(error_message="Invalid file type")

    logger.info(f"Request for uploaded file: {filename}")

    return send_from_directory(UPLOAD_DIR, filename)


@api_bp.post("/")
def upload_file():
    logger.debug("Uploading file")

    try:
        uploaded_file = request.files['file']
    except:
        logger.debug("Failed to retrieve uploaded file")
        return response.INVALID_PARAMETER_RESPONSE

    if not uploaded_file.filename:
        logger.debug("No filename provided")
        return response.INVALID_PARAMETER_RESPONSE

    logger.info(f"Uploading file: {uploaded_file.filename}")

    filename = secure_filename(uploaded_file.filename)

    if not filename.endswith(ALLOWED_FILE_EXT):
        logger.debug(f"File type is not allowed: {filename}")
        return response.INVALID_PARAMETER_RESPONSE

    filepath = os.path.join(UPLOAD_DIR, filename)
    logger.info(f"Saving file to: {filepath}")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    if os.path.exists(filepath):
        logger.debug(f"File already exists: {filepath}")
        os.remove(filepath)

    with open(filepath, "wb+") as fp:
        uploaded_file.save(fp)

    return response.build_response({"filename": filename})
