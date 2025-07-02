import flask_app
import mimetypes

if __name__ == "__main__":
    # Fix
    mimetypes.add_type("application/javascript", ".js", strict=True)
    mimetypes.add_type("application/json", ".json", strict=True)
    flask_app.flask_app.run(host="0.0.0.0", port=5000)
