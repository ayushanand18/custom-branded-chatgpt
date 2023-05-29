"""
API for backend to Custom Branded ChatGPT
"""
import os
import pickle
from dotenv import load_dotenv
import flask
from flask import Flask, request, jsonify
from flask_cors import cross_origin, CORS
import firebase_admin
from firebase_admin import auth as Auth
from firebase_admin import credentials
import openai
import random
import string

load_dotenv()
app = Flask(__name__)
CORS(app)
#--------------------
# Environment
#--------------------
PASS_KEY = os.getenv('FLASK_APP_FIREBASE_HASHED_KEY')
openai.api_key = os.getenv('FLASK_APP_OPEN_AI_KEY')
openai.organization = os.getenv('FLASK_APP_OPEN_AI_ORG')

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
@cross_origin()
def get_gpt_response():
    """
    GPT4 response generation

    :param message_id: [string] message id/conversation id
    :param context: [string] earlier chatgpt response
    :param user: [string] user prompt

    :return: [JSON] object with response from OpenAI GPT4 API

    ::Usage
        /get_gpt_response?context=Intel Corporation is an American multinational corporation and technology company headquartered in Santa Clara, California. It is one of the world's largest semiconductor chip manufacturer by revenue, and is one of the developers of the x86 series of instruction sets found in most personal computers&user=what is intel?
    """
    context = request.args.get('context')
    user = request.args.get('user')

    request_data = [
        {"role": "system", "content": "You are a powerful AI chatbot that can answer this question. " + context},
        {"role": "user", "content": user},
    ]

    try:    
        # response = openai.ChatCompletion.create(
        #     model="gpt-4",
        #     messages= request_data,
        # )
        list_resp = ["Intel", " Corporation", " is an American", " multinational", " corporation", " and", " technology", " company", "."]
        def stream():
            k = 0
            while k<len(list_resp):
                yield '%s\n\n' % ('"delta": {"content": "'+str(list_resp[k])+'"},"finish_reason": null,"index": 0}"')
                k+=1
            yield '%s\n\n' % '"delta": {},"finish_reason": "stop","index": 0}"'
            # uncomment for using live chat gpt api
            # completion = openai.ChatCompletion.create(
            #     model="gpt-4",
            #     messages=request_data,
            #     stream=True
            # )
            # for line in completion:
            #     yield 'data: %s\n\n' % str(line.choices[0])
        response = flask.Response(stream(), mimetype='application/json')
        response.headers.add('Access-Control-Allow-Origin', 'https://ayushanand18-cuddly-acorn-j47p4r4w64p2j5qg-3000.preview.app.github.dev/')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    except BaseException as error:
        return jsonify({
            "error": str(error),
            "status": "error",
        })

@app.route("/setup_new_account")
def setup_new_account():
    """
    Generate Password Reset Links with email

    :param email: [string] email for the account to reset
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

@app.route("/create_new_account")
def create_new_account():
    """
    Create Account with email and password for new account

    :param email: [string] email for the account to reset
    :return: [string] link to reset password

    ::Usage
        /create_new_account?email=*&name=*&phone=*
    """
    email = request.args.get('email')
    phone = request.args.get('phone')
    name = request.args.get('name')
    pass_key = request.args.get('key')
    try:
        if pass_key!=PASS_KEY:
            raise IncorrectKey

        user = Auth.create_user(
            email='user@example.com',
            email_verified=False,
            phone_number="+"+phone,
            password=get_random_string(14),
            display_name=name,
            disabled=False
        )
        return jsonify({
            "result": f"created account for {email}",
            "status": "success",
        })
    except BaseException as error:
        return jsonify({
            "result": str(error),
            "status": "error",
        })

#----------------------
# Util Function
#----------------------
def get_random_string(length):
    # choose from all lowercase letter
    letters = string.ascii_lowercase
    result_str = ''.join(random.choice(letters) for i in range(length))
    return result_str

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
