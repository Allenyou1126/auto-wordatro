import os
from flask import Flask, abort, redirect, send_from_directory
from flask_cors import CORS

import routes
from utils.mime import ALLOWED_FILE_EXT
from utils.path import ASSETS_DIR, FRONTEND_DIR, TEMPLATE_DIR, UPLOAD_DIR


def create_app():
    app = Flask(__name__, static_folder=ASSETS_DIR, static_url_path="/assets")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(TEMPLATE_DIR, exist_ok=True)

    app.config['UPLOAD_FOLDER'] = UPLOAD_DIR
    app.config['ALLOWED_EXTENSIONS'] = ALLOWED_FILE_EXT
    app.config['TEMPLATE_PATH'] = TEMPLATE_DIR

    CORS(app, origins="*", methods=["GET", "POST", "OPTIONS"], )

    app.register_blueprint(routes.api_bp)
    app.register_blueprint(routes.root_bp)

    @app.route("/favicon.ico")
    def favicon():
        try:
            return send_from_directory(FRONTEND_DIR, "favicon.ico")
        except:
            abort(404)

    @app.route("/")
    @app.route("/<path:path>")
    @app.errorhandler(404)
    def default_handler(*args, **kvargs):
        return send_from_directory(FRONTEND_DIR, "index.html")

    return app


flask_app = create_app()
