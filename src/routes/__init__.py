from flask import Blueprint

from routes import file_upload, frontend, analyze

api_bp = Blueprint('api', __name__, url_prefix="/api")
root_bp = Blueprint("root", __name__, url_prefix="/")


api_bp.register_blueprint(file_upload.api_bp)
root_bp.register_blueprint(file_upload.root_bp)

root_bp.register_blueprint(frontend.frontend_bp)

api_bp.register_blueprint(analyze.analyze_bp)
