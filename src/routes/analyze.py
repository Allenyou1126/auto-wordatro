import json
from flask import Blueprint, request

from analyze import analyze
from utils import response
from utils.logger import get_logger
from word import QAT_DICTIONARIES, get_words


analyze_bp = Blueprint("analyze", __name__)

logger = get_logger(__name__)


@analyze_bp.get("/dictionaries")
def get_dictionaries():
    return response.build_response({"dictionaries": QAT_DICTIONARIES})


@analyze_bp.post("/analyze")
def analyze_file():
    try:
        json_str = request.get_data(as_text=True)
        json_obj = json.loads(json_str)
    except:
        logger.debug(f"Failed to parse JSON.")
        return response.INVALID_PARAMETER_RESPONSE

    dictionary = json_obj.get("dictionary", "YAWL")
    if dictionary not in QAT_DICTIONARIES:
        logger.debug(
            f"Invalid dictionary: {dictionary}. Supported dictionaries: {QAT_DICTIONARIES}")
        return response.INVALID_PARAMETER_RESPONSE

    filename = json_obj.get("filename")
    if not filename:
        logger.debug(f"Filename not found in JSON.")
        return response.INVALID_PARAMETER_RESPONSE

    analyze_result = analyze(filename)

    if not analyze_result:
        logger.debug(f"Analysis failed for file: {filename}")
        return response.FILE_NOT_FOUND_RESPONSE

    words_result = get_words(analyze_result, dictionary=dictionary)

    return response.build_response({"original_image": filename, "debug_info": analyze_result, "words": words_result})
