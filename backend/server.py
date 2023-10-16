import sys
from flask import Flask
from flask_cors import CORS

sys.path.append("./apis")
sys.path.append("./services")

app = Flask(__name__)
CORS(app)

@app.route('/')  # Define a route for the root URL '/'
def hello():
    return "Hi bishes!"

if __name__ == '__main__':
    app.run(host="localhost", port=8000, debug=True)