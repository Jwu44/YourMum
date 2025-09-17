import sys
import os
from flask import Flask
from flask_cors import CORS
from backend.apis.routes import api_bp, auth_bp
from backend.apis.calendar_routes import calendar_bp
from backend.apis.slack_routes import slack_bp
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
            "message": "API is running"
        }), 200

    # Single CORS configuration for all routes
    CORS(app, resources={
        r"/*": {
            "origins": os.getenv("CORS_ALLOWED_ORIGINS", "https://yourmum.app,https://yourmum-production.up.railway.app,http://localhost:3000,http://localhost:8000").split(","),
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "X-CSRFToken"],
            "supports_credentials": True,
            "expose_headers": ["Content-Type", "X-CSRFToken"]
        }
    })
    
    # init firebase app
    try:
        # Try to delete any existing Firebase apps
        # Create a list copy to avoid "dictionary changed size during iteration" error
        existing_apps = list(firebase_admin._apps.values())
        for firebase_app in existing_apps:
            firebase_admin.delete_app(firebase_app)
        print("Cleared existing Firebase apps")
        
        # Then initialize
        initialize_firebase()
        print("Firebase initialized successfully")
    except Exception as e:
        print(f"Firebase initialization error: {str(e)}")
        print("Continuing without Firebase - calendar features will be disabled")
                         
    # Register blueprints
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(calendar_bp, url_prefix="/api/calendar")
    app.register_blueprint(slack_bp, url_prefix="/api/integrations/slack")
    
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
    # Get port from environment variable with better error handling
    try:
        port = int(os.getenv('PORT', 8000))
    except (ValueError, TypeError):
        print(f"Invalid PORT environment variable: {os.getenv('PORT')}")
        port = 8000  # fallback to default port
    
    print(f"Starting application on port {port}")
    print(f"Environment: {os.getenv('FLASK_ENV', 'not_set')}")
    print(f"NODE_ENV: {os.getenv('NODE_ENV', 'not_set')}")
    print(f"PORT env var: {os.getenv('PORT', 'not_set')}")
    
    # Add debug logging for authentication
    print(f"Development bypass active: {os.getenv('NODE_ENV') == 'development'}")
    
    # Set development flag based on environment variables
    is_development = os.getenv('NODE_ENV') == 'development' or os.getenv('FLASK_ENV') == 'development'
    
    # Railway provides PORT environment variable
    application.run(
        host="0.0.0.0",
        port=port,
        debug=is_development  # Enable debug mode in development
    )