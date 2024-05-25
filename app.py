import os
import sys
from flask import Flask
from backend.apis.routes import api_bp

sys.path.append("./backend")

app = Flask(__name__)
app.register_blueprint(api_bp, url_prefix='/api')

@app.route('/')  # Define a route for the root URL '/'
def hello():
    return "Hello world!"

if __name__ == '__main__':
    app.run(host="localhost", port=8000, debug=True)
