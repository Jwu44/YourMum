import sys
import os
from flask import Flask
from flask_cors import CORS
from backend.apis.routes import api_bp
from backend.apis.calendar_routes import calendar_bp
from backend.db_config import initialize_db
from werkzeug.middleware.proxy_fix import ProxyFix
from flask import jsonify

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

    # Configure CORS for production
    CORS(app, resources={
        r"/*": {
            "origins": [
                "https://yourd-7vd5a8r5m-jwu44s-projects.vercel.app/",
                os.getenv('ALLOWED_ORIGIN', 'http://localhost:3000'),  # Vercel frontend URL
                "http://localhost:3000"  # Local development
            ],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Range", "X-Total-Count"]
        }
    })
    
    # Trust proxy headers from AWS ELB
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
    
    # Register blueprints
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(calendar_bp, url_prefix='/api/calendar')
    
    try:
        # Initialize database connection only once
        with app.app_context():
            initialize_db()
            app.logger.info('Database initialized successfully')
    except Exception as e:
        app.logger.error(f'Failed to initialize database: {str(e)}')
        raise
    
    return app

# Create app instance
application = create_app()  # Renamed to 'application' for AWS EB

if __name__ == '__main__':
    # Get port from environment variable with fallback
    port = int(os.getenv('PORT', 8000))
    
    # In development, use debug mode and localhost
    if os.getenv('FLASK_ENV') == 'development':
        application.run(
            host="localhost",
            port=port,
            debug=True
        )
    else:
        # In production, bind to all interfaces
        application.run(
            host="0.0.0.0",  # Bind to all interfaces for AWS
            port=port,
            debug=False
        )