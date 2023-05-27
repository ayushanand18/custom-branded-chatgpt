"""
API for backend to Custom Branded ChatGPT
"""
import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
import firebase_admin
from firebase_admin import auth as Auth
from firebase_admin import credentials

app = Flask(__name__)
load_dotenv()

#--------------------
# Environment
#--------------------
PASS_KEY = os.getenv('FLASK_APP_FIREBASE_HASHED_KEY')
GPT_API_KEY = os.getenv('FLASK_APP_OPEN_AI_KEY')

#--------------------
# Firebase Setup
#--------------------
cred = credentials.Certificate("serviceAccountKey.json")
db_app = firebase_admin.initialize_app(cred)

#--------------------
# Application routes
#--------------------

# as a security measure we will not define a home ('/') root
# so as to make people believe that this endpoint is not functional

@app.route("/get_gpt_response")
def get_gpt_response():
    "GPT4 response generation"
    return ""

@app.route("/setup_new_account")
def setup_new_account():
    """
    Generate Password Reset Links with email

    :param email: [string] email fo the account to reset
    :return: [string] link to reset password

    ::Usage
        /setup_new_account?email=*
    """
    email = request.args.get('email')
    pass_key = request.args.get('key')
    link = ""
    try:
        if pass_key!=PASS_KEY:
            raise IncorrectKey

        link = Auth.generate_password_reset_link(email, action_code_settings=None, app=db_app)
        return jsonify({
            "result": link,
            "status": "success",
        })
    except BaseException as error:
        return jsonify({
            "result": str(error),
            "status": "error",
        })

#----------------------
# Custom Exception
#----------------------
class IncorrectKey(Exception):
    "Raised when passed key is incorrect."
    def __init__(self, message="invalid passkey supplied", *args):
        super().__init__(message, *args)
        self.message = message

if __name__ == '__main__':
    app.run()
