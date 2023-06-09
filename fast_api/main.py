# main.py

import os
from dotenv import load_dotenv
from fastapi import FastAPI, status, Request
from fastapi.responses import JSONResponse
from starlette.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import auth as Auth
from firebase_admin import credentials
import openai
import random
import string
from time import sleep
import json

load_dotenv()
app = FastAPI()
origins = [
    "http://localhost",
    "http://localhost:8080",
    "https://3000-ayushanand1-custombrand-sscwxw1m6v2.ws-us98.gitpod.io",
    "https://custom-branded-chatgpt.vercel.app/",
    "https://stirring-kataifi-c20d4c.netlify.app/",
    "https://custom-branded-chatgpt.onrender.com/",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

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
@app.get("/test")
async def test():
    return "hello"

RETRY_TIMEOUT = 1000  # milisecond

@app.get("/get_gpt_response")
async def get_gpt_response(context, user, request:Request):
    """
    GPT4 response generation

    :param message_id: [string] message id/conversation id
    :param context: [string] earlier chatgpt response
    :param user: [string] user prompt

    :return: [JSON] object with response from OpenAI GPT4 API

    ::Usage
        /get_gpt_response?context=Intel Corporation is an American multinational corporation and technology company headquartered in Santa Clara, California. It is one of the world's largest semiconductor chip manufacturer by revenue, and is one of the developers of the x86 series of instruction sets found in most personal computers&user=what is intel?
    """

    request_data = [
        {"role": "system", "content": "You are a powerful AI chatbot that can answer this question. " + context},
        {"role": "user", "content": user},
    ]

    try:
        # list_resp = ["Intel", " Corporation", " is an American", " multinational", " corporation", " and", " technology", " company", "."]
        def event_generator():
            completion = openai.ChatCompletion.create(
                model="gpt-4",
                messages=request_data,
                stream=True
            )
            for line in completion:
                if("content" not in line.choices[0].delta.keys()): continue
                yield {"data": f"'{line.choices[0].delta.content}'"}
            # for message in list_resp:
            #     yield {"data": str(message)}
            request.close()
        # return EventSourceResponse(event_generator())
        resp = EventSourceResponse(event_generator())
        resp.headers["Access-Control-Allow-Origin"] = '*'
        return resp
    except BaseException as error:
        return {
            "error": str(error),
            "status": "error",
        }

@app.get("/generate_title")
async def generate_title(context):
    """
    GPT4 title generation

    :param context: [string] earlier chatgpt response

    :return: [JSON] object with response from OpenAI GPT4 API

    ::Usage
        /generate_title?context=instruction sets found in most personal computers
    """
    request_data = [
        {"role": "system", "content": context},
        {"role": "user", "content": "write a very short headline for the above text in the language of the text provided"},
    ]
    try:
        response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=request_data,
            )
        resp = JSONResponse({"data": response.choices[0].message.content})
        resp.headers["Access-Control-Allow-Origin"] = '*'
        return resp
    except BaseException as error:
        return {
            "error": str(error),
            "status": "error",
        }

@app.get("/setup_new_account")
async def setup_new_account(email, key):
    """
    Generate Password Reset Links with email

    :param email: [string] email for the account to reset
    :return: [string] link to reset password

    ::Usage
        /setup_new_account?email=*
    """
    # email = request.args.get('email')
    # pass_key = request.args.get('key')
    link = ""
    try:
        if key!=PASS_KEY:
            raise IncorrectKey

        link = Auth.generate_password_reset_link(email, action_code_settings=None, app=db_app)
        return {
            "result": link,
            "status": "success",
        }
    except BaseException as error:
        return {
            "result": str(error),
            "status": "error",
        }

@app.get("/create_new_account")
async def create_new_account(email, phone, name, key):
    """
    Create Account with email and password for new account

    :param email: [string] email for the account to reset
    :return: [string] link to reset password

    ::Usage
        /create_new_account?email=*&name=*&phone=*
    """
    # email = request.args.get('email')
    # phone = request.args.get('phone')
    # name = request.args.get('name')
    # pass_key = request.args.get('key')
    try:
        if key!=PASS_KEY:
            raise IncorrectKey

        user = Auth.create_user(
            email='user@example.com',
            email_verified=False,
            phone_number="+"+phone,
            password=get_random_string(14),
            display_name=name,
            disabled=False
        )
        return {
            "result": f"created account for {email}",
            "status": "success",
        }
    except BaseException as error:
        return {
            "result": str(error),
            "status": "error",
        }

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
