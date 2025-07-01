import json


def build_response(ret_data: dict = {}, ret_code: int = 0, error_message: str = "") -> str:
    return json.dumps({
        "code": ret_code,
        "error": error_message,
        "data": ret_data,
    })


def build_error_response(ret_code: int = -1, error_message: str = "") -> str:
    return build_response(ret_code=ret_code, error_message=error_message)


INVALID_PARAMETER_RESPONSE = build_error_response(
    error_message="Invalid parameter.")

FILE_NOT_FOUND_RESPONSE = build_error_response(
    error_message="File not found.")
