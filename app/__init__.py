import os
from flask import Flask
from config import Config
from app.database import db
from app.blueprints.pages import pages_bp
from app.blueprints.models_bp import models_bp
from app.blueprints.chat import chat_bp

def create_app():
    """
    Flask Application Factory
    """
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)

    # Register blueprints
    app.register_blueprint(pages_bp)
    app.register_blueprint(models_bp)
    app.register_blueprint(chat_bp)

    # Create database tables inside app context
    with app.app_context():
        db.create_all()

    return app
