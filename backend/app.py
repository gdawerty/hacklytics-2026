from flask import Flask, jsonify
from flask_cors import CORS
import random
import time

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/signal', methods=['GET'])
def get_signal():
    """
    Returns a signal with success status
    """
    # Simulate some processing
    time.sleep(0.1)
    
    # Randomly determine success (80% success rate for demo)
    is_successful = random.random() > 0.2
    
    signal_data = {
        'signal': random.randint(1, 100),
        'success': is_successful,
        'message': 'Signal received successfully' if is_successful else 'Signal processing failed',
        'timestamp': time.time()
    }
    
    status_code = 200 if is_successful else 500
    return jsonify(signal_data), status_code

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5001, host='0.0.0.0')
