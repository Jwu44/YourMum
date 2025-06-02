import sys
import os
from flask import Flask
from flask_cors import CORS
from backend.apis.routes import api_bp
from backend.apis.calendar_routes import calendar_bp
from backend.db_config import initialize_db
from werkzeug.middleware.proxy_fix import ProxyFix
from flask import jsonify
from backend.apis.calendar_routes import initialize_firebase
import firebase_admin

sys.path.append("./backend")

def create_app(testing=False):
    """
    Factory function to create Flask application
    Args:
        testing (bool): Whether the app is being created for testing
    """
    app = Flask(__name__)
    
    @app.route('/')
    def root():
        return jsonify({
            "status": "healthy",
            "message": "yourdai API is running",
            "instance_type": "single_instance"  # Add this for debugging
        }), 200

    # Update CORS for single instance (no load balancer)
    allowed_origins = os.getenv(
        "CORS_ALLOWED_ORIGINS", 
        "https://yourdai.app,https://yourdai.be,https://www.yourdai.app,http://localhost:3000"
    ).split(",")

    # Single CORS configuration for all routes
    CORS(app, resources={
        r"/api/*": {
            "origins": allowed_origins,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
            "supports_credentials": True,
            "expose_headers": ["Content-Type", "X-CSRFToken"]
        }
    })
    
    # Trust proxy headers from AWS ELB
    # app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
    
    # init firebase app
    try:
        # Try to delete any existing Firebase apps
        for firebase_app in firebase_admin._apps.values():
            firebase_admin.delete_app(firebase_app)
        # Then initialize
        initialize_firebase()
        print("Firebase initialized successfully xd")
    except Exception as e:
        print(f"Firebase initialization error: {str(e)}")
                         
    # Register blueprints
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(calendar_bp, url_prefix="/api/calendar")
    
    try:
        # Initialize database connection only once
        with app.app_context():
            initialize_db()
            app.logger.info('Database initialized successfully')
    except Exception as e:
        print(f'Failed to initialize database: {str(e)}')
        raise
    
    return app

# Create app instance
application = create_app()  # Renamed to 'application' for AWS EB

if __name__ == '__main__':
    # Get port from environment variable with fallback
    port = int(os.getenv('PORT', 8000))
    
    # In production (AWS EB), always bind to all interfaces
    application.run(
        host="0.0.0.0",
        port=port,
        debug=os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    )